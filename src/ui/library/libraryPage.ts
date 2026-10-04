import './library.css';
import * as THREE from 'three';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { RARE_BOOKS } from '../../data/rareBooks';
import { isRareBookFound } from '../../systems/rareBooks';
import { firstBookKept } from '../../systems/books';
import { sealEvent } from '../../systems/seals';
import { keptBook3d } from '../book3d/handBook3d';
import { createBookMesh } from '../book3d/bookMesh';
import { createBookRenderer } from '../book3d/renderer3d';
import { createLighting } from '../book3d/lighting';
import { flying, flyingHome, launchFlight } from '../book3d/bookFlight';
import { visibleBox } from '../book3d/visibleBox';
import { rareBook3d } from '../rareBooks/rareBook3d';
import { rareBookArt } from '../rareBooks/arts';
import { DEBUG_CELL, FILL_ORDER, FINAL_CELL, FRONT, MORE_FILL_ORDER, createBookcase } from './bookcase3d';
import { finalBook3d } from '../finalBook/finalBook3d';
import { debugBook3d } from '../../debug/book/debugBook3d';
import type { Book3d } from '../book3d/book3dBook';
import { addCellLights } from './cellLights';
import { layoutBookcase, type ShelfPlace } from './shelfLayout';
import { shelfLook } from './shelfLook';
import type { GameState } from '../../core/state';
import { animationNow } from '../animationClock';

/**
 * Le livre de débogage : un livre rare (10× plus rare), rangé dans sa case à lui ; il ne s'ouvre qu'en mode
 * ?debug, où il est toujours dans la vitrine.
 */
export const LIBRARY_DEBUG_BOOK = 'debug';
/** Le premier livre lu, gardé par le chercheur : sa première trouvaille, la première place de la vitrine. */
export const LIBRARY_FIRST_BOOK = 'first';
/** Le livre des crédits : pas tiré comme les livres rares, il est dans la bibliothèque dès le début. */
export const LIBRARY_CREDITS_BOOK = 'credits';
/** Le livre de la fin (la partie racontée) : pendant le développement, seulement en mode ?debug, seul dans sa case. */
export const LIBRARY_FINAL_BOOK = 'final';

/**
 * Le livre de la vitrine `id` : le premier livre lu, ou un livre rare. Le livre de débogage, en mode ?debug :
 * le vrai (son catalogue) ; sinon, son charabia qui bugue. Le premier livre, relu jusqu'au bout et refermé : un secret.
 */
export const shelfBook3d = (state: GameState, id: string, debugging: boolean): Book3d =>
  id === LIBRARY_FIRST_BOOK
    ? { ...keptBook3d(state, 0), finished: () => sealEvent(state, 'reread') }
    : id === LIBRARY_DEBUG_BOOK && debugging
      ? debugBook3d()
      : id === LIBRARY_FINAL_BOOK
        ? finalBook3d(state)
        : rareBook3d(state, id);

/** Le livre qui vole de la vitrine à sa page (et retour) : son nom dans bookFlight. */
export const libraryFlightId = (id: string): string => `library:${id}`;

/**
 * Un livre survolé sort de sa case de tant (vers le lecteur), un livre debout bascule en plus par le
 * haut, comme tiré du doigt ; à cette vitesse (par seconde).
 */
const PULL = 0.22;
const TIP = THREE.MathUtils.degToRad(9);
const PULL_RATE = 10;
/** Air laissé entre le dos des livres et le bord de la case. */
const SET_BACK = 0.03;
/** La lumière de la pièce, baissée d'autant devant les spots des cases. */
const ROOM_DIM = 0.6;
/**
 * D'où vient la lumière qui porte les ombres des livres : d'en haut et de devant, comme celle des spots des
 * cases ; à cette distance du milieu de la vitrine.
 */
const SHADOW_FROM = new THREE.Vector3(0, 1, 1).normalize();
const SHADOW_DISTANCE = 8;
/** Épaisseur d'un livre rare qui ne dit pas la sienne (rareBook3d.ts). */
const THICKNESS = 0.12;

interface Place {
  spot: ShelfPlace;
  /** Où il pivote : debout, son coin bas-droit-avant (pour pencher) ; couché, le milieu de son dessous à l'avant. */
  pivot: THREE.Vector3;
  /** Le livre posé (null : place vide, ou pas encore chargé). */
  holder: THREE.Group | null;
  /** Le livre lui-même (ce qui s'envole). */
  book: THREE.Object3D | null;
  /** Sorti de sa case (0 à 1) : où il en est, où il va. */
  pull: number;
  aim: number;
  /** Sa couverture bouge-t-elle (true : l'image est à refaire) ? */
  tick?: (now: number) => boolean;
}

/**
 * La bibliothèque personnelle (#bibliotheque) : la vitrine du chercheur, un meuble aux cases de toutes
 * tailles où les livres rares trouvés sont rangés en bazar organisé, debout ou couchés, le dos vers le lecteur
 * (shelfLayout.ts), chacun à la première place libre une fois trouvé. Au survol, un livre sort un
 * peu de sa case et son nom s'écrit sous lui, sur le bord de l'étagère ; au clic, il s'envole vers sa page (`onOpen`), comme les
 * livres de la pile, et y revient au retour. Pièce à part : elle ne se vide jamais.
 */
export interface LibraryPage extends Component {
  /**
   * Un de ses livres (`id`) est ouvert par-dessus : la vitrine reste en fond, floue, sa place vide, et ne
   * répond plus ; null : elle revient au premier plan.
   */
  setBackdrop: (id: string | null) => void;
}

export const createLibraryPage = (
  state: GameState,
  onOpen: (id: string) => void,
  onBack: () => void,
  /** Mode ?debug : le livre de débogage est toujours dans la vitrine, et s'ouvre. */
  debugging: boolean,
): LibraryPage => {
  const root = el('main', 'library-page');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', onBack);
  const stage = el('div', 'library-stage');
  const canvas = el('canvas', 'library-canvas');
  const caption = el('div', 'library-caption');
  stage.append(canvas, caption);
  root.append(back, stage);

  let dirty = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  const bookcase = createBookcase(() => (dirty = true));
  scene.add(bookcase.root);
  const { center } = bookcase;
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));
  // La lampe qui porte les ombres : réglée pour un livre, ses ombres sont élargies à toute la vitrine (sinon,
  // un cadre plus clair découpe la vitrine). Elle est placée comme les spots des cases (shadowLamp).
  const shadowLamp = scene.getObjectsByProperty('isDirectionalLight', true).find((light) => light.castShadow) as THREE.DirectionalLight;
  const reach = Math.max(bookcase.size.x, bookcase.size.y) * 0.75;
  Object.assign(shadowLamp.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, far: 40 });
  shadowLamp.shadow.camera.updateProjectionMatrix();
  // Une lampe au-dessus de la vitrine, un peu devant : les dos des livres et les étiquettes accrochent la lumière.
  const lamp = new THREE.SpotLight(0xffd9a0, 18, 14, THREE.MathUtils.degToRad(40), 0.6, 1.4);
  lamp.position.set(0, bookcase.size.y + 1.4, 3);
  lamp.target.position.copy(center);
  scene.add(lamp, lamp.target);
  // La pièce s'assombrit : ce sont les spots des cases qui font briller la vitrine.
  scene.traverse((object) => {
    if (object instanceof THREE.Light) object.intensity *= ROOM_DIM;
  });
  const cellLights = addCellLights(bookcase.root, bookcase.cells);

  const thickness = (id: string): number => (id === LIBRARY_FIRST_BOOK ? THICKNESS : (rareBookArt(id).thickness ?? THICKNESS));
  // Les livres trouvés, dans l'ordre où ils l'ont été : chacun à la première place libre. Le livre des
  // crédits, là dès le début, puis le premier livre lu, passent avant tous les livres rares.
  const found = [
    LIBRARY_CREDITS_BOOK,
    ...(firstBookKept(state) ? [LIBRARY_FIRST_BOOK] : []),
    ...RARE_BOOKS.map(({ id }) => id)
      .filter((id) => id !== LIBRARY_DEBUG_BOOK && isRareBookFound(state, id))
      .sort((a, b) => state.rareBooks[a] - state.rareBooks[b]),
  ];
  const debugShelf =
    debugging || isRareBookFound(state, LIBRARY_DEBUG_BOOK)
      ? layoutBookcase([{ id: LIBRARY_DEBUG_BOOK, thickness: THICKNESS }], bookcase.cells, [DEBUG_CELL])
      : [];
  const finalShelf = debugging ? layoutBookcase([{ id: LIBRARY_FINAL_BOOK, thickness: THICKNESS }], bookcase.cells, [FINAL_CELL]) : [];
  const places: Place[] = [
    ...layoutBookcase(
      found.map((id) => ({ id, thickness: thickness(id) })),
      bookcase.cells,
      FILL_ORDER,
      MORE_FILL_ORDER,
    ),
    ...debugShelf,
    ...finalShelf,
  ].map((spot) => {
    const cell = bookcase.cells[spot.cell];
    const floor = new THREE.Vector2(cell.left + cell.width / 2, cell.floor);
    const z = FRONT - SET_BACK - spot.depth;
    const pivot =
      spot.pose === 'stand'
        ? new THREE.Vector3(floor.x + spot.x + spot.width, floor.y + spot.y, z)
        : new THREE.Vector3(floor.x + spot.x, floor.y + spot.y, z);
    return { spot, pivot, holder: null, book: null, pull: 0, aim: 0 };
  });
  // Les livres trouvés : leur vrai modèle, chargé à part (couvertures, polices).
  for (const place of places) {
    const book = shelfBook3d(state, place.spot.id, debugging);
    place.tick = book.tick;
    void book.look().then((look) => {
      if (!root.isConnected && mounted) return;
      const mesh = createBookMesh(book.shape, shelfLook(look, place.spot));
      mesh.setOpen(0);
      const standing = place.spot.pose === 'stand';
      // Le dos vers le lecteur : debout, ou couché sur le plat (tourné d'un quart de tour dans son plan).
      const turn = new THREE.Group();
      mesh.root.rotation.y = Math.PI / 2;
      turn.add(mesh.root);
      if (!standing) turn.rotation.z = Math.PI / 2;
      const tilt = new THREE.Group();
      tilt.add(turn);
      tilt.updateMatrixWorld(true);
      const box = visibleBox(mesh.root);
      // Debout : son coin bas-droit-avant au pivot ; couché : le milieu de son dessous, à l'avant.
      turn.position.set(standing ? -box.max.x : -(box.min.x + box.max.x) / 2, -box.min.y, -box.max.z);
      tilt.rotation.set(0, place.spot.yaw, -place.spot.lean);
      mesh.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
      });
      const holder = new THREE.Group();
      holder.add(tilt);
      holder.position.copy(place.pivot);
      cellLights.light(holder);
      scene.add(holder);
      place.holder = holder;
      place.book = mesh.root;
      dirty = true;
    });
  }

  /** La caméra en face de la vitrine, à hauteur de son milieu : toute la vitrine tient dans le canvas. */
  const fit = (): void => {
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const tall = (bookcase.size.y / 2) * 1.08;
    const wide = (bookcase.size.x / 2) * 1.12;
    const distance = Math.max(tall / Math.tan(half), wide / (Math.tan(half) * camera.aspect)) + bookcase.size.z / 2;
    camera.position.set(0, center.y, distance);
    camera.lookAt(center);
    lighting.follow(camera, center, 1);
    // La lumière qui porte les ombres vient d'en haut et de devant, comme celle des spots des cases (qui n'en
    // portent pas) : un livre tiré de sa case pose son ombre derrière lui et vers le bas, pas sur le côté.
    const rig = shadowLamp.parent!;
    rig.updateMatrixWorld(true);
    shadowLamp.position.copy(rig.worldToLocal(center.clone().addScaledVector(SHADOW_FROM, SHADOW_DISTANCE)));
    shadowLamp.target.position.copy(rig.worldToLocal(center.clone()));
  };

  /** Le nom du livre survolé, posé sur le bord avant de son étagère, au milieu du livre. */
  const placeCaption = (): void => {
    if (!hovered?.holder) return;
    const box = visibleBox(hovered.holder);
    const at = new THREE.Vector3((box.min.x + box.max.x) / 2, bookcase.cells[hovered.spot.cell].floor, FRONT).project(camera);
    caption.style.left = `${((at.x + 1) / 2) * 100}%`;
    caption.style.top = `${((1 - at.y) / 2) * 100}%`;
  };

  // Survol : le livre sort de sa case, son nom s'écrit sous lui.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: Place | null = null;
  /** Le livre ouvert par-dessus la vitrine : sa place reste vide jusqu'à ce qu'il y soit revenu. */
  let opened: string | null = null;
  const placeAt = (event: MouseEvent): Place | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Seul compte ce qu'on voit (pas la feuille cachée d'un livre fermé, qui dépasse de lui).
    const shown = places.filter((place) => place.holder?.visible);
    const hit = raycaster
      .intersectObjects(
        shown.map((place) => place.holder!),
        true,
      )
      .find((candidate) => {
        for (let object: THREE.Object3D | null = candidate.object; object; object = object.parent) if (!object.visible) return false;
        return true;
      });
    return shown.find((place) => hit && place.holder!.getObjectById(hit.object.id)) ?? null;
  };
  const label = ({ spot: { id } }: Place): string =>
    id === LIBRARY_FIRST_BOOK ? t('ui.firstBook') : id === LIBRARY_FINAL_BOOK ? t('finalBook.title') : t(`rareBooks.${id}.name`);
  const hover = (place: Place | null): void => {
    if (hovered === place) return;
    if (hovered) hovered.aim = 0;
    hovered = place;
    if (place?.holder) place.aim = 1;
    canvas.style.cursor = place?.holder ? 'pointer' : '';
    if (place) caption.textContent = label(place);
    placeCaption();
    caption.classList.toggle('shown', place !== null);
  };
  canvas.addEventListener('pointermove', (event) => hover(placeAt(event)));
  canvas.addEventListener('pointerleave', () => hover(null));
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  canvas.addEventListener('click', (event) => {
    const place = placeAt(event);
    if (!place?.holder || !place.book) return;
    // Il part de sa place dans sa case, tel qu'on le voit (sorti à moitié) : la page reprend ce départ.
    if (!still.matches) launchFlight(libraryFlightId(place.spot.id), place.book, camera, canvas);
    place.holder.visible = false;
    opened = place.spot.id;
    onOpen(place.spot.id);
  });

  let before = animationNow();
  let mounted = false;
  let wasFlying = false;
  const frame = (frameTime: number): void => {
    const now = animationNow(frameTime);
    if (!root.isConnected) {
      if (mounted) return destroy(scene);
    } else mounted = true;
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    // Un livre qui revient de sa page : sa place reste vide jusqu'à ce qu'il y soit.
    const home = new Set(flyingHome());
    const flight = flying();
    let moving = flight || wasFlying;
    wasFlying = flight;
    for (const place of places) {
      if (!place.holder) continue;
      if (place.holder.visible && place.tick?.(now)) moving = true;
      const away = home.has(libraryFlightId(place.spot.id)) || opened === place.spot.id;
      if (place.holder.visible === away) {
        place.holder.visible = !away;
        moving = true;
      }
      const pull = still.matches ? place.aim : place.pull + (place.aim - place.pull) * Math.min(1, dt * PULL_RATE);
      place.pull = Math.abs(place.aim - pull) < 0.002 ? place.aim : pull;
      if (place.pull !== place.aim) moving = true;
      place.holder.position.z = place.pivot.z + PULL * place.pull;
      if (place.spot.pose === 'stand') place.holder.rotation.x = TIP * place.pull;
    }
    if (resize()) {
      fit();
      placeCaption();
      dirty = true;
    }
    if (moving || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return {
    root,
    setBackdrop: (id) => {
      if (id) hover(null);
      // Au retour, le livre est déjà en vol vers sa place (flyingHome) : elle reste vide jusqu'à son arrivée.
      opened = id;
      root.classList.toggle('backdrop', id !== null);
      dirty = true;
    },
    update: () => {
      back.textContent = `← ${t('ui.back')}`;
      if (hovered) caption.textContent = label(hovered);
    },
  };
};
