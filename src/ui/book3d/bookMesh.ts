import * as THREE from 'three';

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
  /** Fil des tranchefiles (bourrelets en haut et en bas du pli). */
  headband: THREE.Texture;
}

export interface BookMesh {
  root: THREE.Group;
  /** Plat de devant, qui pivote sur le dos pour ouvrir le livre (0 : fermé, 1 : ouvert à plat). */
  setOpen: (amount: number) => void;
  /**
   * Avancement dans le livre (0 : début, 1 : fin) : épaisseur des piles de feuilles de chaque côté.
   * `left` : les feuilles déjà posées à gauche, si elles diffèrent (pendant qu'une feuille tourne, celles
   * qui n'ont pas encore atterri ; 0 : aucune, on voit l'intérieur de la couverture).
   */
  setProgress: (read: number, left?: number) => void;
  /** Contenu des deux pages visibles (null : papier vierge, ou l'intérieur de la couverture à gauche). */
  setPages: (left: THREE.Texture | null, right: THREE.Texture | null) => void;
  /**
   * Feuille qui tourne autour du pli : `turn` de 0 (posée à droite) à 1 (posée à gauche), `front` son
   * recto (la page de droite), `back` son verso (la page de gauche d'après). null : pas de feuille.
   */
  setLeaf: (turn: number | null, front?: THREE.Texture | null, back?: THREE.Texture | null) => void;
}

/** Épaisseur du cuir du dos (part de l'épaisseur du livre), et aplatissement de son arrondi. */
const SPINE_LEATHER = 0.08;
const SPINE_BULGE = 0.55;

/** Contour d'un plat : rectangle à la taille du livre, coins arrondis côté tranche (x = largeur). */
const boardShape = ({ width, height, corner }: BookShape): THREE.Shape => {
  const shape = new THREE.Shape();
  const [left, right, bottom, top] = [0, width, 0, height];
  const round = Math.max(0.001, corner);
  shape.moveTo(left, bottom);
  shape.lineTo(right - round, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + round);
  shape.lineTo(right, top - round);
  shape.quadraticCurveTo(right, top, right - round, top);
  shape.lineTo(left, top);
  shape.closePath();
  return shape;
};

/**
 * Plat, du dos + `from` jusqu'à la tranche : le contour extrudé sur son épaisseur.
 * UV : la position rapportée à tout le plat (0 à 1), pour que la couverture se poursuive sans
 * raccord sur le mors ; les chants reprennent la même peau. Origine : l'arête côté dos, face intérieure.
 */
const boardGeometry = (shape: BookShape, from = 0): THREE.ExtrudeGeometry => {
  // Arêtes franches : un plat arrondi creuserait un sillon là où il rejoint le mors ou le dos, et le
  // glisser dessous ferait se chevaucher deux surfaces (bords noirs qui scintillent).
  const geometry = new THREE.ExtrudeGeometry(boardShape({ ...shape, width: shape.width - from }), {
    depth: shape.board,
    bevelEnabled: false,
    curveSegments: 10,
  });
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + from) / shape.width, position.getY(i) / shape.height);
  // Le plat occupe z de 0 (face intérieure) à son épaisseur (face extérieure).
  geometry.translate(0, -shape.height / 2, 0);
  // Deux peaux : dehors la couverture (groupe 0), dedans le contre-plat (groupe 2) ; chants : groupe 1.
  const index = geometry.index ? [...geometry.index.array] : [...Array(position.count).keys()];
  const outer: number[] = [];
  const inner: number[] = [];
  const edges: number[] = [];
  for (let k = 0; k < index.length; k += 3) {
    const corners = index.slice(k, k + 3);
    const z = corners.map((i) => position.getZ(i));
    const flat = Math.abs(z[1] - z[0]) < 1e-6 && Math.abs(z[2] - z[0]) < 1e-6;
    (flat ? (z[0] > shape.board / 2 ? outer : inner) : edges).push(...corners);
  }
  geometry.setIndex([...outer, ...edges, ...inner]);
  geometry.clearGroups();
  geometry.addGroup(0, outer.length, 0);
  geometry.addGroup(outer.length, edges.length, 1);
  geometry.addGroup(outer.length + edges.length, inner.length, 2);
  return geometry;
};

/** Livre ouvert : inclinaison de chaque moitié, tranches relevées, dos au plus bas (radians). */
const SAG = 0.025;
/** Livre ouvert : hauteur dont les plats se relèvent en arc jusqu'à la tranche (le dos au plus bas). */
const CURL = 0.03;
/** Largeur du mors : la bande de cuir souple entre le dos et le plat de devant, qui se plie. */
const JOINT = 0.04;
/** Segments de la reliure : le tour du dos, puis le mors. */
const SPINE_STEPS = 30;
const JOINT_STEPS = 4;

/** Un point (x, z) dans le plan de la tête du livre. */
type Point = readonly [number, number];

/** Un point de la surface de la reliure, et sa normale (vers l'extérieur du livre). */
interface Sample {
  x: number;
  z: number;
  nx: number;
  nz: number;
}

/**
 * Une bande de cuir de l'épaisseur d'un plat, sur toute la hauteur du livre, qui suit une suite de
 * points. Groupes : 0 le dessus (la peau, texture `uFor`), 1 le dessous (l'intérieur), 2 les tranches
 * (tête, queue).
 */
const createStrip = (steps: number, height: number, board: number, uFor: (step: number) => number) => {
  const count = (steps + 1) * 2 * 2; // pas × (haut, bas) × (dessus, dessous)
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const index = (step: number, end: number, layer: number): number => (layer * (steps + 1) + step) * 2 + end;
  const outside: number[] = [];
  const inside: number[] = [];
  const rest: number[] = [];
  for (let step = 0; step < steps; step++) {
    const [a, b, c, d] = [index(step, 0, 0), index(step + 1, 0, 0), index(step + 1, 1, 0), index(step, 1, 0)];
    // Dessus : faces tournées vers l'extérieur du livre.
    outside.push(a, c, b, a, d, c);
    const [e, f, g, h] = [index(step, 0, 1), index(step + 1, 0, 1), index(step + 1, 1, 1), index(step, 1, 1)];
    inside.push(e, f, g, e, g, h);
    // Tête et queue : le cuir vu par sa tranche, entre dessus et dessous.
    rest.push(index(step, 1, 0), index(step + 1, 1, 0), index(step + 1, 1, 1), index(step, 1, 0), index(step + 1, 1, 1), index(step, 1, 1));
    rest.push(index(step, 0, 0), index(step + 1, 0, 1), index(step + 1, 0, 0), index(step, 0, 0), index(step, 0, 1), index(step + 1, 0, 1));
  }
  for (let step = 0; step <= steps; step++) {
    for (let end = 0; end < 2; end++) {
      for (let layer = 0; layer < 2; layer++) {
        const i = index(step, end, layer);
        uvs[i * 2] = uFor(step);
        // Même sens que les plats : le haut du livre (end 0, y = +hauteur/2) en haut de l'image.
        uvs[i * 2 + 1] = end === 0 ? 1 : 0;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([...outside, ...inside, ...rest]);
  geometry.addGroup(0, outside.length, 0);
  geometry.addGroup(outside.length, inside.length, 1);
  geometry.addGroup(outside.length + inside.length, rest.length, 2);
  /** Place la bande : le dessus sur les points, le dessous une épaisseur de cuir vers l'intérieur. */
  const follow = (samples: Sample[]): void => {
    samples.forEach(({ x, z, nx, nz }, step) => {
      for (let layer = 0; layer < 2; layer++) {
        const side = layer === 0 ? 1 : -1;
        for (let end = 0; end < 2; end++) {
          const i = index(step, end, layer);
          positions[i * 3] = x - layer * board * nx;
          positions[i * 3 + 1] = end === 0 ? height / 2 : -height / 2;
          positions[i * 3 + 2] = z - layer * board * nz;
          // Normale exacte (perpendiculaire à la courbe) : le cuir prend la lumière comme les plats.
          normals[i * 3] = nx * side;
          normals[i * 3 + 1] = 0;
          normals[i * 3 + 2] = nz * side;
        }
      }
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.computeBoundingSphere();
  };
  return { geometry, follow };
};

/** Une courbe de Bézier cubique échantillonnée : points et normales (vers l'extérieur du livre). */
const bezier = (controls: readonly Point[], steps: number): Sample[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    const dw = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
    const pick = (k: number[], axis: 0 | 1): number => k.reduce((sum, c, j) => sum + c * controls[j][axis], 0);
    const [tx, tz] = [pick(dw, 0), pick(dw, 1)];
    const length = Math.hypot(tx, tz);
    // Courbe réduite à un point (dos aplati, livre grand ouvert) : normale vers le bas, sous le livre.
    return length < 1e-9
      ? { x: pick(w, 0), z: pick(w, 1), nx: 0, nz: -1 }
      : { x: pick(w, 0), z: pick(w, 1), nx: -tz / length, nz: tx / length };
  });

/**
 * La reliure : une bande de cuir souple du plat arrière au plat de devant, en deux morceaux qui se
 * raccordent sans cassure. Le dos : fermé, un demi-ovale bombé derrière les feuilles (du bas du dos à
 * son haut) ; en s'ouvrant, il roule et s'aplatit, jusqu'à passer à plat sous le livre. Le mors : la
 * bande entre le haut du dos et le plat de devant, dans le prolongement de la couverture. Deux peaux :
 * le dos (sans ornement) et le mors (la couverture, sans raccord).
 */
const createBinding = ({ width, height, thickness, board }: BookShape) => {
  const spine = createStrip(SPINE_STEPS, height, board, (step) => step / SPINE_STEPS);
  const joint = createStrip(JOINT_STEPS, height, board, (step) => ((step / JOINT_STEPS) * JOINT) / width);
  const top = thickness / 2;
  /** Bombé du dos fermé ; 4/3 × rayon : une Bézier cubique qui suit un demi-ovale. */
  const reach = (4 / 3) * SPINE_BULGE * top;
  const rotate = ([x, z]: Point, angle: number): Point => [x * Math.cos(angle) - z * Math.sin(angle), x * Math.sin(angle) + z * Math.cos(angle)];
  /**
   * `place` : où se trouve un point d'une moitié du livre (couverture et pages lues à gauche ; plat
   * arrière et pages à lire à droite), `left`, `right` : leurs rotations ; `openness` (0 à 1) : ouvert,
   * le dos ne bombe plus : il passe à plat sous le pli. Le dos va du plat arrière au haut
   * du dos, qui suit la couverture ; le mors, droit, prolonge la couverture.
   */
  const bend = (place: (side: 'left' | 'right', point: Point) => Point, left: number, right: number, openness: number): void => {
    const flat = 1 - openness;
    const start = place('right', [0, -top]);
    const outward = rotate([-flat, 0], right);
    const summit = place('left', [0, top]);
    const heading = rotate([flat, 0], left);
    spine.follow(
      bezier(
        [
          start,
          [start[0] + reach * outward[0], start[1] + reach * outward[1]],
          [summit[0] - reach * heading[0], summit[1] - reach * heading[1]],
          summit,
        ],
        SPINE_STEPS,
      ),
    );
    const edge = place('left', [JOINT, top]);
    const along = rotate([1, 0], left);
    joint.follow(
      Array.from({ length: JOINT_STEPS + 1 }, (_, i) => {
        const t = i / JOINT_STEPS;
        return { x: summit[0] + (edge[0] - summit[0]) * t, z: summit[1] + (edge[1] - summit[1]) * t, nx: -along[1], nz: along[0] };
      }),
    );
  };
  return { spine: spine.geometry, joint: joint.geometry, bend };
};

/** Hauteur du bombement des pages (part de l'épaisseur qui le porte), livre grand ouvert. */
const ARCH = 0.8;
/** Où les pages sont au plus haut (part de la largeur de la page, depuis le pli). */
const PEAK = 0.24;
/** Raideur de la montée depuis le pli (pente de départ : RISE fois la pente moyenne jusqu'au sommet). */
const RISE = 5;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Forme de la page visible d'une pile ouverte, à la distance `x` du pli (écart à sa hauteur à plat),
 * comme un livre posé ouvert : au pli, toutes les feuilles de la pile (`stack` : son épaisseur)
 * convergent au fond du dos, où elles sont cousues ; de là, la page monte en arc de cercle (verticale
 * au pli, à plat à son sommet), puis redescend doucement jusqu'à la tranche. `lift` : l'épaisseur qui
 * porte le bombement (nulle quand un côté n'a pas de pages : la page ne fait que plonger au pli).
 */
const pageProfile = (x: number, lift: number, opened: number, width: number, stack: number): number => {
  if (opened <= 0) return 0;
  const t = Math.min(1, Math.max(0, x / width));
  const arch = ARCH * Math.max(0, lift);
  if (t >= PEAK) return arch * opened * (1 - smooth((t - PEAK) / (1 - PEAK)));
  // Du point de couture (-stack) au sommet (+arch) : raide au pli, sans jamais y être tout à fait
  // verticale (inclinée avec sa moitié, elle passerait sur la page d'en face), à plat au sommet.
  const rise = 1 - (1 - t / PEAK) ** RISE;
  return (-stack + (stack + arch) * rise) * opened;
};

/** Segments de la feuille qui tourne, le long de sa largeur. */
const LEAF_STEPS = 40;
/** Points le long d'une page, plus serrés près du pli où elle se courbe. */
const PAGE_STEPS = 40;

/**
 * Une pile de feuilles, vue par sa tête : entre les hauteurs `z0` et `z1` du bloc (le bloc entier va
 * de -half à +half, entre les plats), dos (x = 0) arrondi comme l'intérieur de la coque (demi-ellipse
 * de rayon `inner`, aplatie comme elle), extrudée sur la hauteur du livre moins les débords.
 * `side` : la page visible (1 le dessus, -1 le dessous, 0 aucune) prend la forme d'une page ouverte
 * (`pageProfile`, selon `opened` ; `lift` : l'épaisseur qui la tire vers le haut au pli). `bulge` : bombé du dos des feuilles (1 fermé, 0 ouvert à plat).
 * Groupes de matériau : 0 les bords (la tranche, la tête, la queue), 1 le dessus, 2 le dessous, 3 le
 * dos arrondi (au fond du pli : du papier).
 * UV : sur les bords, v suit l'épaisseur (les lignes des feuilles leur restent parallèles) ; dessus
 * et dessous, la page entière (u du dos vers la tranche ; dessous vu de l'autre côté, u inversé).
 */
const stackGeometry = (
  { width, height, overhang }: BookShape,
  inner: number,
  half: number,
  z0: number,
  z1: number,
  side = 0,
  bulge = 1,
  opened = 0,
  lift = 0,
  curl: (x: number) => number = () => 0,
): THREE.BufferGeometry => {
  // Dos arrondi des feuilles : il remplit la reliure du livre fermé ; ouvert, il s'aplatit (`bulge`
  // tend vers 0), sinon il déborderait par-dessus la page d'en face.
  const back = (z: number): number => -bulge * SPINE_BULGE * inner * Math.sqrt(Math.max(0, 1 - (z / inner) ** 2));
  const fore = width - overhang;
  // Page visible : creusée au pli, bombée ensuite ; la pile garde toujours un peu d'épaisseur. Toute
  // la pile suit la courbure de son plat (`curl` : son décalage, à la distance x du dos).
  const shape = (x: number): number => pageProfile(x, lift, opened, fore, z1 - z0);
  const top = (x: number): number => curl(x) + (side > 0 ? Math.max(z0 + 0.001, z1 + shape(x)) : z1);
  const bottom = (x: number): number => curl(x) + (side < 0 ? Math.min(z1 - 0.001, z0 - shape(x)) : z0);
  const along = Array.from({ length: PAGE_STEPS + 1 }, (_, i) => fore * (i / PAGE_STEPS) ** 2);
  const section = new THREE.Shape();
  // Dessous, de la tranche au dos ; le dos arrondi ; dessus, du dos à la tranche.
  section.moveTo(fore, bottom(fore));
  for (let i = PAGE_STEPS - 1; i >= 1; i--) section.lineTo(along[i], bottom(along[i]));
  const [from, to] = [bottom(0), top(0)];
  for (let i = 0; i <= 12; i++) {
    const z = from + ((to - from) * i) / 12;
    section.lineTo(back(z), z);
  }
  for (let i = 1; i <= PAGE_STEPS; i++) section.lineTo(along[i], top(along[i]));
  section.closePath();
  const tall = height - 2 * overhang;
  const extruded = new THREE.ExtrudeGeometry(section, { depth: tall, bevelEnabled: false, curveSegments: 1 });
  // Le profil (x, z du livre) est dans le plan de la forme ; l'extrusion devient la hauteur (y).
  extruded.rotateX(Math.PI / 2);
  extruded.translate(0, tall / 2, 0);
  const source = extruded.toNonIndexed();
  source.computeVertexNormals();
  const position = source.attributes.position;
  const uv = source.attributes.uv;
  const on = (surface: (x: number) => number, i: number): boolean =>
    position.getX(i) > 0.002 && Math.abs(position.getZ(i) - surface(position.getX(i))) < 1e-5;
  const groups: number[][] = [[], [], [], []];
  for (let triangle = 0; triangle < position.count / 3; triangle++) {
    const corners = [0, 1, 2].map((corner) => triangle * 3 + corner);
    // Tête et queue (les deux bouts de l'extrusion) : de la tranche, pas des pages.
    const cap = corners.every((i) => Math.abs(position.getY(i) - position.getY(corners[0])) < 1e-6);
    // Dos arrondi de la pile (côté x ≤ 0) : au fond du pli, le papier qui s'enroule vers la couture.
    const fold = corners.every((i) => position.getX(i) <= 0.0021);
    const group = cap ? 0 : fold ? 3 : corners.every((i) => on(top, i)) ? 1 : corners.every((i) => on(bottom, i)) ? 2 : 0;
    groups[group].push(triangle);
    for (const i of corners) {
      const across = Math.min(1, Math.max(0, position.getX(i) / fore));
      const up = (position.getY(i) + tall / 2) / tall;
      if (group === 1) uv.setXY(i, across, up);
      else if (group === 2) uv.setXY(i, 1 - across, up);
      else {
        // Chaque feuille suit la forme de la pile : sa ligne garde sa place entre le dessous et le dessus
        // à cette distance du pli (les lignes montent vers le pli avec la page du dessus).
        const x = position.getX(i);
        const low = bottom(Math.max(0, x));
        const high = top(Math.max(0, x));
        const share = high - low > 1e-6 ? (position.getZ(i) - low) / (high - low) : 0;
        const sheet = z0 + Math.min(1, Math.max(0, share)) * (z1 - z0);
        uv.setXY(i, up, (sheet + half) / (2 * half));
      }
    }
  }
  const order = groups.flat();
  const result = new THREE.BufferGeometry();
  for (const name of Object.keys(source.attributes)) {
    const attribute = source.attributes[name];
    const size = attribute.itemSize;
    const data = new Float32Array(order.length * 3 * size);
    order.forEach((triangle, index) => {
      for (let k = 0; k < 3 * size; k++) data[index * 3 * size + k] = attribute.array[triangle * 3 * size + k];
    });
    result.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
  let start = 0;
  groups.forEach((triangles, group) => {
    result.addGroup(start, triangles.length * 3, group);
    start += triangles.length * 3;
  });
  return result;
};

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
  let angle = 0;
  let leftAngle = 0;
  let rightAngle = 0;
  /** Point de couture, au fond du dos (sur le plat arrière, à x = 0). */
  const seam = -(thickness / 2 - board);
  /**
   * Force de la courbure (pages qui remontent au pli, couverture qui s'incurve vers le dos) selon le
   * partage : toujours présente dès qu'il y a des pages des deux côtés, plus forte au milieu du livre ;
   * nulle seulement à la toute première et à la toute dernière double page (une seule pile).
   */
  const curve = (split: number): number => {
    const depth = thickness / 2 - board;
    const least = Math.min(split + depth, depth - split);
    return least < depth * 0.01 ? 0 : Math.max(0.45 * depth, least);
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
    sag = SAG * amount;
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
  const open = (amount: number): void => {
    angle = Math.PI * Math.min(1, Math.max(0, amount));
    pose();
    onOpen();
  };

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
  const foldPaper = paperMaterial();
  const rightStack = new THREE.Mesh(new THREE.BufferGeometry(), [edgeMaterial, rightPage, paperMaterial(), foldPaper]);
  const leftStack = new THREE.Mesh(new THREE.BufferGeometry(), [edgeMaterial, paperMaterial(), leftPage, foldPaper]);
  rightHalf.content.add(rightStack);
  leftHalf.content.add(leftStack);
  /** Épaisseur minimale d'une pile : quelques feuilles, jamais rien. */
  const sheets = half * 0.02;
  // Tranchefiles : un bourrelet de fil tressé en haut et en bas du pli, cousu au dos du bloc. Livre
  // fermé, ils sont cachés entre les pages ; ils apparaissent au fond du pli quand il s'ouvre.
  const band = new THREE.CapsuleGeometry(0.0075, 0.03, 4, 12);
  band.rotateZ(Math.PI / 2);
  const bandMaterial = new THREE.MeshStandardMaterial({ map: look.headband, roughness: 0.6 });
  const tall = height - 2 * shape.overhang;
  const headbands = [tall / 2 + 0.004, -tall / 2 - 0.004].map((y) => {
    const mesh = new THREE.Mesh(band, bandMaterial);
    mesh.position.y = y;
    body.add(mesh);
    return mesh;
  });
  let read = 0;
  let readLeft = 0;
  let opened = 0;
  /**
   * Courbure du livre ouvert : de combien un plat (et la pile qu'il porte) se relève vers ses pages, à
   * la distance x du dos. Nulle au dos, de plus en plus forte vers la tranche : la reliure fait un arc.
   */
  const curl = (x: number): number => CURL * opened * (Math.max(0, x) / shape.width) ** 2;
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
      value <= 0 ? half : Math.min(half - sheets, Math.max(-half + sheets, half - 2 * half * value));
    cut = split(read);
    cutLeft = split(readLeft);
    pose();
    rightStack.geometry.dispose();
    leftStack.geometry.dispose();
    const bulge = 1 - opened;
    // Les feuilles remontent au pli d'autant plus que les deux côtés sont épais : au milieu du livre,
    // beaucoup ; au début et à la fin (une seule pile), la page reste plane jusqu'au pli.
    const lift = curve(cut);
    rightStack.geometry = stackGeometry(shape, inner, half, -half, cut, 1, bulge, opened, lift, curl);
    leftStack.geometry =
      readLeft <= 0
        ? new THREE.BufferGeometry()
        : stackGeometry(shape, inner, half, cutLeft, half, -1, bulge, opened, lift, (x) => -curl(x));
    for (const bend of bendBoards) bend();
    leftStack.visible = readLeft > 0;
    // Tranchefiles : au fond du pli.
    for (const mesh of headbands) {
      // Posés sur le dos étalé, au fond du pli, à ses deux bouts.
      mesh.position.set(0, mesh.position.y, -thickness / 2 + board + 0.008);
      mesh.visible = opened > 0.3;
    }
  };
  const progress = (value: number, left = value): void => {
    read = Math.min(1, Math.max(0, value));
    readLeft = Math.min(read, Math.max(0, left));
    rebuild();
  };
  progress(0);
  open(0);
  onOpen = (): void => {
    const next = angle / Math.PI;
    if (Math.abs(next - opened) < 1e-3) return;
    opened = next;
    rebuild();
  };

  // Feuille qui tourne : une bande souple le long de la largeur de la page, recto et verso.
  const leafGeometry = new THREE.PlaneGeometry(1, 1, LEAF_STEPS, 1);
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
  const leaf = new THREE.Group();
  leaf.add(new THREE.Mesh(leafGeometry, leafFront), new THREE.Mesh(leafBackGeometry, leafBack));
  leaf.visible = false;
  body.add(leaf);
  const fore = shape.width - shape.overhang;
  /**
   * Pose la feuille à `turn` : elle tourne autour du pli (x = 0, à la hauteur du partage) ; le bord
   * libre traîne derrière la reliure, la feuille se courbe ; posée, elle épouse le creux du pli.
   */
  const poseLeaf = (turn: number): void => {
    const position = leafGeometry.attributes.position;
    // De la page de droite (angle de la moitié droite) à celle de gauche (angle de la moitié gauche).
    const base = rightAngle + (leftAngle - rightAngle) * turn;
    const lag = 0.9 * Math.sin(Math.PI * turn);
    const rest = 1 - Math.sin(Math.PI * turn);
    let x = 0;
    let z = 0;
    const points: Point[] = [];
    for (let i = 0; i <= LEAF_STEPS; i++) {
      const along = i / LEAF_STEPS;
      points.push([x, z]);
      // Angle de la feuille le long de sa largeur : au pli elle est en avance, au bord elle traîne.
      const phi = base + lag * (0.35 - along);
      x += (fore / LEAF_STEPS) * Math.cos(phi);
      z += (fore / LEAF_STEPS) * Math.sin(phi);
    }
    // Posée, elle prend la forme de la page sur laquelle elle repose : sa hauteur au-dessus du point
    // de couture, du côté de la pile qu'elle quitte ou qu'elle rejoint (au-dessus de la feuille).
    const thickness = curve(cut);
    const landing = (cut + half) * (1 - turn) + (half - cutLeft) * turn;
    const up = turn < 0.5 ? 1 : -1;
    const [nx, nz] = [-Math.sin(base) * up, Math.cos(base) * up];
    // Les deux piles, chacune dans le repère de sa moitié inclinée (x le long du plat depuis le pli,
    // z au-dessus du point de couture) : la feuille ne passe jamais sous leur page du dessus, sinon,
    // en tournant, elle traverserait leur bosse au pli (d'autant plus haute que la pile est épaisse).
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
        const floor = page + curl(along) + 0.0008;
        if (v < floor) point = rotate([u, floor], lean);
      }
      return point;
    };
    for (let i = 0; i < position.count; i++) {
      const step = Math.round(leafUv.getX(i) * LEAF_STEPS);
      const [px, pz] = points[step];
      const across = (step / LEAF_STEPS) * fore;
      const rise = rest * (landing + pageProfile(across, thickness, opened, fore, landing) + curl(across)) + 0.0008;
      // Cousue au point de couture, elle tourne autour de lui, d'une pile à l'autre.
      const [lx, lz] = above([px + rise * nx, pz + rise * nz]);
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

  return {
    root,
    setOpen: open,
    setProgress: progress,
    setLeaf: (turn, front = null, back = null) => {
      leaf.visible = turn !== null;
      if (turn === null) return;
      for (const [material, map] of [[leafFront, front], [leafBack, back]] as const) {
        if (material.map !== map) {
          material.map = map;
          material.color.set(map ? 0xffffff : look.paper);
          material.needsUpdate = true;
        }
      }
      poseLeaf(turn);
    },
    setPages: (left, right) => {
      leftPage.map = left;
      rightPage.map = right;
      leftPage.color.set(left ? 0xffffff : look.paper);
      rightPage.color.set(right ? 0xffffff : look.paper);
      leftPage.needsUpdate = true;
      rightPage.needsUpdate = true;
    },
  };
};
