import * as THREE from 'three';
import { el } from '../dom';
import { createBookMesh } from './bookMesh';
import { pileLook } from './pileLook';
import { createBookRenderer } from './renderer3d';
import { createLighting } from './lighting';
import { isDebugEnabled } from '../../debug/enabled';
import { oldWood } from '../library/oldWood';
import type { Book3d } from './book3dBook';
import { flyingHome, launchFlight } from './bookFlight';
import { animationNow } from '../animationClock';

/** Un livre du rebord : son nom (écrit dessous), son modèle 3D, ce qu'il ouvre. */
export interface ShelfBook {
  id: string;
  /** Relu à chaque mise à jour : la langue peut changer pendant que le rebord reste à l'écran. */
  label: () => string;
  book: () => Book3d;
  onOpen: () => void;
  /** Couleur de son contour (survol, lueur), si elle n'est pas dorée : le violet de l'Etherium. */
  outline?: number;
}

/**
 * Un objet posé sur le rebord, pas un livre (il ne s'envole pas) ; au clic, il ouvre sa page. `end` : debout au bout
 * de la planche, son nom dessous (la clé) ; `against` : appuyé au pied de ce livre, devant sa couverture, son nom au
 * survol seulement, à la place de celui du livre (le jeton des tâches, contre le livre blanc).
 */
export interface ShelfOrnament {
  id: string;
  label: () => string;
  /** Son modèle, debout, face au lecteur : le pied en y = 0, centré en x et en z. */
  model: () => THREE.Object3D;
  /** Il brille d'autant au survol (0 à 1). */
  glow: (amount: number) => void;
  onOpen: () => void;
  place: { end: true } | { against: string; scale: number };
}

export interface Shelf3d {
  root: HTMLElement;
  /** Montre ou cache un livre (le Grand Livre, trouvé plus tard) ; `arrive` : il tombe sur la planche. */
  show: (id: string, shown: boolean, arrive?: boolean) => void;
  /** Le livre est ouvert devant le lecteur (sa page) : sa place reste vide, les autres ne bougent pas. */
  away: (id: string | null) => void;
  /** Le livre sursaute et tremble, son contour s'allume un instant (un mot s'est écrit dans le livre blanc). */
  shake: (id: string) => void;
  /** Le contour du livre luit doucement tant que quelque chose l'attend ; un objet posé (la clé), lui-même. */
  news: (id: string, on: boolean) => void;
  /** Noms réécrits dans la langue courante. */
  relabel: () => void;
}

/** Contour doré du livre survolé : sa couleur, son épaisseur (unités de scène). */
const OUTLINE_GOLD = 0xf0c870;
const OUTLINE = 0.022;
/** Vitesse à laquelle le contour s'allume et s'éteint, et le livre se soulève (par seconde). */
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

/**
 * Les mesures de la maquette validée (.ai/maquette-menus.html, piste P1, l'auteur, 21/10), en pixels de l'écran : le plus
 * haut des livres fait 74 de haut, 10 d'écart entre deux places (une place : le livre, ou son nom s'il est plus large),
 * 10 de marge au bout de la planche ; il se soulève de 5 au survol ; planche de 7 d'épaisseur ; nom 5 sous elle.
 * Téléphone : tout à 0,75.
 */
const BOOK_PX = 74;
const GAP_PX = 10;
const PAD_PX = 10;
const LIFT_PX = 5;
const PLANK_PX = 7;
const NAME_GAP_PX = 5;
const NAME_PX = 13;
/** Place laissée au-dessus des livres (le soulèvement, le sursaut). */
const TOP_PX = 12;
const PHONE = window.matchMedia('(max-width: 760px)');
/** La planche : sa profondeur (unités de scène), le bois de la vitrine. */
const PLANK_DEPTH = 0.36;
const PLANK_WOOD = 0xc8a080;
/** Les livres, le dos contre le fond de la planche. */
const BACK_Z = 0.04;
/** Vus de face, d'un rien au-dessus et de droite (on devine l'épaisseur des livres). */
const ELEVATION = THREE.MathUtils.degToRad(5);
const AZIMUTH = THREE.MathUtils.degToRad(7);
const FOV = 22;
/** Le clou de la clé : une tête de laiton, au haut de son anneau. */
const NAIL_RADIUS = 0.025;

/**
 * La boîte de ce qu'on voit d'un modèle : sans ses zones invisibles, plus larges, faites pour la souris, ni la feuille
 * cachée d'un livre fermé (elle dépasse du livre).
 */
const visibleBox = (model: THREE.Object3D): THREE.Box3 => {
  const box = new THREE.Box3();
  model.updateWorldMatrix(true, true);
  model.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((material) => material.visible)) box.expandByObject(object, true);
  });
  return box;
};

interface Slot {
  spec: ShelfBook;
  pivot: THREE.Group;
  outline: THREE.MeshBasicMaterial;
  /** Le livre et son contour (null : pas encore chargé). */
  body: THREE.Group | null;
  /** Taille du livre debout (largeur x, hauteur y, épaisseur z). */
  size: THREE.Vector3;
  /** Où il est posé (le milieu du bas de sa couverture). */
  base: THREE.Vector3;
  shown: boolean;
  away: boolean;
  /** Contour (0 à 1) : où il en est, et où il va (survol, lueur). */
  glow: number;
  aim: number;
  /** Soulevé au survol (0 à 1). */
  lift: number;
  hovered: boolean;
  shakeAt: number | null;
  arriveAt: number | null;
  news: boolean;
  button: HTMLButtonElement;
  name: HTMLElement;
  tick?: (now: number) => boolean;
}

interface Placed {
  spec: ShelfOrnament;
  pivot: THREE.Group;
  shown: boolean;
  away: boolean;
  glow: number;
  aim: number;
  news: boolean;
  button: HTMLButtonElement;
  /** Son nom sous lui (au bout de la planche) ; appuyé contre un livre : aucun. */
  name: HTMLElement | null;
  /** Largeur de son modèle (unités de scène). */
  width: number;
}

/**
 * Les livres du joueur, en haut à droite : debout côte à côte sur une planche (le bois de la vitrine), la couverture vers
 * le lecteur, leur nom écrit dessous (l'auteur, 21/10 : la pile en vrac était devenue brouillon). Au survol, le livre se
 * soulève, un contour doré l'entoure ; au clic, sa page s'ouvre et il y glisse vers le lecteur (bookFlight.ts). Des
 * boutons invisibles les doublent pour le clavier. Dans l'ordre de la liste, de gauche à droite ; la clé au bout.
 */
export const createShelf3d = (books: ShelfBook[], ornaments: ShelfOrnament[] = []): Shelf3d => {
  const root = el('nav', 'shelf3d');
  const canvas = el('canvas', 'shelf3d-canvas');
  const names = el('div', 'shelf3d-names');
  /** Le nom d'un objet appuyé contre un livre (le jeton), sous celui du livre, au survol. */
  const hint = el('span', 'shelf3d-name shelf3d-hint');
  hint.hidden = true;
  names.append(hint);
  root.append(canvas, names);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  const { renderer, destroy } = createBookRenderer(canvas, camera);
  renderer.shadowMap.enabled = false;
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));

  let dirty = true;
  /** Le rangement est à refaire (un livre chargé, montré, caché ; un nom qui change de largeur ; l'écran). */
  let unsorted = true;

  const plankGeometry = new THREE.BoxGeometry(1, 1, PLANK_DEPTH);
  // Le fil du bois dans la longueur de la planche (comme les étagères couchées de la vitrine).
  const uv = plankGeometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getY(index), uv.getX(index));
  const plank = new THREE.Mesh(
    plankGeometry,
    oldWood('shelf-plank', { length: 4, color: PLANK_WOOD }, () => (dirty = true)),
  );
  scene.add(plank);

  const slots: Slot[] = books.map((spec) => {
    const pivot = new THREE.Group();
    scene.add(pivot);
    const button = el('button', 'shelf3d-button', spec.label());
    button.addEventListener('click', () => open(slot));
    button.addEventListener('focus', () => ((slot.hovered = true), (slot.aim = 1)));
    button.addEventListener('blur', () => ((slot.hovered = false), (slot.aim = 0)));
    root.append(button);
    const name = el('span', 'shelf3d-name', spec.label());
    names.append(name);
    // Repoussé en profondeur : là où est le livre, le livre passe devant (sinon, sur un livre mince, le liseré couvre sa
    // couverture).
    const outline = new THREE.MeshBasicMaterial({
      color: spec.outline ?? OUTLINE_GOLD,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: 6,
      polygonOffsetUnits: 6,
    });
    const slot: Slot = {
      spec,
      pivot,
      outline,
      body: null,
      size: new THREE.Vector3(),
      base: new THREE.Vector3(),
      shown: true,
      away: false,
      glow: 0,
      aim: 0,
      lift: 0,
      hovered: false,
      shakeAt: null,
      arriveAt: null,
      news: false,
      button,
      name,
    };
    const book = spec.book();
    slot.tick = book.tick;
    void book.look().then((look) => {
      const mesh = createBookMesh(book.shape, pileLook(look));
      mesh.setOpen(0);
      // Debout, la couverture vers le lecteur (le dos à gauche) : le milieu du bas de la couverture sur le pivot.
      const bounds = visibleBox(mesh.root);
      const center = bounds.getCenter(new THREE.Vector3());
      bounds.getSize(slot.size);
      mesh.root.position.set(-center.x, -bounds.min.y, -bounds.max.z);
      const body = new THREE.Group();
      body.add(mesh.root);
      // Le contour : le livre recopié en or, grossi d'un rien autour de son centre, dont on ne voit que l'intérieur.
      const hull = mesh.root.clone(true);
      hull.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material = outline;
          object.raycast = () => {};
        }
      });
      const middle = new THREE.Vector3(0, slot.size.y / 2, -slot.size.z / 2);
      hull.position.sub(middle);
      const shell = new THREE.Group();
      shell.add(hull);
      shell.position.copy(middle);
      // Un livre mince (le cahier) ne gonfle pas en épaisseur : son liseré resterait une dalle.
      const grow = (length: number): number => 1 + (2 * Math.min(OUTLINE, length * 0.2)) / length;
      shell.scale.set(grow(slot.size.x), grow(slot.size.y), grow(slot.size.z));
      body.add(shell);
      pivot.add(body);
      slot.body = body;
      unsorted = true;
    });
    return slot;
  });

  const placed: Placed[] = ornaments.map((spec) => {
    const pivot = new THREE.Group();
    const model = spec.model();
    pivot.add(model);
    const box = visibleBox(model);
    // Posé sur la planche : le bas de ce qu'on voit en y = 0.
    model.position.y -= box.min.y;
    box.translate(new THREE.Vector3(0, -box.min.y, 0));
    if ('against' in spec.place) pivot.scale.setScalar(spec.place.scale);
    // La clé pendue à son clou : une tête de laiton au haut de son anneau.
    if ('end' in spec.place) {
      const nail = new THREE.Mesh(
        new THREE.SphereGeometry(NAIL_RADIUS, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a7350, metalness: 0.5, roughness: 0.4 }),
      );
      nail.position.set(0, box.max.y - NAIL_RADIUS * 2.2, -0.04);
      pivot.add(nail);
    }
    pivot.visible = false;
    scene.add(pivot);
    const button = el('button', 'shelf3d-button', spec.label());
    button.addEventListener('click', () => spec.onOpen());
    root.append(button);
    let name: HTMLElement | null = null;
    if ('end' in spec.place) {
      name = el('span', 'shelf3d-name', spec.label());
      names.append(name);
    }
    const item: Placed = {
      spec,
      pivot,
      shown: true,
      away: false,
      glow: 0,
      aim: 0,
      news: false,
      button,
      name,
      width: box.max.x - box.min.x,
    };
    button.addEventListener('focus', () => (item.aim = 1));
    button.addEventListener('blur', () => (item.aim = 0));
    return item;
  });

  /** Pixels de l'écran par unité de scène : le plus haut des livres fait BOOK_PX. */
  let scale = 1;
  let width = 0;
  let height = 0;

  /**
   * Range les livres montrés de gauche à droite (une place : le livre, ou son nom s'il est plus large), la clé au bout,
   * le jeton contre son livre ; taille le canvas et cadre la caméra.
   */
  function sort(): void {
    if (!root.isConnected) return;
    const k = PHONE.matches ? 0.75 : 1;
    const loaded = slots.filter((slot) => slot.body !== null);
    if (loaded.length === 0) return;
    const tallest = Math.max(1e-3, ...loaded.map((slot) => slot.size.y));
    scale = (BOOK_PX * k) / tallest;
    let x = PAD_PX * k;
    const spaced: { center: number; name: HTMLElement | null }[] = [];
    const room = (objectPx: number, name: HTMLElement | null): number => {
      const place = Math.max(objectPx, name ? name.offsetWidth : 0);
      const center = x + place / 2;
      x += place + GAP_PX * k;
      return center;
    };
    let plankDepth = 0;
    for (const slot of slots) {
      const on = slot.shown && slot.body !== null;
      slot.pivot.visible = on && !slot.away;
      slot.name.hidden = !on;
      if (!on) continue;
      const center = room(slot.size.x * scale, slot.name);
      slot.base.set(center / scale, 0, BACK_Z + slot.size.z);
      spaced.push({ center, name: slot.name });
      plankDepth = Math.max(plankDepth, slot.size.z);
    }
    for (const item of placed) {
      const { place } = item.spec;
      if ('end' in place) {
        const on = item.shown && loaded.length > 0;
        item.pivot.visible = on && !item.away;
        if (item.name) item.name.hidden = !on;
        if (!on) continue;
        const center = room(item.width * scale, item.name);
        item.pivot.position.set(center / scale, 0, BACK_Z + 0.05);
      }
    }
    // Les objets appuyés contre un livre : au pied de sa couverture, à droite, penchés contre elle.
    for (const item of placed) {
      const { place } = item.spec;
      if (!('against' in place)) continue;
      const host = slots.find((slot) => slot.spec.id === place.against);
      const on = item.shown && host !== undefined && host.shown && host.body !== null;
      item.pivot.visible = on && !item.away && !host!.away;
      if (!on || !host) continue;
      const radius = (item.width * place.scale) / 2;
      item.pivot.position.set(host.base.x + host.size.x / 2 - radius * 0.7, 0, host.base.z + 0.02);
      item.pivot.rotation.set(-0.18, 0, 0);
    }
    const total = x - GAP_PX * k + PAD_PX * k;
    width = Math.max(1, Math.round(total));
    height = Math.round((TOP_PX + BOOK_PX + PLANK_PX) * k);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const units = width / scale;
    const plankHigh = (PLANK_PX * k) / scale;
    plank.scale.set(units, plankHigh, 1);
    plank.position.set(units / 2, -plankHigh / 2, PLANK_DEPTH / 2 - 0.02);
    // La caméra : à une distance où une unité fait `scale` pixels au plan des couvertures, face au milieu du rebord.
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * scale);
    const target = new THREE.Vector3(units / 2, (height / 2 - PLANK_PX * k) / scale, BACK_Z + plankDepth);
    camera.position.set(
      target.x + distance * Math.cos(ELEVATION) * Math.sin(AZIMUTH),
      target.y + distance * Math.sin(ELEVATION),
      target.z + distance * Math.cos(ELEVATION) * Math.cos(AZIMUTH),
    );
    camera.lookAt(target);
    lighting.follow(camera, target, 1);
    // Les noms, sous la planche, centrés sur leur place.
    names.style.width = `${width}px`;
    names.style.height = `${NAME_PX * k}px`;
    names.style.marginTop = `${NAME_GAP_PX * k}px`;
    for (const { center, name } of spaced) if (name) name.style.left = `${center}px`;
    for (const item of placed) if (item.name && !item.name.hidden) item.name.style.left = `${item.pivot.position.x * scale}px`;
    unsorted = false;
    dirty = true;
  }
  PHONE.addEventListener('change', () => (unsorted = true));

  // Survol : le livre se soulève, un contour doré ; au clic, il s'ouvre.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const aimAt = (event: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  };
  /** Le premier objet visible touché parmi `pivots`. */
  const hitOf = (pivots: THREE.Object3D[]): THREE.Intersection | undefined =>
    raycaster.intersectObjects(pivots, true).find((candidate) => {
      for (let object: THREE.Object3D | null = candidate.object; object; object = object.parent) if (!object.visible) return false;
      return true;
    });
  const slotAt = (): Slot | null => {
    const shown = slots.filter((slot) => slot.pivot.visible);
    const hit = hitOf(shown.map((slot) => slot.pivot));
    return shown.find((slot) => hit && slot.pivot.getObjectById(hit.object.id)) ?? null;
  };
  /** L'objet sous la souris (le jeton est devant son livre : il passe avant lui). */
  const ornamentAt = (): Placed | null => {
    const shown = placed.filter((item) => item.pivot.visible);
    const hit = hitOf(shown.map((item) => item.pivot));
    return shown.find((item) => hit && item.pivot.getObjectById(hit.object.id)) ?? null;
  };
  let hovered: Slot | null = null;
  let hoveredOrnament: Placed | null = null;
  const hover = (slot: Slot | null, item: Placed | null): void => {
    if (hovered !== slot) {
      if (hovered) ((hovered.aim = 0), (hovered.hovered = false));
      hovered = slot;
      if (slot) ((slot.aim = 1), (slot.hovered = true));
    }
    if (hoveredOrnament !== item) {
      if (hoveredOrnament) hoveredOrnament.aim = 0;
      hoveredOrnament = item;
      if (item) item.aim = 1;
      relabel();
    }
    canvas.style.cursor = slot || item ? 'pointer' : '';
  };
  canvas.addEventListener('pointermove', (event) => {
    aimAt(event);
    const item = ornamentAt();
    hover(item ? null : slotAt(), item);
  });
  canvas.addEventListener('pointerleave', () => hover(null, null));
  canvas.addEventListener('click', (event) => {
    aimAt(event);
    const item = ornamentAt();
    if (item) return item.spec.onOpen();
    const slot = slotAt();
    if (slot) open(slot);
  });

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** Clic sur un livre : sa page s'ouvre, le livre part d'ici (même place à l'écran, même angle) vers le lecteur. */
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

  let before = animationNow();
  let mounted = false;
  let size = '';
  const frame = (frameTime: number): void => {
    const now = animationNow(frameTime);
    // Rebord retiré (autre écran) : son contexte WebGL est rendu tout de suite.
    if (!root.isConnected) {
      if (mounted) return destroy(scene);
    } else mounted = true;
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    applyAway();
    if (unsorted) sort();
    let moving = false;
    const progress = (at: number | null, ms: number): number | null => (at === null || still.matches ? null : Math.min(1, (now - at) / ms));
    /** La lueur de ce qui attend le joueur : elle monte et descend lentement (fixe si l'animation est coupée). */
    const newsGlow = (on: boolean): number =>
      on ? (still.matches ? NEWS_GLOW : NEWS_GLOW * (0.5 - 0.5 * Math.cos((now / 1000 / NEWS_S) * 2 * Math.PI))) : 0;
    const ease = (from: number, to: number): number => (still.matches ? to : from + (to - from) * Math.min(1, dt * GLOW_RATE));
    for (const slot of slots) {
      if (!slot.pivot.visible) continue;
      const aim = Math.max(slot.aim, newsGlow(slot.news));
      slot.glow = ease(slot.glow, aim);
      if (Math.abs(aim - slot.glow) > 0.002 || (slot.news && !still.matches)) moving = true;
      else slot.glow = aim;
      const raise = slot.hovered ? 1 : 0;
      slot.lift = ease(slot.lift, raise);
      if (Math.abs(raise - slot.lift) > 0.002) moving = true;
      else slot.lift = raise;
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
      slot.pivot.rotation.set(0, 0, roll);
      const lift = (slot.lift * LIFT_PX * (PHONE.matches ? 0.75 : 1)) / scale;
      slot.pivot.position.set(slot.base.x, slot.base.y + lift + drop + hop, slot.base.z);
    }
    for (const item of placed) {
      if (!item.pivot.visible) continue;
      const aim = Math.max(item.aim, newsGlow(item.news));
      item.glow = ease(item.glow, aim);
      if (Math.abs(aim - item.glow) > 0.002 || (item.news && !still.matches)) moving = true;
      else item.glow = aim;
      item.spec.glow(item.glow);
    }
    for (const slot of slots) if (slot.shown && slot.tick?.(now)) dirty = true;
    const drawn = `${width}x${height}`;
    if (drawn !== size && width > 0) {
      size = drawn;
      renderer.setSize(width, height, false);
      dirty = true;
    }
    if (moving || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /** Le livre dont la page est ouverte (demandé par l'en-tête). */
  let wanted: string | null = null;
  /** Cache le livre ouvert, sa place gardée ; un livre qui revient reste caché jusqu'à ce qu'il soit arrivé. */
  function applyAway(): void {
    const hidden = new Set(flyingHome());
    if (wanted) hidden.add(wanted);
    for (const slot of slots) {
      const away = hidden.has(slot.spec.id);
      if (slot.away === away) continue;
      slot.away = away;
      slot.button.disabled = away;
      slot.name.classList.toggle('away', away);
      if (hovered === slot) hover(null, hoveredOrnament);
      unsorted = true;
    }
    for (const item of placed) {
      const away = hidden.has(item.spec.id);
      if (item.away === away) continue;
      item.away = away;
      item.button.disabled = away;
      if (hoveredOrnament === item) hover(hovered, null);
      unsorted = true;
    }
  }
  /** Les noms ; celui d'un objet appuyé contre un livre s'écrit sous le nom du livre, le temps du survol. */
  function relabel(): void {
    for (const slot of slots) {
      const label = slot.spec.label();
      if (slot.button.textContent !== label) slot.button.textContent = label;
      if (slot.name.textContent !== label) {
        slot.name.textContent = label;
        unsorted = true;
      }
    }
    for (const item of placed) {
      const label = item.spec.label();
      if (item.button.textContent !== label) item.button.textContent = label;
      if (item.name && item.name.textContent !== label) {
        item.name.textContent = label;
        unsorted = true;
      }
    }
    const leaning = hoveredOrnament && 'against' in hoveredOrnament.spec.place ? hoveredOrnament : null;
    const host = leaning && 'against' in leaning.spec.place ? find(leaning.spec.place.against) : undefined;
    hint.hidden = !leaning || !host;
    if (leaning && host) {
      hint.textContent = leaning.spec.label();
      hint.style.left = host.name.style.left;
    }
  }
  const find = (id: string): Slot | undefined => slots.find((slot) => slot.spec.id === id);
  const shelf: Shelf3d = {
    root,
    show: (id, shown, arrive = false) => {
      const item = placed.find((candidate) => candidate.spec.id === id);
      if (item) {
        if (item.shown === shown) return;
        item.shown = shown;
        item.button.hidden = !shown;
        unsorted = true;
        return;
      }
      const slot = find(id);
      if (!slot || slot.shown === shown) return;
      slot.shown = shown;
      slot.button.hidden = !shown;
      if (shown && arrive) slot.arriveAt = animationNow();
      unsorted = true;
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
    relabel,
  };
  // Débogage : le rebord depuis la console (window.shelf3d.shake('white')…), ?debug seulement.
  if (isDebugEnabled()) (window as unknown as { shelf3d?: Shelf3d }).shelf3d = shelf;
  return shelf;
};
