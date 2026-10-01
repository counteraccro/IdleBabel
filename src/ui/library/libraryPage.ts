import './library.css';
import * as THREE from 'three';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { RARE_BOOKS } from '../../data/rareBooks';
import { isRareBookFound } from '../../systems/rareBooks';
import { createBookMesh } from '../book3d/bookMesh';
import { createBookRenderer } from '../book3d/renderer3d';
import { createLighting } from '../book3d/lighting';
import { flying, flyingHome, launchFlight } from '../book3d/bookFlight';
import { rareBook3d } from '../rareBooks/rareBook3d';
import { createCabinet, type CabinetSlot } from './cabinet3d';
import type { GameState } from '../../core/state';

/** Le livre qui vole de la vitrine à sa page (et retour) : son nom dans bookFlight. */
export const libraryFlightId = (id: string): string => `library:${id}`;

/**
 * Un livre survolé sort du rang de tant (vers le lecteur) et bascule par le haut, comme tiré du doigt,
 * à cette vitesse (par seconde).
 */
const PULL = 0.22;
const TIP = THREE.MathUtils.degToRad(9);
const PULL_RATE = 10;
/** Air laissé entre le dos des livres et le bord du rayon. */
const SET_BACK = 0.03;

interface Place {
  /** Le livre rare de cette place (dans l'ordre de data/rareBooks.ts). */
  id: string;
  slot: CabinetSlot;
  found: boolean;
  /** Le livre debout, le dos vers le lecteur (null : place vide, ou pas encore chargé). */
  holder: THREE.Group | null;
  /** Ce que touche la souris : la place entière, vide ou non. */
  hit: THREE.Mesh;
  /** Sorti du rang (0 à 1) : où il en est, où il va. */
  pull: number;
  aim: number;
}

/**
 * La bibliothèque personnelle (#bibliotheque) : la vitrine du chercheur, ses 21 places, les livres rares
 * trouvés debout à la leur, le dos vers le lecteur ; une place vide n'a que son étiquette. Au survol, un
 * livre sort un peu du rang et son nom s'écrit dessous ; au clic, il s'envole vers sa page
 * (`onOpen`), comme les livres de la pile, et y revient au retour. Pièce à part : elle ne se vide jamais.
 */
export const createLibraryPage = (state: GameState, onOpen: (id: string) => void, onBack: () => void): Component => {
  const root = el('main', 'library-page');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', onBack);
  const stage = el('div', 'library-stage');
  const canvas = el('canvas', 'library-canvas');
  const caption = el('div', 'library-caption');
  stage.append(canvas);
  root.append(back, stage, caption);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  const cabinet = createCabinet();
  scene.add(cabinet.root);
  const center = new THREE.Vector3(0, cabinet.size.y / 2, 0);
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));
  // Une lampe au-dessus de la vitrine, un peu devant : les dos des livres et les étiquettes accrochent la lumière.
  const lamp = new THREE.SpotLight(0xffd9a0, 18, 12, THREE.MathUtils.degToRad(40), 0.6, 1.4);
  lamp.position.set(0, cabinet.size.y + 1.4, 2.6);
  lamp.target.position.copy(center);
  scene.add(lamp, lamp.target);

  let dirty = true;
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const places: Place[] = RARE_BOOKS.map(({ id }, index) => {
    const slot = cabinet.slots[index];
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.1, 0.9), hitMaterial);
    hit.position.set(slot.base.x, slot.base.y + 0.55, 0);
    scene.add(hit);
    return { id, slot, found: isRareBookFound(state, id), holder: null, hit, pull: 0, aim: 0 };
  });
  // Les livres trouvés : leur vrai modèle, chargé à part (couvertures, polices).
  for (const place of places.filter((candidate) => candidate.found)) {
    const book = rareBook3d(state, place.id);
    void book.look().then((look) => {
      if (!root.isConnected && mounted) return;
      const mesh = createBookMesh(book.shape, look);
      mesh.setOpen(0);
      const holder = new THREE.Group();
      // Debout, le dos vers le lecteur (comme les livres debout de la pile).
      mesh.root.rotation.y = Math.PI / 2;
      holder.add(mesh.root);
      holder.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh.root);
      mesh.root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -box.max.z);
      holder.position.set(place.slot.base.x, place.slot.base.y, place.slot.base.z - SET_BACK);
      mesh.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
      });
      scene.add(holder);
      place.holder = holder;
      dirty = true;
    });
  }

  /** La caméra en face de la vitrine, à hauteur de son milieu : toute la vitrine tient dans le canvas. */
  const fit = (): void => {
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const tall = (cabinet.size.y / 2) * 1.08;
    const wide = (cabinet.size.x / 2) * 1.15;
    const distance = Math.max(tall / Math.tan(half), wide / (Math.tan(half) * camera.aspect)) + cabinet.size.z / 2;
    camera.position.set(0, center.y, distance);
    camera.lookAt(center);
    lighting.follow(camera, center, 1);
  };

  // Survol : le livre sort du rang, son nom (ou « une place vide ») s'écrit sous la vitrine.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: Place | null = null;
  const placeAt = (event: MouseEvent): Place | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const [hit] = raycaster.intersectObjects(places.map((place) => place.hit));
    return places.find((place) => place.hit === hit?.object) ?? null;
  };
  const label = (place: Place): string => (place.found ? t(`rareBooks.${place.id}.name`) : t('ui.emptyPlace'));
  const hover = (place: Place | null): void => {
    if (hovered === place) return;
    if (hovered) hovered.aim = 0;
    hovered = place;
    if (place?.holder) place.aim = 1;
    canvas.style.cursor = place?.holder ? 'pointer' : '';
    caption.textContent = place ? label(place) : '';
    caption.classList.toggle('shown', place !== null);
  };
  canvas.addEventListener('pointermove', (event) => hover(placeAt(event)));
  canvas.addEventListener('pointerleave', () => hover(null));
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  canvas.addEventListener('click', (event) => {
    const place = placeAt(event);
    if (!place?.holder) return;
    // Il part de sa place dans le rang, tel qu'on le voit (sorti à moitié) : la page reprend ce départ.
    if (!still.matches) launchFlight(libraryFlightId(place.id), place.holder.children[0], camera, canvas);
    place.holder.visible = false;
    onOpen(place.id);
  });

  let before = performance.now();
  let mounted = false;
  let wasFlying = false;
  const frame = (now: number): void => {
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
      const away = home.has(libraryFlightId(place.id));
      if (place.holder.visible === away) {
        place.holder.visible = !away;
        moving = true;
      }
      const pull = still.matches ? place.aim : place.pull + (place.aim - place.pull) * Math.min(1, dt * PULL_RATE);
      place.pull = Math.abs(place.aim - pull) < 0.002 ? place.aim : pull;
      if (place.pull !== place.aim) moving = true;
      place.holder.position.z = place.slot.base.z - SET_BACK + PULL * place.pull;
      place.holder.rotation.x = TIP * place.pull;
    }
    if (resize()) {
      fit();
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
    update: () => {
      back.textContent = `← ${t('ui.back')}`;
      if (hovered) caption.textContent = label(hovered);
    },
  };
};
