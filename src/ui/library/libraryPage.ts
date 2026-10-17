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
import { CORNICE_FRONT, CORNICE_MIDDLE, DEBUG_CELL, FILL_ORDER, FRONT, MORE_FILL_ORDER, createBookcase } from './bookcase3d';
import { finalBook3d } from '../finalBook/finalBook3d';
import { debugBook3d } from '../../debug/book/debugBook3d';
import type { Book3d } from '../book3d/book3dBook';
import { addCellLights } from './cellLights';
import { createRelicShelf } from '../relics/relicShelf';
import { createCartouche, cartoucheText } from './cartouche';
import { RELICS } from '../../data/relics';
import { relicFound } from '../../systems/relics';
import type { RelicId } from '../../data/relics';
import { layoutBookcase, type ShelfPlace } from './shelfLayout';
import { shelfLook } from './shelfLook';
import type { GameState } from '../../core/state';
import { animationNow } from '../animationClock';
import { TRUE_STORY_BOOK } from '../../data/trueStory';
import { storyBribes } from '../../systems/etherium';
import { writeDigits } from '../../core/format';
import { ENDING_TOMES, fakeEndingsFound } from '../../systems/endings';
import { relicEnvironment } from '../relics/relicModels';
import {
  EASEL_LEAN,
  EASEL_LIP,
  ENDINGS_DEPTH,
  ENDINGS_HEIGHT,
  LOW_FLOOR,
  STAND_FLOOR,
  TOME_FLOOR,
  TOME_FRONT,
  createEndingsShelf,
} from './endingsShelf3d';
import { createTome, type Tome } from './endingsTome';
import { TOMES } from '../../data/sagaTomes';
import { createLotteryMachine } from './lotteryMachine3d';
import { drawResults } from './lotteryText';
import { lastLotteryDraw, settleLottery, startLottery } from '../../systems/lottery';
import { GLIDE_MS, glideEase, rememberView, rememberedView, shotOf, type LibraryView, type Shot } from './libraryViews';

/**
 * Le livre de débogage : un livre rare (10× plus rare), rangé dans sa case à lui ; il ne s'ouvre qu'en mode
 * ?debug, où il est toujours dans la vitrine.
 */
export const LIBRARY_DEBUG_BOOK = 'debug';
/** Le premier livre lu, gardé par le chercheur : sa première trouvaille, la première place de la vitrine. */
export const LIBRARY_FIRST_BOOK = 'first';
/** Le livre des crédits : pas tiré comme les livres rares, il est dans la bibliothèque dès le début. */
export const LIBRARY_CREDITS_BOOK = 'credits';
/**
 * Le livre de la fin (la partie racontée), le vrai : pendant le développement, seulement en mode ?debug. En haut du meuble
 * des fins, de face sur le chevalet (l'auteur, 16/10) ; il n'est pas de la collection « La Vraie Fin ».
 */
export const LIBRARY_FINAL_BOOK = 'final';
/**
 * « Qui j'étais » (d'abord « Mon histoire vraie »), la fausse fin (14/10) : dès la première étoile du Rideau, elle est le
 * tome 1 du meuble des fins, sur la tranche, qu'on la lise encore ou qu'elle soit finie (le haut est au vrai livre, l'auteur,
 * 16/10). Prise, elle arrive fermée, comme les autres livres (l'auteur, 17/10).
 */
export const LIBRARY_STORY_BOOK = TRUE_STORY_BOOK;
/** « Mon histoire vraie » est dans le meuble des fins : une étoile du Rideau au moins est allumée. */
export const storyShelved = (state: GameState): boolean => storyBribes(state) > 0;

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
/** Le livre du chevalet, survolé, avance moins qu'un livre tiré de sa case. */
const EASEL_PULL = 0.08;
/**
 * Le meuble des fins et la machine de la Loterie, à gauche de la vitrine (la maquette les pose à 9 de la vitrine : le meuble
 * à -0,95 de ce point, la machine à +1,15 et un peu en avant).
 */
const ENDINGS_X = -9;
const ENDINGS_SHELF_X = ENDINGS_X - 0.95;
const MACHINE_AT = new THREE.Vector3(ENDINGS_X + 1.15, 0, 0.15);

interface Place {
  id: string;
  /** Sa place dans une case de la vitrine (pas pour le meuble des fins). */
  spot?: ShelfPlace;
  /** Où il pivote : debout, son coin bas-droit-avant (pour pencher) ; couché, le milieu de son dessous à l'avant. */
  pivot: THREE.Vector3;
  /** Debout, il bascule par le haut quand on le tire ; de combien il sort de sa case. */
  tip: boolean;
  reach: number;
  /** Le bord d'étagère où s'écrit son nom (hauteur). */
  floor: number;
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
   * Un livre est ouvert par-dessus (`backdrop`) : la vitrine reste en fond, floue, et ne répond plus ; l'un
   * des siens (`id`) y laisse sa place vide. Faux : elle revient au premier plan.
   */
  setBackdrop: (backdrop: boolean, id?: string) => void;
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
  // Les flèches d'un meuble à l'autre : à gauche sur la vitrine (vers le meuble des fins), à droite sur le meuble des fins.
  const toEndings = el('button', 'library-arrow left', '‹');
  const toLibrary = el('button', 'library-arrow right', '›');
  const arrowTitles = (): void => {
    for (const [arrow, key] of [
      [toEndings, 'ui.endings.toEndings'],
      [toLibrary, 'ui.endings.toLibrary'],
    ] as const) {
      arrow.title = t(key);
      arrow.setAttribute('aria-label', t(key));
    }
  };
  arrowTitles();
  stage.append(canvas, caption, toEndings, toLibrary);
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
  // Le meuble des fins et la machine (maquette du 16/10) : la même lampe au-dessus, une autre, plus douce, sur la machine.
  const endings = createEndingsShelf(ENDINGS_SHELF_X, () => (dirty = true));
  scene.add(endings.root);
  const environment = relicEnvironment(renderer);
  endings.brass.envMap = environment;
  endings.brass.envMapIntensity = 0.25;
  const machine = createLotteryMachine(
    { sign: () => t('ui.lottery.sign'), jackpot: () => t('ui.lottery.jackpot') },
    environment,
    () => state.lottery.tokens,
    () => {
      const plan = startLottery(state);
      return (
        plan && {
          reels: plan.reels,
          // Les rouleaux sont arrêtés : le tirage compte (la boucle du jeu l'a peut-être compté juste avant).
          settle: () => {
            const draw = settleLottery(state, Math.random, Date.now(), true) ?? lastLotteryDraw();
            return draw ? drawResults(draw) : [];
          },
        }
      );
    },
  );
  machine.root.position.copy(MACHINE_AT);
  scene.add(machine.root);
  // Cinzel peut arriver après le premier dessin des panneaux.
  void document.fonts?.load("600 40px 'Cinzel'").then(() => {
    if (root.isConnected || !mounted) machine.relabel();
    dirty = true;
  });
  const endingsCenter = new THREE.Vector3(ENDINGS_X, ENDINGS_HEIGHT / 2, 0);
  const endingsLamp = new THREE.SpotLight(0xffd9a0, 18, 14, THREE.MathUtils.degToRad(40), 0.6, 1.4);
  endingsLamp.position.set(ENDINGS_X, ENDINGS_HEIGHT + 1.4, 3);
  endingsLamp.target.position.copy(endingsCenter);
  const machineLamp = new THREE.SpotLight(0xffc98a, 6, 6, THREE.MathUtils.degToRad(28), 0.8, 1.6);
  machineLamp.position.set(MACHINE_AT.x, ENDINGS_HEIGHT + 0.6, 1.6);
  machineLamp.target.position.set(MACHINE_AT.x, 1.4, 0.3);
  scene.add(endingsLamp, endingsLamp.target, machineLamp, machineLamp.target);
  // La pièce s'assombrit : ce sont les spots des cases qui font briller la vitrine.
  scene.traverse((object) => {
    if (object instanceof THREE.Light) object.intensity *= ROOM_DIM;
  });
  const cellLights = addCellLights(bookcase.root, bookcase.cells);
  // Les reliques trouvées, dans leurs petites cases (12/10).
  const relics = createRelicShelf(state, scene, bookcase.cells, cellLights, environment, () => (dirty = true));

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
  // Le cartouche de la corniche : les livres rangés (le livre de débogage, s'il a été trouvé), les reliques.
  const cartouche = createCartouche(() => (dirty = true));
  const shelfText = (): string =>
    cartoucheText(
      found.length + (isRareBookFound(state, LIBRARY_DEBUG_BOOK) ? 1 : 0),
      RELICS.filter((relic) => relicFound(state, relic.id)).length,
    );
  cartouche.mesh.position.set(0, bookcase.size.y - CORNICE_MIDDLE, CORNICE_FRONT);
  bookcase.root.add(cartouche.mesh);
  cartouche.write(shelfText());
  // Celui du meuble des fins : les fausses fins trouvées, sur onze (« 1/11 »).
  const endingsText = (): string => writeDigits(`${fakeEndingsFound(state)}/${ENDING_TOMES}`);
  endings.cartouche.write(endingsText());
  const debugShelf =
    debugging || isRareBookFound(state, LIBRARY_DEBUG_BOOK)
      ? layoutBookcase([{ id: LIBRARY_DEBUG_BOOK, thickness: THICKNESS }], bookcase.cells, [DEBUG_CELL])
      : [];
  const shelfPlaces: Place[] = [
    ...layoutBookcase(
      found.map((id) => ({ id, thickness: thickness(id) })),
      bookcase.cells,
      FILL_ORDER,
      MORE_FILL_ORDER,
    ),
    ...debugShelf,
  ].map((spot) => {
    const cell = bookcase.cells[spot.cell];
    const floor = new THREE.Vector2(cell.left + cell.width / 2, cell.floor);
    const z = FRONT - SET_BACK - spot.depth;
    const pivot =
      spot.pose === 'stand'
        ? new THREE.Vector3(floor.x + spot.x + spot.width, floor.y + spot.y, z)
        : new THREE.Vector3(floor.x + spot.x, floor.y + spot.y, z);
    return {
      id: spot.id,
      spot,
      pivot,
      tip: spot.pose === 'stand',
      reach: PULL,
      floor: cell.floor,
      holder: null,
      book: null,
      pull: 0,
      aim: 0,
    };
  });
  // Le meuble des fins : en haut sur le chevalet, le vrai livre (?debug) ; en bas, « Mon histoire vraie », tome 1.
  const endingsAt = (local: THREE.Vector3): THREE.Vector3 => local.clone().add(endings.root.position);
  const easelPlaces: Place[] = debugging
    ? [
        {
          id: LIBRARY_FINAL_BOOK,
          pivot: endingsAt(EASEL_LIP),
          tip: false,
          reach: EASEL_PULL,
          floor: STAND_FLOOR,
          holder: null,
          book: null,
          pull: 0,
          aim: 0,
        },
      ]
    : [];
  const storyPlaces: Place[] = storyShelved(state)
    ? [
        {
          id: LIBRARY_STORY_BOOK,
          pivot: endingsAt(new THREE.Vector3(TOMES[0].x, TOME_FLOOR, TOME_FRONT)),
          tip: true,
          reach: PULL,
          floor: LOW_FLOOR,
          holder: null,
          book: null,
          pull: 0,
          aim: 0,
        },
      ]
    : [];
  const places = [...shelfPlaces, ...easelPlaces, ...storyPlaces];
  // Le tome 1, rangé : un dos de la collection (son bandeau, son numéro), comme dans la maquette.
  let tome: Tome | null = null;
  if (storyPlaces[0]) {
    const place = storyPlaces[0];
    tome = createTome(0, t('ui.endings.collection'), () => (dirty = true));
    tome.mesh.position.set(0, 0, 0);
    const holder = new THREE.Group();
    holder.add(tome.mesh);
    holder.position.copy(place.pivot);
    endings.cellLights.light(holder);
    scene.add(holder);
    place.holder = holder;
    place.book = tome.anchor;
    // Great Vibes peut arriver après le premier dessin.
    void document.fonts?.load("400 40px 'Great Vibes'").then(() => tome?.rename(t('ui.endings.collection')));
  }
  // Les livres trouvés : leur vrai modèle, chargé à part (couvertures, polices).
  for (const place of shelfPlaces) {
    const spot = place.spot!;
    const book = shelfBook3d(state, spot.id, debugging);
    place.tick = book.tick;
    void book.look().then((look) => {
      if (!root.isConnected && mounted) return;
      const mesh = createBookMesh(book.shape, shelfLook(look, spot));
      mesh.setOpen(0);
      const standing = spot.pose === 'stand';
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
      tilt.rotation.set(0, spot.yaw, -spot.lean);
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
  // Le vrai livre : de face, sa couverture vers le lecteur, penché contre le chevalet, sur sa lèvre.
  if (easelPlaces[0]) {
    const place = easelPlaces[0];
    const book = shelfBook3d(state, LIBRARY_FINAL_BOOK, debugging);
    place.tick = book.tick;
    const easelSpot: ShelfPlace = {
      id: LIBRARY_FINAL_BOOK,
      cell: -1,
      pose: 'stand',
      x: 0,
      y: 0,
      width: 0,
      depth: 0,
      yaw: 0,
      lean: EASEL_LEAN,
    };
    void book.look().then((look) => {
      if (!root.isConnected && mounted) return;
      const mesh = createBookMesh(book.shape, shelfLook(look, easelSpot));
      mesh.setOpen(0);
      const box = visibleBox(mesh.root);
      // Le milieu de son dessous, la couverture à l'avant.
      mesh.root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -box.max.z);
      mesh.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
      });
      const tilt = new THREE.Group();
      tilt.rotation.x = -EASEL_LEAN;
      tilt.add(mesh.root);
      const holder = new THREE.Group();
      holder.add(tilt);
      holder.position.copy(place.pivot);
      endings.cellLights.light(holder);
      scene.add(holder);
      place.holder = holder;
      place.book = mesh.root;
      dirty = true;
    });
  }

  /** Ce que la caméra cadre devant chaque meuble : la vitrine entière ; le meuble des fins et la machine (maquette). */
  const framing = (name: LibraryView) =>
    name === 'library'
      ? { center, tall: (bookcase.size.y / 2) * 1.08, wide: (bookcase.size.x / 2) * 1.12, depth: bookcase.size.z }
      : {
          center: new THREE.Vector3(ENDINGS_X + 0.1, ENDINGS_HEIGHT / 2, 0),
          tall: (ENDINGS_HEIGHT / 2) * 1.1,
          wide: 2.0 * 1.1,
          depth: ENDINGS_DEPTH,
        };
  let view: LibraryView = rememberedView();
  let glide: { from: Shot; to: Shot; start: number } | null = null;
  /** La caméra entre deux vues (`k` de 0 à 1), à hauteur de leur milieu, et les lumières qui la suivent. */
  const aim = (to: Shot, k: number, from: Shot = to): void => {
    const look = from.center.clone().lerp(to.center, k);
    camera.position.copy(from.position).lerp(to.position, k);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    lighting.follow(camera, look, 1);
    // La lumière qui porte les ombres vient d'en haut et de devant, comme celle des spots des cases (qui n'en
    // portent pas) : un livre tiré de sa case pose son ombre derrière lui et vers le bas, pas sur le côté.
    const rig = shadowLamp.parent!;
    rig.updateMatrixWorld(true);
    shadowLamp.position.copy(rig.worldToLocal(look.clone().addScaledVector(SHADOW_FROM, SHADOW_DISTANCE)));
    shadowLamp.target.position.copy(rig.worldToLocal(look.clone()));
  };
  /** La caméra en face du meuble qu'on regarde, à hauteur de son milieu : tout le meuble tient dans le canvas. */
  const fit = (): void => aim(shotOf(camera, framing(view)), 1);
  const showArrows = (): void => {
    toEndings.hidden = view !== 'library';
    toLibrary.hidden = view !== 'endings';
  };
  showArrows();
  let glideEnd: ReturnType<typeof setTimeout> | undefined;
  /** Glisse d'un meuble à l'autre : la caméra file de côté et se pose devant le nouveau. */
  const go = (name: LibraryView): void => {
    if (view === name) return;
    hover(null);
    glide = { from: shotOf(camera, framing(view)), to: shotOf(camera, framing(name)), start: animationNow() };
    view = name;
    rememberView(name);
    showArrows();
    // La fin du glissement à la minuterie (onglet caché : requestAnimationFrame y est gelé) ; un demi-tour avant la fin
    // annule celle du glissement d'avant.
    clearTimeout(glideEnd);
    glideEnd = setTimeout(() => {
      if (!glide || !root.isConnected) return;
      glide = null;
      fit();
      renderer.render(scene, camera);
    }, GLIDE_MS + 50);
  };
  toEndings.addEventListener('click', () => go('endings'));
  toLibrary.addEventListener('click', () => go('library'));

  /** Le nom du livre survolé, posé sur le bord avant de son étagère, au milieu du livre. */
  const placeCaption = (): void => {
    if (!hovered?.holder) return;
    const box = visibleBox(hovered.holder);
    const at = new THREE.Vector3((box.min.x + box.max.x) / 2, hovered.floor, FRONT).project(camera);
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
  const label = ({ id }: Place): string =>
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
  // Une relique survolée : sa légende (son nom, ce qu'elle donne, si elle agit), sur le bord de son étagère.
  let hoveredRelic: RelicId | null = null;
  const relicAt = (event: MouseEvent): RelicId | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return relics.at(raycaster);
  };
  const relicCaption = (): void => {
    if (!hoveredRelic) return;
    const { name, line } = relics.caption(hoveredRelic);
    if (caption.dataset.relic !== `${name}|${line}`) {
      caption.dataset.relic = `${name}|${line}`;
      caption.replaceChildren(name, Object.assign(document.createElement('i'), { textContent: line }));
    }
    const at = relics.anchor(hoveredRelic).project(camera);
    caption.style.left = `${((at.x + 1) / 2) * 100}%`;
    caption.style.top = `${((1 - at.y) / 2) * 100}%`;
  };
  const hoverRelic = (id: RelicId | null): void => {
    if (id) hover(null);
    if (hoveredRelic === id) return relicCaption();
    hoveredRelic = id;
    delete caption.dataset.relic;
    canvas.style.cursor = id ? 'pointer' : '';
    relicCaption();
    caption.classList.toggle('shown', id !== null);
  };
  /** Le levier ou le bouton rouge de la machine, sous la souris. */
  const handleAt = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return view === 'endings' && !glide ? machine.handleAt(raycaster) : null;
  };
  canvas.addEventListener('pointermove', (event) => {
    if (glide) return;
    if (handleAt(event)) {
      hoverRelic(null);
      hover(null);
      canvas.style.cursor = 'pointer';
      return;
    }
    const relic = relicAt(event);
    hoverRelic(relic);
    if (!relic) hover(placeAt(event));
  });
  canvas.addEventListener('pointerleave', () => {
    hoverRelic(null);
    hover(null);
  });
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  canvas.addEventListener('click', (event) => {
    if (glide) return;
    const handle = handleAt(event);
    if (handle) return machine.press(handle, animationNow());
    const relic = relicAt(event);
    if (relic) return relics.choose(relic);
    const place = placeAt(event);
    if (!place?.holder || !place.book) return;
    // Il part de sa place dans sa case, tel qu'on le voit (sorti à moitié) : la page reprend ce départ.
    if (!still.matches) launchFlight(libraryFlightId(place.id), place.book, camera, canvas);
    place.holder.visible = false;
    opened = place.id;
    onOpen(place.id);
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
      const away = home.has(libraryFlightId(place.id)) || opened === place.id;
      if (place.holder.visible === away) {
        place.holder.visible = !away;
        moving = true;
      }
      const pull = still.matches ? place.aim : place.pull + (place.aim - place.pull) * Math.min(1, dt * PULL_RATE);
      place.pull = Math.abs(place.aim - pull) < 0.002 ? place.aim : pull;
      if (place.pull !== place.aim) moving = true;
      place.holder.position.z = place.pivot.z + place.reach * place.pull;
      if (place.tip) place.holder.rotation.x = TIP * place.pull;
    }
    if (glide) {
      const k = Math.min(1, (now - glide.start) / GLIDE_MS);
      aim(glide.to, glideEase(k), glide.from);
      if (k >= 1) glide = null;
      moving = true;
    }
    // La machine : son levier, son bouton, ses ampoules (seulement quand on la voit).
    if ((view === 'endings' || glide) && machine.tick(now)) moving = true;
    // Le temps qui reste avant de pouvoir changer de relique avance dans sa légende.
    relicCaption();
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

  /** Ce que montrent la machine et le tome, au dernier dessin (update). */
  let shownLabels = '';
  return {
    root,
    setBackdrop: (backdrop, id) => {
      if (backdrop) hover(null);
      // Au retour, le livre est déjà en vol vers sa place (flyingHome) : elle reste vide jusqu'à son arrivée.
      opened = id ?? null;
      root.classList.toggle('backdrop', backdrop);
      dirty = true;
    },
    update: () => {
      back.textContent = `← ${t('ui.back')}`;
      cartouche.write(shelfText());
      endings.cartouche.write(endingsText());
      // La boucle appelle update dix fois par seconde : la machine et le tome ne se redessinent (la scène avec) que si
      // leurs textes ou les jetons ont changé.
      const labels = `${t('ui.lottery.sign')}|${t('ui.endings.collection')}|${state.lottery.tokens}`;
      if (labels !== shownLabels) {
        shownLabels = labels;
        machine.relabel();
        tome?.rename(t('ui.endings.collection'));
        dirty = true;
      }
      arrowTitles();
      if (hovered) caption.textContent = label(hovered);
    },
  };
};
