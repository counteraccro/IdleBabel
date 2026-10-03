import * as THREE from 'three';
import { el } from '../dom';
import { createBookMesh } from './bookMesh';
import { createBookRenderer } from './renderer3d';
import { createLighting } from './lighting';
import { isDebugEnabled } from '../../debug/enabled';
import type { Book3d } from './book3dBook';
import { flying, flyingHome, launchFlight } from './bookFlight';
import { animationNow } from '../animationClock';

/** Un livre de la pile : son nom (légende au survol), son modèle 3D, ce qu'il ouvre, comment il est posé. */
export interface PileBook {
  id: string;
  /** Relu à chaque mise à jour : la langue peut changer pendant que la pile reste à l'écran. */
  label: () => string;
  book: () => Book3d;
  onOpen: () => void;
  /** Couché, le dos vers le lecteur, de travers : tourné de tant (radians), décalé de tant (unités de scène). */
  yaw: number;
  dx: number;
  dz: number;
  /** Posé négligemment : penché de tant (radians), un bout plus haut que l'autre. */
  tilt?: number;
}

/**
 * Un objet debout contre le flanc gauche de la pile (la clé de la bibliothèque) : pas un livre, il ne
 * s'envole pas ; au clic, il ouvre sa page.
 */
export interface PileOrnament {
  id: string;
  label: () => string;
  /** Son modèle, debout, face au lecteur : le pied en y = 0, centré en x et en z. */
  model: () => THREE.Object3D;
  /** Il brille d'autant au survol (0 à 1). */
  glow: (amount: number) => void;
  onOpen: () => void;
  /** Penché de tant (radians) contre la pile ; avancé de tant vers le lecteur (unités de scène). */
  lean: number;
  dz: number;
}

/** Un objet posé sur la pile, et où il en est. */
interface Placed {
  spec: PileOrnament;
  pivot: THREE.Group;
  shown: boolean;
  away: boolean;
  glow: number;
  aim: number;
  /** Quelque chose l'attend (un livre nouveau dans la bibliothèque) : il luit doucement. */
  news: boolean;
  button: HTMLButtonElement;
}

export interface Pile3d {
  root: HTMLElement;
  /** Montre ou cache un livre (le livre étrange, trouvé plus tard) ; `arrive` : il tombe sur la pile. */
  show: (id: string, shown: boolean, arrive?: boolean) => void;
  /**
   * Le livre est ouvert devant le lecteur (sa page) : sa place dans la pile reste vide, les autres ne
   * bougent pas ; il y revient en fin de retour.
   */
  away: (id: string | null) => void;
  /** Le livre sursaute et tremble, son contour s'allume un instant (un mot s'est écrit dans le livre blanc). */
  shake: (id: string) => void;
  /**
   * Le contour du livre luit doucement tant que quelque chose l'attend (des sceaux nouveaux) ; un objet
   * posé (la clé), lui-même.
   */
  news: (id: string, on: boolean) => void;
  /** Noms des livres réécrits dans la langue courante (boutons, légende au survol). */
  relabel: () => void;
}

/** Contour doré du livre survolé : sa couleur, son épaisseur (unités de scène). */
const OUTLINE_GOLD = 0xf0c870;
const OUTLINE = 0.022;
/** Vitesse à laquelle le contour s'allume et s'éteint (par seconde). */
const GLOW_RATE = 12;
/** Sursaut : sa durée, sa hauteur, et combien il tremble (radians). */
const SHAKE_MS = 900;
const SHAKE_HOP = 0.06;
const SHAKE_ROLL = THREE.MathUtils.degToRad(4);
/** Des nouveautés : le contour luit à demi, sur ce rythme. */
const NEWS_GLOW = 0.7;
const NEWS_S = 2.6;
/** Livre qui arrive : il tombe de cette hauteur, en tant de temps. */
const ARRIVE_DROP = 1.2;
const ARRIVE_MS = 700;
/** Livres couchés l'un sur l'autre, au plus ; le suivant est posé debout à côté de la pile. */
const STACK_MAX = 4;
/** Écart entre la pile et le livre debout. */
const STAND_GAP = 0.03;
/**
 * La pile vue presque à hauteur d'yeux, un peu au-dessus (radians au-dessus de l'horizon) et un peu de
 * droite (on voit le bout des pages).
 */
const ELEVATION = THREE.MathUtils.degToRad(16);
const AZIMUTH = THREE.MathUtils.degToRad(22);

interface Slot {
  spec: PileBook;
  /** Posé au milieu du dessous du livre : il se soulève et tourne autour. */
  pivot: THREE.Group;
  /** Le contour doré : une coque un peu plus grande que le livre, vue de l'intérieur. */
  outline: THREE.MeshBasicMaterial;
  /** Le livre et son contour, tournés ensemble : couché ou debout (null : pas encore chargé). */
  body: THREE.Group | null;
  holder: THREE.Group;
  /** Debout à côté de la pile (au-delà de STACK_MAX), ou couché dessus. */
  standing: boolean;
  /** Taille du livre posé (largeur en x, hauteur en y). */
  size: THREE.Vector3;
  /** Où il est posé (le milieu de son dessous). */
  base: THREE.Vector3;
  shown: boolean;
  /** Ouvert devant le lecteur : caché, sa place gardée. */
  away: boolean;
  /** Contour (0 à 1) : où il en est, et où il va (survol). */
  glow: number;
  aim: number;
  shakeAt: number | null;
  arriveAt: number | null;
  news: boolean;
  button: HTMLButtonElement;
  /** Couverture qui vit (livre de débogage). */
  tick?: (now: number) => boolean;
}

/**
 * Les livres du joueur, dans l'en-tête : les vrais livres 3D en miniature (livre blanc, cahier d'options,
 * livre étrange), posés en vrac les uns sur les autres. Au survol, un contour doré entoure le livre ; au
 * clic, sa page s'ouvre et il y glisse vers le lecteur (bookFlight.ts). Des boutons invisibles les doublent pour le clavier.
 * Les livres sont empilés dans l'ordre de la liste, le premier en dessous ; au-delà de STACK_MAX, debout
 * à côté de la pile.
 */
export const createPile3d = (books: PileBook[], ornaments: PileOrnament[] = []): Pile3d => {
  const root = el('nav', 'pile3d');
  const canvas = el('canvas', 'pile3d-canvas');
  const caption = el('div', 'pile3d-caption');
  root.append(canvas, caption);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 30);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  renderer.shadowMap.enabled = false;
  renderer.autoClear = false;
  /**
   * Pendant un vol, les livres posés sur celui qui vole, recopiés dans un calque au-dessus de lui (la
   * pile elle-même est dessous) : il sort de sous eux, et passe au-dessus des livres de dessous.
   */
  const overlay = el('canvas', 'pile3d-overlay');
  const overlayContext = overlay.getContext('2d');
  // Les lumières de la page des livres (la vue de biais), tournées avec la caméra comme là-bas pour un livre
  // fermé : le livre qui vole de l'une à l'autre garde le même éclairage.
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));

  let dirty = true;
  const slots: Slot[] = books.map((spec) => {
    const pivot = new THREE.Group();
    scene.add(pivot);
    const button = el('button', 'pile3d-button', spec.label());
    button.addEventListener('click', () => open(slot));
    button.addEventListener('focus', () => (slot.aim = 1));
    button.addEventListener('blur', () => (slot.aim = 0));
    root.append(button);
    // Repoussé en profondeur : là où est le livre, le livre passe devant (sinon, sur un livre mince, le
    // liseré couvre sa couverture).
    const outline = new THREE.MeshBasicMaterial({
      color: OUTLINE_GOLD,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: 6,
      polygonOffsetUnits: 6,
    });
    const holder = new THREE.Group();
    pivot.add(holder);
    const slot: Slot = {
      spec,
      pivot,
      outline,
      body: null,
      holder,
      standing: false,
      size: new THREE.Vector3(),
      base: new THREE.Vector3(),
      shown: true,
      away: false,
      glow: 0,
      aim: 0,
      shakeAt: null,
      arriveAt: null,
      news: false,
      button,
    };
    const book = spec.book();
    slot.tick = book.tick;
    void book.look().then((look) => {
      const mesh = createBookMesh(book.shape, look);
      mesh.setOpen(0);
      const body = new THREE.Group();
      body.add(mesh.root);
      // Le contour : le livre recopié en or, grossi d'un rien autour de son centre, dont on ne voit que
      // l'intérieur (derrière le livre) : il dépasse tout autour, comme un liseré.
      const bounds = new THREE.Box3().setFromObject(mesh.root);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const hull = mesh.root.clone(true);
      // La souris le traverse : elle touche le livre, pas ce liseré (qui déborde sur ses voisins).
      hull.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material = outline;
          object.raycast = () => {};
        }
      });
      hull.position.sub(center);
      const shell = new THREE.Group();
      shell.add(hull);
      shell.position.copy(center);
      // Un livre mince (le cahier) ne gonfle pas en épaisseur : son liseré resterait une dalle.
      const grow = (length: number): number => 1 + (2 * Math.min(OUTLINE, length * 0.2)) / length;
      shell.scale.set(grow(size.x), grow(size.y), grow(size.z));
      body.add(shell);
      holder.add(body);
      slot.body = body;
      pose(slot, false);
      layout();
    });
    return slot;
  });

  // Les objets appuyés contre la pile (la clé) : replacés à chaque rangement.
  const placed: Placed[] = ornaments.map((spec) => {
    const pivot = new THREE.Group();
    pivot.add(spec.model());
    pivot.visible = false;
    scene.add(pivot);
    const button = el('button', 'pile3d-button', spec.label());
    button.addEventListener('click', () => spec.onOpen());
    root.append(button);
    const item: Placed = { spec, pivot, shown: true, away: false, glow: 0, aim: 0, news: false, button };
    button.addEventListener('focus', () => (item.aim = 1));
    button.addEventListener('blur', () => (item.aim = 0));
    return item;
  });
  /** Où le flanc gauche de la pile est touché à la hauteur `y`, à la profondeur `z` (null : pas de livre là). */
  const touch = new THREE.Raycaster();
  const flankAt = (stacked: Slot[], y: number, z: number): number | null => {
    touch.set(new THREE.Vector3(-10, y, z), new THREE.Vector3(1, 0, 0));
    // Comme pour la souris : seul compte ce qu'on voit (pas la feuille cachée qui dépasse du livre fermé).
    const hit = touch
      .intersectObjects(
        stacked.map((slot) => slot.pivot),
        true,
      )
      .find((candidate) => {
        for (let object: THREE.Object3D | null = candidate.object; object; object = object.parent) if (!object.visible) return false;
        return true;
      });
    return hit ? hit.point.x : null;
  };
  /**
   * Met les objets debout au pied de la pile, à gauche, penchés contre le flanc des livres, aussi près
   * que possible sans qu'aucune de leurs parties n'y rentre.
   */
  const placeOrnaments = (): void => {
    const stacked = slots.filter((slot) => slot.shown && slot.body !== null && !slot.standing);
    for (const slot of stacked) {
      slot.pivot.position.copy(slot.base);
      slot.pivot.rotation.set(0, 0, slot.spec.tilt ?? 0);
    }
    scene.updateMatrixWorld(true);
    for (const item of placed) {
      item.pivot.visible = item.shown && !item.away && stacked.length > 0;
      if (stacked.length === 0) continue;
      const { lean, dz } = item.spec;
      item.pivot.rotation.set(0, 0, 0);
      item.pivot.position.set(0, 0, 0);
      item.pivot.updateMatrixWorld(true);
      const height = new THREE.Box3().setFromObject(item.pivot.children[0]).max.y;
      // Jusqu'où l'objet debout s'étend vers la pile, à la hauteur `y` (null : rien à cette hauteur).
      const reach = (y: number): number | null => {
        touch.set(new THREE.Vector3(10, y, 0), new THREE.Vector3(-1, 0, 0));
        const hit = touch
          .intersectObject(item.pivot, true)
          .find((candidate) => candidate.object instanceof THREE.Mesh && (candidate.object.material as THREE.Material).visible);
        return hit ? hit.point.x : null;
      };
      // Penché, chacun de ses points (r, y) passe en (r cos + y sin, y cos − r sin) : le pied est reculé
      // jusqu'à ce qu'aucun ne rentre dans un livre (l'anneau, plus large que la tige, compris).
      const [cos, sin] = [Math.cos(lean), Math.sin(lean)];
      let foot = Infinity;
      for (let y = 0.01; y < height; y += 0.01) {
        const right = reach(y);
        if (right === null) continue;
        const flank = flankAt(stacked, y * cos - right * sin, dz);
        if (flank !== null) foot = Math.min(foot, flank - right * cos - y * sin);
      }
      // Rien touché (pile trop basse, ou décalée) : au pied du livre le plus à gauche.
      if (!Number.isFinite(foot)) foot = Math.min(...stacked.map((slot) => slot.base.x - slot.size.x / 2)) - height * sin;
      item.pivot.position.set(foot, 0, dz);
      item.pivot.rotation.set(0, 0, -lean);
    }
  };

  /**
   * Couche le livre (la couverture vers le haut) ou le met debout, le dos vers le lecteur, un peu de
   * travers ; le milieu de son dessous sur le pivot.
   */
  function pose(slot: Slot, standing: boolean): void {
    const { body, holder } = slot;
    if (!body) return;
    slot.standing = standing;
    body.rotation.x = standing ? 0 : -Math.PI / 2;
    holder.position.set(0, 0, 0);
    holder.rotation.y = Math.PI / 2 + slot.spec.yaw;
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body.children[0]);
    holder.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    box.getSize(slot.size);
  }
  /** Empile les livres montrés (STACK_MAX au plus), met le suivant debout à côté, et cadre le tout. */
  function layout(): void {
    let y = 0;
    let stacked = 0;
    let right = 0;
    const standing: Slot[] = [];
    for (const slot of slots) {
      slot.pivot.visible = slot.shown && !slot.away && slot.body !== null;
      if (!slot.shown || slot.body === null) continue;
      const stand = stacked >= STACK_MAX;
      if (stand !== slot.standing) pose(slot, stand);
      if (stand) {
        standing.push(slot);
        continue;
      }
      stacked += 1;
      slot.base.set(slot.spec.dx, y, slot.spec.dz);
      y += slot.size.y;
      right = Math.max(right, slot.spec.dx + slot.size.x / 2);
    }
    for (const slot of standing) {
      slot.base.set(right + STAND_GAP + slot.size.x / 2, 0, slot.spec.dz);
      right += STAND_GAP + slot.size.x;
    }
    for (const slot of slots) slot.pivot.position.copy(slot.base);
    placeOrnaments();
    fit();
    dirty = true;
  }
  /** La caméra, un peu au-dessus et de face : toute la pile tient dans le canvas. */
  const fit = (): void => {
    const box = new THREE.Box3();
    // Un livre ouvert ailleurs compte quand même : la pile ne se recadre pas sans lui.
    for (const slot of slots) if (slot.shown && slot.body) box.expandByObject(slot.body);
    for (const item of placed) if (item.pivot.visible) box.expandByObject(item.pivot);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = (sphere.radius * 0.62) / Math.sin(Math.min(half, Math.atan(Math.tan(half) * camera.aspect)));
    const flat = distance * Math.cos(ELEVATION);
    camera.position.set(
      sphere.center.x + flat * Math.sin(AZIMUTH),
      sphere.center.y + distance * Math.sin(ELEVATION),
      sphere.center.z + flat * Math.cos(AZIMUTH),
    );
    camera.lookAt(sphere.center);
    lighting.follow(camera, sphere.center, 1);
  };

  // Survol : un contour doré ; au clic, le livre s'ouvre.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: Slot | null = null;
  const slotAt = (event: MouseEvent): Slot | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Le rayon touche aussi les objets cachés (la feuille qui tourne, masquée dans un livre fermé, qui
    // dépasse du livre) : seul compte ce qu'on voit.
    const hit = raycaster
      .intersectObjects(
        slots.filter((slot) => slot.pivot.visible).map((slot) => slot.pivot),
        true,
      )
      .find((candidate) => {
        for (let object: THREE.Object3D | null = candidate.object; object; object = object.parent) if (!object.visible) return false;
        return true;
      });
    return slots.find((slot) => hit && slot.pivot.getObjectById(hit.object.id)) ?? null;
  };
  const hover = (slot: Slot | null): void => {
    if (hovered === slot) return;
    if (hovered) hovered.aim = 0;
    hovered = slot;
    if (slot) slot.aim = 1;
    canvas.style.cursor = slot ? 'pointer' : '';
    caption.textContent = slot?.spec.label() ?? '';
    caption.classList.toggle('shown', slot !== null);
  };
  /** L'objet posé sous la souris (il est sur les livres : il passe avant eux). */
  const ornamentAt = (event: MouseEvent): Placed | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const shown = placed.filter((item) => item.pivot.visible);
    const [hit] = raycaster.intersectObjects(
      shown.map((item) => item.pivot),
      true,
    );
    return shown.find((item) => hit && item.pivot.getObjectById(hit.object.id)) ?? null;
  };
  let hoveredOrnament: Placed | null = null;
  const hoverOrnament = (item: Placed | null): void => {
    if (hoveredOrnament === item) return;
    if (hoveredOrnament) hoveredOrnament.aim = 0;
    hoveredOrnament = item;
    if (item) item.aim = 1;
    canvas.style.cursor = item ? 'pointer' : '';
    caption.textContent = item?.spec.label() ?? '';
    caption.classList.toggle('shown', item !== null);
  };
  canvas.addEventListener('pointermove', (event) => {
    const item = ornamentAt(event);
    if (item) {
      hover(null);
      hoverOrnament(item);
    } else {
      hoverOrnament(null);
      hover(slotAt(event));
    }
  });
  canvas.addEventListener('pointerleave', () => {
    hoverOrnament(null);
    hover(null);
  });
  canvas.addEventListener('click', (event) => {
    const item = ornamentAt(event);
    if (item) return item.spec.onOpen();
    const slot = slotAt(event);
    if (slot) open(slot);
  });

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  /**
   * Clic sur un livre : sa page s'ouvre, le livre part d'ici (même place à l'écran, même angle) et glisse
   * vers le lecteur en grandissant.
   */
  function open(slot: Slot): void {
    if (slot.away) return;
    const mesh = slot.body?.children[0];
    if (mesh && !still.matches) {
      slot.outline.opacity = 0;
      launchFlight(slot.spec.id, mesh, camera, canvas);
    }
    wanted = slot.spec.id;
    applyAway();
    slot.spec.onOpen();
  }

  /**
   * Dessine la pile ; `flight` : un livre vole. Les livres posés sur lui (plus haut dans la
   * pile) sont d'abord dessinés seuls et recopiés dans le calque du dessus, puis le reste dans la pile.
   */
  const draw = (flight: boolean): void => {
    const away = !flight ? undefined : slots.find((slot) => slot.away && slot.shown && !slot.standing);
    const above = away ? slots.filter((slot) => slot.pivot.visible && !slot.standing && slots.indexOf(slot) > slots.indexOf(away)) : [];
    if (above.length > 0 && overlayContext) {
      const below = slots.filter((slot) => slot.pivot.visible && !above.includes(slot));
      for (const slot of below) slot.pivot.visible = false;
      renderer.clear();
      renderer.render(scene, camera);
      const rect = canvas.getBoundingClientRect();
      Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      if (overlay.width !== canvas.width || overlay.height !== canvas.height)
        [overlay.width, overlay.height] = [canvas.width, canvas.height];
      overlayContext.clearRect(0, 0, overlay.width, overlay.height);
      overlayContext.drawImage(canvas, 0, 0);
      if (!overlay.isConnected) document.body.append(overlay);
      for (const slot of below) slot.pivot.visible = true;
      for (const slot of above) slot.pivot.visible = false;
      renderer.clear();
      renderer.render(scene, camera);
      for (const slot of above) slot.pivot.visible = true;
      return;
    }
    overlay.remove();
    renderer.clear();
    renderer.render(scene, camera);
  };
  let wasFlying = false;
  let before = animationNow();
  let mounted = false;
  const frame = (frameTime: number): void => {
    const now = animationNow(frameTime);
    // Pile retirée (autre écran) : son contexte WebGL est rendu tout de suite.
    if (!root.isConnected) {
      if (mounted) return destroy(scene);
    } else mounted = true;
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    // Un livre vole vers une page ou en revient : la pile est redessinée tant qu'il vole (sa place en creux).
    const flight = flying();
    let moving = flight || wasFlying;
    wasFlying = flight;
    // Vol fini : le livre revenu reprend sa place.
    applyAway();
    /** Où en est une animation lancée à `at`, de durée `ms` (null : finie, ou pas lancée). */
    const progress = (at: number | null, ms: number): number | null => (at === null || still.matches ? null : Math.min(1, (now - at) / ms));
    /** La lueur de ce qui attend le joueur : elle monte et descend lentement (fixe si l'animation est coupée). */
    const newsGlow = (on: boolean): number =>
      on ? (still.matches ? NEWS_GLOW : NEWS_GLOW * (0.5 - 0.5 * Math.cos((now / 1000 / NEWS_S) * 2 * Math.PI))) : 0;
    for (const slot of slots) {
      if (!slot.pivot.visible) continue;
      const aim = Math.max(slot.aim, newsGlow(slot.news));
      slot.glow = still.matches ? aim : slot.glow + (aim - slot.glow) * Math.min(1, dt * GLOW_RATE);
      if (Math.abs(aim - slot.glow) > 0.002 || (slot.news && !still.matches)) moving = true;
      else slot.glow = aim;
      // Sursaut : il se soulève d'un rien, tremble, et retombe ; son contour s'allume.
      let flash = 0;
      let hop = 0;
      let roll = 0;
      const shaking = progress(slot.shakeAt, SHAKE_MS);
      if (shaking === null || shaking >= 1) slot.shakeAt = null;
      else {
        flash = Math.sin(Math.PI * shaking);
        hop = SHAKE_HOP * Math.sin(Math.PI * shaking);
        roll = SHAKE_ROLL * Math.sin(shaking * 6 * Math.PI) * (1 - shaking);
        moving = true;
      }
      let drop = 0;
      const arriving = progress(slot.arriveAt, ARRIVE_MS);
      if (arriving === null || arriving >= 1) slot.arriveAt = null;
      else {
        drop = ARRIVE_DROP * (1 - arriving) ** 3;
        moving = true;
      }
      slot.outline.opacity = Math.max(slot.glow, flash);
      // Penché, il tourne autour du milieu de son dessous : relevé d'autant, son bout bas ne rentre pas
      // dans le livre du dessous.
      const tilt = slot.standing ? 0 : (slot.spec.tilt ?? 0);
      const rest = (slot.size.x / 2) * Math.sin(Math.abs(tilt));
      slot.pivot.rotation.set(0, 0, roll + tilt);
      slot.pivot.position.set(slot.base.x, slot.base.y + rest + drop + hop, slot.base.z);
    }
    for (const item of placed) {
      if (!item.pivot.visible) continue;
      const aim = Math.max(item.aim, newsGlow(item.news));
      item.glow = still.matches ? aim : item.glow + (aim - item.glow) * Math.min(1, dt * GLOW_RATE);
      if (Math.abs(aim - item.glow) > 0.002 || (item.news && !still.matches)) moving = true;
      else item.glow = aim;
      item.spec.glow(item.glow);
    }
    for (const slot of slots) if (slot.shown && slot.tick?.(now)) dirty = true;
    if (resize()) {
      fit();
      dirty = true;
    }
    if (moving || dirty) {
      draw(flight);
      dirty = false;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /** Le livre dont la page est ouverte (demandé par l'en-tête). */
  let wanted: string | null = null;
  /**
   * Cache le livre ouvert, sa place gardée ; un livre qui retourne à la pile reste caché jusqu'à ce qu'il
   * y soit (le jeu revient à l'écran pendant son vol), même si un autre en part entre-temps.
   */
  function applyAway(): void {
    const hidden = new Set(flyingHome());
    if (wanted) hidden.add(wanted);
    let changed = false;
    for (const slot of slots) {
      const away = hidden.has(slot.spec.id);
      if (slot.away === away) continue;
      slot.away = away;
      slot.button.disabled = away;
      if (hovered === slot) hover(null);
      changed = true;
    }
    for (const item of placed) {
      const away = hidden.has(item.spec.id);
      if (item.away === away) continue;
      item.away = away;
      item.button.disabled = away;
      if (hoveredOrnament === item) hoverOrnament(null);
      changed = true;
    }
    if (changed) layout();
  }
  const find = (id: string): Slot | undefined => slots.find((slot) => slot.spec.id === id);
  const pile: Pile3d = {
    root,
    show: (id, shown, arrive = false) => {
      const item = placed.find((candidate) => candidate.spec.id === id);
      if (item) {
        if (item.shown === shown) return;
        item.shown = shown;
        item.button.hidden = !shown;
        return layout();
      }
      const slot = find(id);
      if (!slot || slot.shown === shown) return;
      slot.shown = shown;
      slot.button.hidden = !shown;
      if (shown && arrive) slot.arriveAt = animationNow();
      layout();
    },
    away: (id) => {
      wanted = id;
      applyAway();
    },
    shake: (id) => {
      const slot = find(id);
      if (slot) slot.shakeAt = animationNow();
    },
    news: (id, on) => {
      const slot = find(id);
      if (slot) slot.news = on;
      const item = placed.find((candidate) => candidate.spec.id === id);
      if (item) item.news = on;
    },
    relabel: () => {
      for (const slot of slots) {
        const label = slot.spec.label();
        if (slot.button.textContent !== label) slot.button.textContent = label;
      }
      for (const item of placed) {
        const label = item.spec.label();
        if (item.button.textContent !== label) item.button.textContent = label;
      }
      if (hovered) caption.textContent = hovered.spec.label();
      if (hoveredOrnament) caption.textContent = hoveredOrnament.spec.label();
    },
  };
  // Débogage : la pile depuis la console (window.pile3d.shake('white')…), ?debug seulement.
  if (isDebugEnabled()) (window as unknown as { pile3d?: Pile3d }).pile3d = pile;
  return pile;
};
