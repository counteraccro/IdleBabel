import * as THREE from 'three';
import { createPageGlow, type PageGlow } from './pageGlow';
import { createHeadbandGeometry, HEADBAND_LENGTH, HEADBAND_RADIUS } from './headband';
import { createRibbon, RIBBON_INSIDE, RIBBON_TAIL, RIBBON_WIDTH, type RibbonPoint } from './ribbon';
import { boardGeometry } from './boardGeometry';
import { JOINT, createBinding, type Point } from './binding';
import { ARCH, pageProfile, stackGeometry } from './pageStack';

/** Dimensions d'un livre, en unités de scène (hauteur 1). */
export interface BookShape {
  width: number;
  height: number;
  /** Épaisseur totale, plats compris. */
  thickness: number;
  /** Épaisseur d'un plat. */
  board: number;
  /** Débord des plats sur les feuilles (en haut, en bas, côté tranche). */
  overhang: number;
  /** Arrondi des coins côté tranche. */
  corner: number;
  /**
   * Hauteur du bombement des pages ouvertes, en part de l'épaisseur qui le porte (ARCH par défaut). Plus
   * fort pour un livre mince vu de biais (le livre en main) : sinon, le haut des pages paraît droit.
   */
  arch?: number;
  /**
   * Inclinaison de chaque moitié ouverte, dos au plus bas (SAG par défaut), et relevé des plats en arc
   * jusqu'à la tranche (CURL par défaut). Tenu en main, le livre se creuse : au milieu, le bord de la
   * couverture plonge derrière les pages.
   */
  sag?: number;
  curl?: number;
}

export interface BookLook {
  cover: THREE.Texture;
  back: THREE.Texture;
  /** Contre-plats : l'intérieur des deux plats (sans l'hexagone de la couverture). */
  inside: THREE.Texture;
  /** Peau du dos (sans les ornements de coin, qui s'y écraseraient). */
  spine: THREE.Texture;
  /** Teinte du cuir (dos, chants des plats) : elle assombrit la peau de la couverture. */
  leather: THREE.ColorRepresentation;
  edge: THREE.Texture;
  paper: THREE.ColorRepresentation;
  /** Fil des tranchefiles (bourrelets en haut et en bas du pli) ; sans : pas de tranchefiles (cahier agrafé). */
  headband?: THREE.Texture;
  /** Couleur du signet (ruban de soie). */
  ribbon?: THREE.ColorRepresentation;
}

export interface BookMesh {
  root: THREE.Group;
  /** Plat de devant, qui pivote sur le dos pour ouvrir le livre (0 : fermé, 1 : ouvert à plat). */
  setOpen: (amount: number) => void;
  /**
   * Plat arrière, qui se referme sur les pages en fin de livre (0 : ouvert à plat, 1 : livre fermé sur son
   * dos, posé à gauche). À utiliser livre ouvert, à la dernière double page.
   */
  setShut: (amount: number) => void;
  /**
   * Avancement dans le livre (0 : début, 1 : fin) : épaisseur des piles de feuilles de chaque côté.
   * `left` : les feuilles déjà posées à gauche, si elles diffèrent (pendant qu'une feuille tourne, celles
   * qui n'ont pas encore atterri ; 0 : aucune, on voit l'intérieur de la couverture). `right` : de même
   * pour les feuilles qui restent à droite (1 : aucune, on voit l'intérieur du plat arrière).
   */
  setProgress: (read: number, left?: number, right?: number) => void;
  /**
   * Page visible sous un point touché par un rayon (clic) : de quel côté, et où dans son image (u de
   * gauche à droite, v de haut en bas, de 0 à 1). null : ce n'est pas une page visible (plat, tranche).
   */
  pageUnder: (hit: THREE.Intersection) => { side: 'left' | 'right'; u: number; v: number } | null;
  /** Contenu des deux pages visibles (null : papier vierge, ou l'intérieur de la couverture à gauche). */
  setPages: (left: THREE.Texture | null, right: THREE.Texture | null) => void;
  /**
   * Signet : glissé à l'avancement `at` (0 : début, 1 : fin ; celui d'une double page), son bout dépasse en
   * bas du livre ; ouvert à cette double page, on le voit posé sur la page de gauche, le long du pli.
   * `spread` : écart d'avancement d'une double page à la suivante. null : pas de signet.
   */
  setRibbon: (at: number | null, spread?: number) => void;
  /** L'objet touché (clic) est-il le signet ? */
  isRibbon: (object: THREE.Object3D) => boolean;
  /**
   * Feuille qui tourne autour du pli : `turn` de 0 (posée à droite) à 1 (posée à gauche), `front` son
   * recto (la page de droite), `back` son verso (la page de gauche d'après). null : pas de feuille.
   * `corner` : prise par un coin (1 : en haut, -1 : en bas), elle part de lui, dans le sens `forward`.
   */
  setLeaf: (turn: number | null, front?: THREE.Texture | null, back?: THREE.Texture | null, corner?: number, forward?: boolean) => void;
  /** Lueur des trouvailles (pageGlow.ts) : une page visible brille-t-elle, et son horloge. */
  glow: PageGlow;
}

/** Épaisseur du cuir du dos (part de l'épaisseur du livre). */
const SPINE_LEATHER = 0.08;
/** Livre ouvert : inclinaison de chaque moitié, tranches relevées, dos au plus bas (radians, BookShape.sag). */
const SAG = 0.025;
/** Livre ouvert : hauteur dont les plats se relèvent en arc jusqu'à la tranche (le dos au plus bas, BookShape.curl). */
const CURL = 0.03;

/** Segments de la feuille qui tourne, le long de sa largeur. */
const LEAF_STEPS = 40;
/**
 * La feuille ne porte d'ombre qu'en se soulevant de la pile de droite : passé ce point, la lampe l'éclaire
 * presque par la tranche et son ombre n'est plus qu'une bande sombre qui balaie la page de droite.
 */
const LEAF_SHADOW_END = 0.4;
/** De même pour les plats (couverture qui s'ouvre, plat arrière qui se referme), passé ce point de leur course. */
const BOARD_SHADOW_END = 0.3;
/** Rangées de la feuille, sur sa hauteur : prise par un coin, chacune tourne à son rythme. */
const LEAF_ROWS = 16;
/**
 * Écart entre la feuille qui tourne et ce qu'elle frôle : une pile de pages, ou, sans pile (première ou
 * dernière feuille), l'intérieur d'un plat. Plus grand sur un plat : si près, la carte graphique ne sait
 * plus lequel est devant et les deux surfaces clignotent l'une à travers l'autre.
 */
const LEAF_GAP = 0.0008;
const LEAF_BOARD_GAP = 0.003;
/** Avance du coin saisi sur le bord opposé, en part du tour (au plus fort, à mi-course). */
const CORNER_LEAD = 0.2;
/**
 * Écart d'épaisseur (part de la demi-épaisseur du bloc) à partir duquel les piles sont reconstruites : en
 * dessous, une fraction de pixel. Environ deux feuilles pour un livre de 410 pages.
 */
const STACK_STEP = 0.01;

/**
 * Un livre relié fermé, en 3D : deux plats épais aux coins arrondis, le bloc des feuilles (plus
 * petit : les plats débordent) cousu à une coque de cuir bombée, le dos. Le dos est à x = 0, la
 * tranche vers +x ; le dessus de la couverture regarde +z.
 */
export const createBookMesh = (shape: BookShape, look: BookLook): BookMesh => {
  const root = new THREE.Group();
  const { height, thickness, board } = shape;
  // Le cuir (dos, chants des plats) : la même peau que la couverture, un peu plus sombre. Visible des
  // deux côtés : la coque du dos reste pleine sous tous les angles.
  const leather = new THREE.MeshStandardMaterial({ map: look.cover, color: look.leather, roughness: 0.65, side: THREE.DoubleSide });
  const coverMaterial = new THREE.MeshStandardMaterial({ map: look.cover, roughness: 0.7 });
  // Le plat arrière est le même plat retourné (demi-tour autour de x) : son image tournerait avec lui, tête
  // en bas et vue de dos. Tournée d'un demi-tour, elle se lit droite, la cote en bas.
  look.back.center.set(0.5, 0.5);
  look.back.rotation = Math.PI;
  const backMaterial = new THREE.MeshStandardMaterial({ map: look.back, roughness: 0.7 });
  const insideMaterial = new THREE.MeshStandardMaterial({ map: look.inside, roughness: 0.75 });
  const geometry = boardGeometry(shape);

  const body = new THREE.Group();
  root.add(body);
  /**
   * Une moitié du livre : elle tourne autour du point où le bloc se partage (au dos, à la hauteur du
   * partage), descend jusqu'au fond du dos, puis s'incline autour du point de couture (`lean`) ; ses
   * pièces sont placées comme livre fermé, dans `content`.
   */
  const makeHalf = () => {
    const lean = new THREE.Group();
    const pivot = new THREE.Group();
    const content = new THREE.Group();
    lean.add(pivot);
    pivot.add(content);
    body.add(lean);
    return { lean, pivot, content };
  };
  // Moitié gauche : la couverture et les pages déjà lues. Moitié droite : le plat arrière et les pages
  // à lire. Ouvert, les deux plats reposent à la même hauteur, et toutes les feuilles des deux piles
  // convergent au même point, au fond du dos : le point de couture.
  const leftHalf = makeHalf();
  const rightHalf = makeHalf();
  const front = new THREE.Mesh(boardGeometry(shape, JOINT), [coverMaterial, leather, insideMaterial]);
  front.position.set(JOINT, 0, thickness / 2 - board);
  leftHalf.content.add(front);
  // La reliure (dos et mors) relie les deux plats, où qu'ils soient.
  const binding = createBinding(shape);
  const spineLeather = new THREE.MeshStandardMaterial({ map: look.spine, roughness: 0.7 });
  // Dessous du mors : la même peau que l'intérieur de la couverture (la garde, continue jusqu'au pli).
  body.add(
    new THREE.Mesh(binding.spine, [spineLeather, spineLeather, leather]),
    new THREE.Mesh(binding.joint, [coverMaterial, insideMaterial, leather]),
  );
  let cut = thickness / 2 - board;
  /** Partage vu de la pile de gauche : le même, sauf pendant qu'une feuille tourne. */
  let cutLeft = cut;
  /** Ouverture : écart entre les deux moitiés (0 : fermé, π : à plat). */
  let angle = 0;
  /** Angle de la couverture, et du plat arrière qui se referme en fin de livre. */
  let frontAngle = 0;
  let backAngle = 0;
  let leftAngle = 0;
  let rightAngle = 0;
  /** Point de couture, au fond du dos (sur le plat arrière, à x = 0). */
  const seam = -(thickness / 2 - board);
  /**
   * Force de la courbure (pages qui remontent au pli, couverture qui s'incurve vers le dos) selon le
   * partage : présente dès qu'il y a des pages des deux côtés, plus forte au milieu du livre ; nulle à la
   * toute première et à la toute dernière double page (une seule pile), et croissante sur les premières
   * et dernières feuilles.
   */
  const curve = (split: number): number => {
    const depth = thickness / 2 - board;
    const least = Math.min(split + depth, depth - split);
    // Elle naît en douceur quand une pile devient très mince (dernières feuilles) : pas de saut quand la
    // dernière feuille se pose ou se soulève.
    return (shape.arch ?? ARCH) * Math.max(0.45 * depth, least) * Math.min(1, least / (0.15 * depth));
  };
  let onOpen = (): void => {};
  /** Place les deux moitiés (partage, ouverture, inclinaison) et déforme la reliure. */
  /** Descente de la moitié gauche ouverte : son point de couture rejoint celui de droite. */
  let lower = 0;
  let sag = 0;
  const pose = (): void => {
    const amount = angle / Math.PI;
    // Le dos s'enfonce : les deux moitiés s'inclinent autour du point de couture, tranches relevées
    // (la reliure en « ∪ » très ouvert, les pages qui montent en arc de part et d'autre du pli).
    sag = (shape.sag ?? SAG) * amount;
    lower = 2 * cutLeft * amount;
    leftAngle = angle - sag;
    rightAngle = sag;
    for (const [part, turn, lean, drop, split] of [[leftHalf, angle, -sag, lower, cutLeft], [rightHalf, 0, sag, 0, cut]] as const) {
      part.lean.position.set(0, 0, seam);
      part.lean.rotation.y = -lean;
      part.pivot.position.set(0, 0, split - drop - seam);
      part.pivot.rotation.y = -turn;
      part.content.position.set(0, 0, -split);
    }
    binding.bend(place, leftAngle, rightAngle, amount);
  };
  const rotate = ([x, z]: Point, turn: number): Point => [x * Math.cos(turn) - z * Math.sin(turn), x * Math.sin(turn) + z * Math.cos(turn)];
  /** Position (x, z) d'un point d'une moitié, placé comme livre fermé : les mêmes gestes que `pose`. */
  const place = (side: 'left' | 'right', [x, z]: Point): Point => {
    const [turn, lean, drop, split] = side === 'left' ? [angle, -sag, lower, cutLeft] : [0, sag, 0, cut];
    const [ox, oz] = rotate([x, z - split], turn);
    const [lx, lz] = rotate([ox, oz + split - drop - seam], lean);
    return [lx, lz + seam];
  };
  // Ouverture : les moitiés tournent, la reliure suit ; les pages se creusent vers le pli.
  const open = (): void => {
    angle = frontAngle - backAngle;
    pose();
    // Refermé sur son dos : tout le livre bascule autour de la charnière de la moitié gauche, qui reste
    // à plat pendant que le plat arrière se relève.
    const [hx, hz] = place('left', [0, cutLeft]);
    const [rx, rz] = rotate([hx, hz], backAngle);
    body.rotation.y = -backAngle;
    body.position.set(hx - rx, 0, hz - rz);
    layRibbon();
    front.castShadow = frontAngle < BOARD_SHADOW_END * Math.PI;
    back.castShadow = backAngle < BOARD_SHADOW_END * Math.PI;
    onOpen();
  };
  const clamp = (amount: number): number => Math.PI * Math.min(1, Math.max(0, amount));

  // Plat de derrière : retourné (sa face extérieure regarde -z), coins arrondis toujours côté tranche.
  const back = new THREE.Mesh(geometry, [backMaterial, leather, insideMaterial]);
  back.rotation.x = Math.PI;
  back.position.set(0, 0, -thickness / 2 + board);
  rightHalf.content.add(back);

  // Intérieur de la reliure, que remplit le dos arrondi des feuilles.
  const inner = thickness / 2 - SPINE_LEATHER * thickness;

  // Feuilles : deux piles. À droite, celles qui restent à lire, sur le plat arrière ; à gauche, celles
  // déjà lues, attachées à la couverture (elles s'ouvrent avec elle). Livre neuf : tout le bloc à
  // droite, rien à gauche (on voit l'intérieur de la couverture). Leur dos arrondi remplit la coque.
  const half = thickness / 2 - board;
  const edgeMaterial = new THREE.MeshStandardMaterial({ map: look.edge, roughness: 0.9 });
  const paperMaterial = (): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: look.paper, roughness: 0.95 });
  const rightPage = paperMaterial();
  const leftPage = paperMaterial();
  const glow = createPageGlow();
  glow.add(rightPage);
  glow.add(leftPage);
  const foldPaper = paperMaterial();
  const rightStack = new THREE.Mesh(new THREE.BufferGeometry(), [edgeMaterial, rightPage, paperMaterial(), foldPaper]);
  const leftStack = new THREE.Mesh(new THREE.BufferGeometry(), [edgeMaterial, paperMaterial(), leftPage, foldPaper]);
  rightHalf.content.add(rightStack);
  leftHalf.content.add(leftStack);
  /** Épaisseur minimale d'une pile : quelques feuilles, jamais rien. */
  const sheets = half * 0.02;
  // Tranchefiles : un bourrelet de fil tressé en haut et en bas du pli, cousu au dos du bloc. Livre
  // fermé, ils sont cachés entre les pages ; ils apparaissent au fond du pli quand il s'ouvre.
  const band = createHeadbandGeometry();
  // Soie : un peu de lustre.
  const bandMaterial = new THREE.MeshStandardMaterial({ map: look.headband, roughness: 0.45 });
  const tall = height - 2 * shape.overhang;
  const headbands = (look.headband ? [tall / 2 + 0.004, -tall / 2 - 0.004] : []).map((y) => {
    const mesh = new THREE.Mesh(band, bandMaterial);
    mesh.position.y = y;
    body.add(mesh);
    return mesh;
  });
  let read = 0;
  // Signet : cousu en haut du dos, près du pli ; son bout pend sous le livre.
  const ribbon = createRibbon(look.ribbon ?? 0x7a1c22);
  ribbon.mesh.visible = false;
  body.add(ribbon.mesh);
  let ribbonAt: number | null = null;
  /** Écart d'avancement d'une double page à la suivante. */
  let step = 1;
  /** Feuille qui tourne (où elle en est), null : aucune. */
  let leafTurn: number | null = null;
  const layRibbon = (): void => {
    ribbon.mesh.visible = ribbonAt !== null;
    if (ribbonAt === null) return;
    const at = ribbonAt;
    const fold = shape.width - shape.overhang;
    const lift = curve(cut);
    // Pile où il est glissé (celle de gauche s'il est sur la page ouverte, ou sous la feuille qui vient de
    // la couvrir ; celle de droite tant qu'on ne l'a pas atteint), et hauteur de la feuille qui le porte à
    // la distance x du dos : entre le dessous et le dessus de la pile, à sa place dans le bloc.
    const right = at > read + 1e-6 || readLeft <= 0;
    // À plat sur la page du dessus, du haut au bas de la page : ouvert à sa double page, et pendant qu'une
    // feuille tourne juste à côté (il reste sur sa page, que la feuille découvre ou recouvre). Plus loin,
    // enfoui sous d'autres feuilles, seul dépasse son bout.
    const shown = Math.abs(at - read) < step - 1e-6 && opened > 0.3;
    // Au repos, un peu au-dessus du papier ; sous une feuille qui tourne, moins que l'écart qu'elle garde
    // au-dessus des piles (LEAF_GAP), sinon il la traverserait.
    const over = Math.abs(at - read) < 1e-6 ? 0.0015 : 0.0005;
    const splitAt = at <= 0 ? half : at >= 1 ? -half : half - 2 * half * at;
    // Part de la pile sous lui (1 : sur la page du dessus). Visible, toujours sur le dessus : une pile a une
    // épaisseur minimale (`sheets`), sa vraie place dans le bloc tomberait au milieu de la pile.
    const share = (value: number): number => (shown ? 1 : Math.min(1, Math.max(0, value)));
    const sheet = (x: number): number => {
      if (right) {
        const low = curl(x) - half;
        const high = curl(x) + Math.max(-half + 0.001, cut + pageProfile(x, lift, opened, fold, cut + half));
        return low + share((splitAt + half) / Math.max(1e-6, cut + half)) * (high - low);
      }
      const high = -curl(x) + half;
      const low = -curl(x) + Math.min(half - 0.001, cutLeft - pageProfile(x, lift, opened, fold, half - cutLeft));
      return high + share((splitAt - half) / Math.min(-1e-6, cutLeft - half)) * (low - high);
    };
    const lean = right ? 1 : -1;
    const edge = (x: number, y: number, over: number): THREE.Vector3Tuple => {
      const [bx, bz] = place(right ? 'right' : 'left', [x, sheet(x) + over * lean]);
      return [bx, y, bz];
    };
    // Au centre du livre, au fond du pli entre les deux pages, là où il est cousu : son bout sort sous le dos.
    const middle = RIBBON_WIDTH / 2 + 0.004;
    const [a, b] = [middle - RIBBON_WIDTH / 2, middle + RIBBON_WIDTH / 2];
    const points: RibbonPoint[] = [];
    // Entre la double page d'avant et la sienne, la feuille qui tourne porte sa page à son verso : le
    // signet, dans le pli de cette page, tourne avec elle (posé à droite, il serait traversé par elle).
    const onLeaf = leafTurn !== null && opened > 0.3 && at - read > 1e-6 && at - read < step - 1e-6;
    if (onLeaf) {
      const position = leafGeometry.attributes.position;
      const normal = leafGeometry.attributes.normal;
      const spacing = fore / LEAF_STEPS;
      /** Point de la feuille à la distance x du pli, sur une rangée (0 : en haut), écarté côté verso. */
      const onSheet = (x: number, row: number): THREE.Vector3Tuple => {
        const k = Math.min(LEAF_STEPS - 1, Math.floor(x / spacing));
        const f = x / spacing - k;
        const [i, j] = [row * (LEAF_STEPS + 1) + k, row * (LEAF_STEPS + 1) + k + 1];
        const mix = (attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, c: number): number =>
          attribute.getComponent(i, c) * (1 - f) + attribute.getComponent(j, c) * f;
        return [0, 1, 2].map((c) => mix(position, c) - 0.0005 * mix(normal, c)) as THREE.Vector3Tuple;
      };
      for (let i = 0; i <= RIBBON_INSIDE; i++) {
        const row = Math.round((i * LEAF_ROWS) / RIBBON_INSIDE);
        points.push([onSheet(a, row), onSheet(b, row)]);
      }
    } else {
      for (let i = 0; i <= RIBBON_INSIDE; i++) {
        const y = shown ? tall / 2 - (tall * i) / RIBBON_INSIDE : -tall / 2;
        points.push([edge(a, y, over), edge(b, y, over)]);
      }
    }
    // Il sort du livre par-dessus la tranchefile du bas, sans la traverser (en haut, il est cousu dessous) :
    // son dernier point passe devant elle, et le bout qui pend part de là.
    const [, bottomBand] = headbands;
    if (bottomBand?.visible) {
      const clear = HEADBAND_RADIUS + 0.0015;
      for (const point of points[RIBBON_INSIDE]) {
        if (Math.abs(point[0] - bottomBand.position.x) > HEADBAND_LENGTH / 2) continue;
        point[2] = Math.max(point[2], bottomBand.position.z + clear);
      }
    }
    // Le bout qui dépasse : il pend sous le livre, un peu de biais.
    const [root] = points[RIBBON_INSIDE];
    for (let i = 1; i <= RIBBON_TAIL; i++) {
      const drop = (0.13 * i) / RIBBON_TAIL;
      const [start, end] = points[RIBBON_INSIDE];
      const drift = 0.012 * (i / RIBBON_TAIL) ** 2;
      points.push([
        [start[0] + drift, root[1] - drop, start[2]],
        [end[0] + drift, root[1] - drop, end[2]],
      ]);
    }
    ribbon.lay(points);
  };
  /** Les piles ont déjà été construites une fois. */
  let built = false;
  let readLeft = 0;
  let readRight = 0;
  let opened = 0;
  /**
   * Courbure du livre ouvert : de combien un plat (et la pile qu'il porte) se relève vers ses pages, à
   * la distance x du dos. Nulle au dos, de plus en plus forte vers la tranche : la reliure fait un arc.
   */
  const curl = (x: number): number => (shape.curl ?? CURL) * opened * (Math.max(0, x) / shape.width) ** 2;
  /** Un plat qui se courbe avec l'ouverture ; `from` : distance au dos du début de sa géométrie. */
  const bendable = (mesh: THREE.Mesh, from: number) => {
    const position = mesh.geometry.attributes.position;
    const flat = Float32Array.from(position.array);
    return (): void => {
      // Vers les pages : -z pour les deux plats (le plat arrière est retourné).
      for (let i = 0; i < position.count; i++) position.setZ(i, flat[i * 3 + 2] - curl(flat[i * 3] + from));
      position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
    };
  };
  const bendBoards = [bendable(front, JOINT), bendable(back, 0)];
  /** Reconstruit les piles : partage selon l'avancement, pages qui plongent vers le pli selon l'ouverture. */
  const rebuild = (): void => {
    // Hauteur où le bloc se partage : tout à droite au début, tout à gauche à la fin.
    const split = (value: number): number =>
      value <= 0 ? half : value >= 1 ? -half : Math.min(half - sheets, Math.max(-half + sheets, half - 2 * half * value));
    cut = split(readRight);
    cutLeft = split(readLeft);
    pose();
    rightStack.geometry.dispose();
    leftStack.geometry.dispose();
    const bulge = 1 - opened;
    // Les feuilles remontent au pli d'autant plus que les deux côtés sont épais : au milieu du livre,
    // beaucoup ; au début et à la fin (une seule pile), la page reste plane jusqu'au pli.
    const lift = curve(cut);
    rightStack.geometry =
      readRight >= 1 ? new THREE.BufferGeometry() : stackGeometry(shape, inner, half, -half, cut, 1, bulge, opened, lift, curl);
    leftStack.geometry =
      readLeft <= 0
        ? new THREE.BufferGeometry()
        : stackGeometry(shape, inner, half, cutLeft, half, -1, bulge, opened, lift, (x) => -curl(x));
    for (const bend of bendBoards) bend();
    leftStack.visible = readLeft > 0;
    rightStack.visible = readRight < 1;
    // Tranchefiles : au fond du pli.
    for (const mesh of headbands) {
      // Posés sur le dos étalé, au fond du pli, à ses deux bouts.
      mesh.position.set(0, mesh.position.y, -thickness / 2 + board + HEADBAND_RADIUS);
      mesh.visible = opened > 0.3;
    }
    // Après les tranchefiles : il passe par-dessus celle du bas.
    layRibbon();
  };
  const progress = (value: number, left = value, right = value): void => {
    read = Math.min(1, Math.max(0, value));
    const [wasLeft, wasRight] = [readLeft, readRight];
    readLeft = Math.min(read, Math.max(0, left));
    readRight = Math.max(read, Math.min(1, right));
    // Pendant qu'une page tourne, l'avancement change à chaque image, mais les piles ne bougent que d'une
    // feuille par page : reconstruites seulement quand l'écart se voit (ou qu'une pile naît ou disparaît).
    const moved = (a: number, b: number): boolean => Math.abs(2 * half * (a - b)) > STACK_STEP * half;
    const emptied = (wasLeft <= 0) !== (readLeft <= 0) || (wasRight >= 1) !== (readRight >= 1);
    if (built && !emptied && !moved(readLeft, wasLeft) && !moved(readRight, wasRight)) {
      // Rien à refaire : les piles gardent leur forme ; seul le signet suit l'avancement exact.
      readLeft = wasLeft;
      readRight = wasRight;
      return layRibbon();
    }
    built = true;
    rebuild();
  };
  progress(0);
  open();
  onOpen = (): void => {
    const next = angle / Math.PI;
    if (Math.abs(next - opened) < 1e-3) return;
    opened = next;
    rebuild();
  };

  // Feuille qui tourne : une bande souple le long de la largeur de la page, recto et verso.
  const leafGeometry = new THREE.PlaneGeometry(1, 1, LEAF_STEPS, LEAF_ROWS);
  const leafUv = leafGeometry.attributes.uv;
  const backUv = new Float32Array(leafUv.array.length);
  for (let i = 0; i < leafUv.count; i++) {
    backUv[i * 2] = 1 - leafUv.getX(i);
    backUv[i * 2 + 1] = leafUv.getY(i);
  }
  const leafBackGeometry = leafGeometry.clone();
  leafBackGeometry.setAttribute('uv', new THREE.BufferAttribute(backUv, 2));
  // Le verso partage les positions et les normales du recto (même feuille), avec ses propres UV : des
  // normales à lui resteraient celles de la feuille à plat, et le verso retourné tomberait dans le noir.
  leafBackGeometry.setAttribute('position', leafGeometry.attributes.position);
  leafBackGeometry.setAttribute('normal', leafGeometry.attributes.normal);
  const leafFront = new THREE.MeshStandardMaterial({ color: look.paper, roughness: 0.95, side: THREE.FrontSide });
  const leafBack = new THREE.MeshStandardMaterial({ color: look.paper, roughness: 0.95, side: THREE.BackSide });
  glow.add(leafFront);
  glow.add(leafBack);
  const leaf = new THREE.Group();
  const leafMeshes = [new THREE.Mesh(leafGeometry, leafFront), new THREE.Mesh(leafBackGeometry, leafBack)];
  leaf.add(...leafMeshes);
  leaf.visible = false;
  body.add(leaf);
  const fore = shape.width - shape.overhang;
  /**
   * Pose la feuille à `turn` : elle tourne autour du pli (x = 0, à la hauteur du partage) ; le bord
   * libre traîne derrière la reliure, la feuille se courbe ; posée, elle épouse le creux du pli.
   */
  const poseLeaf = (turn: number, corner: number, forward: boolean): void => {
    const position = leafGeometry.attributes.position;
    // Les deux piles, chacune dans le repère de sa moitié inclinée (x le long du plat depuis le pli,
    // z au-dessus du point de couture) : la feuille ne passe jamais sous leur page du dessus, sinon,
    // en tournant, elle traverserait leur bosse au pli (d'autant plus haute que la pile est épaisse).
    const thickness = curve(cut);
    const stacks = [
      { lean: sag, dir: 1, stack: cut + half },
      { lean: -sag, dir: -1, stack: readLeft > 0 ? half - cutLeft : 0 },
    ];
    const above = ([x, z]: Point): Point => {
      let point: Point = [x, z];
      for (const { lean, dir, stack } of stacks) {
        const [u, v] = rotate(point, -lean);
        const along = u * dir;
        if (along <= 0 || along > fore) continue;
        const page = stack > 0 ? stack + pageProfile(along, thickness, opened, fore, stack) : 0;
        const floor = page + curl(along) + (stack > 0 ? LEAF_GAP : LEAF_BOARD_GAP);
        if (v < floor) point = rotate([u, floor], lean);
      }
      return point;
    };
    /** Une rangée de la feuille (sa coupe à une hauteur donnée), tournée de `turn`. */
    const row = (turn: number): Point[] => {
      // De la page de droite (angle de la moitié droite) à celle de gauche (angle de la moitié gauche).
      const base = rightAngle + (leftAngle - rightAngle) * turn;
      const lag = 0.9 * Math.sin(Math.PI * turn);
      const rest = 1 - Math.sin(Math.PI * turn);
      // Posée, elle prend la forme de la page sur laquelle elle repose : sa hauteur au-dessus du point
      // de couture, du côté de la pile qu'elle quitte ou qu'elle rejoint (au-dessus de la feuille).
      const landing = (cut + half) * (1 - turn) + (half - cutLeft) * turn;
      // Au-dessus d'un plat nu (pas de pile du côté qu'elle quitte ou rejoint), un peu plus d'écart.
      const bare = (side: number): number => (side > 0 ? 0 : 1);
      const gap = LEAF_GAP + (LEAF_BOARD_GAP - LEAF_GAP) * (bare(cut + half) * (1 - turn) + bare(readLeft > 0 ? half - cutLeft : 0) * turn);
      const up = turn < 0.5 ? 1 : -1;
      const [nx, nz] = [-Math.sin(base) * up, Math.cos(base) * up];
      let x = 0;
      let z = 0;
      const points: Point[] = [];
      for (let i = 0; i <= LEAF_STEPS; i++) {
        const across = (i / LEAF_STEPS) * fore;
        const rise = rest * (landing + pageProfile(across, thickness, opened, fore, landing) + curl(across)) + gap;
        // Cousue au point de couture, elle tourne autour de lui, d'une pile à l'autre.
        points.push(above([x + rise * nx, z + rise * nz]));
        // Angle de la feuille le long de sa largeur : au pli elle est en avance, au bord elle traîne.
        const phi = base + lag * (0.35 - i / LEAF_STEPS);
        x += (fore / LEAF_STEPS) * Math.cos(phi);
        z += (fore / LEAF_STEPS) * Math.sin(phi);
      }
      return points;
    };
    // Prise par un coin (1 : en haut, -1 : en bas), la feuille part de lui : le coin saisi mène, le
    // bord opposé suit en retard, la feuille se décolle en diagonale. L'écart s'efface à l'arrivée.
    const lead = CORNER_LEAD * Math.abs(corner) * Math.sin(Math.PI * turn) * (forward ? 1 : -1);
    const rows: Point[][] = [];
    for (let r = 0; r <= LEAF_ROWS; r++) {
      const height = r / LEAF_ROWS;
      const toward = corner > 0 ? height : corner < 0 ? 1 - height : 0.5;
      rows.push(row(Math.min(1, Math.max(0, turn + lead * (toward - 0.5) * 2))));
    }
    for (let i = 0; i < position.count; i++) {
      const [lx, lz] = rows[Math.round(leafUv.getY(i) * LEAF_ROWS)][Math.round(leafUv.getX(i) * LEAF_STEPS)];
      position.setXYZ(i, lx, (leafUv.getY(i) - 0.5) * tall, seam + lz);
    }
    position.needsUpdate = true;
    leafGeometry.computeVertexNormals();
    leafGeometry.computeBoundingSphere();
    leafBackGeometry.computeBoundingSphere();
  };

  // Tout porte et reçoit les ombres : plats sur les feuilles, dos sur les plats.
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  // Sauf les plats en pleine course (voir BOARD_SHADOW_END).
  open();

  return {
    root,
    setOpen: (amount) => {
      frontAngle = clamp(amount);
      open();
    },
    setShut: (amount) => {
      backAngle = clamp(amount);
      open();
    },
    setProgress: progress,
    setLeaf: (turn, front = null, back = null, corner = 0, forward = true) => {
      leaf.visible = turn !== null;
      leafTurn = turn;
      for (const [material, map] of [[leafFront, front], [leafBack, back]] as const) {
        glow.show(material, turn === null ? null : map);
        if (turn === null) continue;
        if (material.map !== map) {
          material.map = map;
          material.color.set(map ? 0xffffff : look.paper);
          material.needsUpdate = true;
        }
      }
      if (turn === null) return void layRibbon();
      for (const mesh of leafMeshes) mesh.castShadow = turn < LEAF_SHADOW_END;
      poseLeaf(turn, corner, forward);
      // Le signet peut être porté par la feuille : il la suit.
      layRibbon();
    },
    pageUnder: ({ object, face, uv }) => {
      // Dessus de la pile de droite, dessous (retourné) de celle de gauche : les faces qui portent les pages.
      const side = object === rightStack && face?.materialIndex === 1 ? 'right' : object === leftStack && face?.materialIndex === 2 ? 'left' : null;
      return side && uv ? { side, u: uv.x, v: 1 - uv.y } : null;
    },
    setRibbon: (at, spread = 1) => {
      ribbonAt = at;
      step = spread;
      layRibbon();
    },
    isRibbon: (object) => object === ribbon.mesh,
    setPages: (left, right) => {
      leftPage.map = left;
      rightPage.map = right;
      leftPage.color.set(left ? 0xffffff : look.paper);
      rightPage.color.set(right ? 0xffffff : look.paper);
      leftPage.needsUpdate = true;
      rightPage.needsUpdate = true;
      glow.show(leftPage, left);
      glow.show(rightPage, right);
    },
    glow,
  };
};
