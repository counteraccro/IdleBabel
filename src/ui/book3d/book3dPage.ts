import './book3d.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createBookMesh } from './bookMesh';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { createPageCache } from './pageCache';
import { spreadCount } from './pageSource';
import { createTurner, type Turner } from './turner';
import { attachBookGesture } from './bookGesture';
import { createLighting } from './lighting';
import { createReadingView } from './readingView';
import { isDebugEnabled } from '../../debug/debugPanel';
import type { Book3d } from './book3dBook';

/** Durée de l'ouverture de la couverture. */
const OPEN_MS = 1100;

/** Pages qui suivent la partie : redessinées à ce rythme, livre posé. */
const LIVE_MS = 1000;

/**
 * Prototype : un livre en vraie 3D (Three.js). Fermé, on le fait tourner à la souris ; ouvert, on le
 * lit, caméra bloquée, en tournant ses pages à la main.
 */
export const createBook3dPage = (spec: Book3d, onBack: () => void): Component => {
  const root = el('main', 'book3d-page');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', onBack);
  const canvas = el('canvas', 'book3d-canvas');
  const open = el('input');
  open.type = 'range';
  open.min = '0';
  open.max = '1';
  open.step = '0.01';
  open.value = '0';
  // Avancement : quelle double page est ouverte (0 : la page de titre).
  const { shape, source } = spec;
  const spreads = spreadCount(source);
  const spread = el('input');
  spread.type = 'range';
  spread.min = '0';
  spread.max = String(spreads - 1);
  spread.step = '1';
  spread.value = '0';
  // Vues toutes faites : de biais (livre fermé), de dessus (lire), de face à hauteur de table (la reliure
  // sous le pli, comme un livre posé devant soi), par la tête (le profil, pour juger la courbure).
  const views: [string, THREE.Vector3Tuple, THREE.Vector3Tuple][] = [
    ['Biais', [1.7, -0.7, 1.9], [0, 1, 0]],
    ['Dessus', [0, -0.35, 2.4], [0, 1, 0]],
    ['Face', [0, -1.9, 0.55], [0, 0, 1]],
    ['Tête', [0, -2.6, 0.02], [0, 0, 1]],
  ];
  const viewButtons = views.map(([label, position, up]) => {
    const button = el('button', undefined, label);
    button.addEventListener('click', () => {
      camera.up.set(...up);
      camera.position.set(...position);
      controls.target.set(0, 0, 0);
      controls.update();
    });
    return button;
  });
  const previous = el('button', undefined, '‹');
  const next = el('button', undefined, '›');
  previous.setAttribute('aria-label', t('ui.previousPage'));
  next.setAttribute('aria-label', t('ui.nextPage'));
  const arrows = el('div', 'book3d-arrows');
  arrows.append(previous, next);
  // Les flèches, en option ; les réglages du modèle (ouverture, double page, vues) seulement en débogage.
  const controls_ = el('div', 'book3d-controls');
  if (isDebugEnabled()) controls_.append(open, arrows, spread, ...viewButtons);
  else controls_.append(arrows);
  root.append(back, canvas, controls_);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Ombres portées adoucies : la couverture qui déborde assombrit les feuilles dessous.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  // Le compromis : un peu au-dessus et à droite du livre, qui montre sa tranche du bas et de côté.
  camera.position.set(1.7, -0.7, 1.9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.4, 0, 0);
  controls.enableDamping = true;
  const view = createReadingView(camera, controls);

  // Lumières réglées pour la vue de biais, autour du livre.
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));

  let book: ReturnType<typeof createBookMesh> | null = null;
  let turner: Turner | null = null;
  void spec.look().then((look) => {
    book = createBookMesh(shape, look);
    scene.add(book.root);
    turner = createTurner(book, createPageCache(source), spreads);
    // Entrée du sommaire : les pages tournent jusqu'à la double page qui porte la page visée.
    spec.navigate = (index) => turner?.go(Math.floor(index / 2));
    if (spec.bookmark !== undefined) book.setRibbon(spreads > 1 ? Math.floor(spec.bookmark / 2) / (spreads - 1) : 0, spreads > 1 ? 1 / (spreads - 1) : 1);
    // Débogage du prototype : accès au livre depuis la console.
    (window as unknown as { book3d?: unknown }).book3d = { book, turner, camera, controls };
  });
  let swinging = false;
  /** Plat arrière refermé sur les pages, en fin de livre (0 : ouvert, 1 : fermé). */
  let shut = 0;
  /**
   * Ouvre (ou referme) la couverture, ou le plat arrière en fin de livre, de là où il en est. `flip` :
   * refermé sur son dos, le livre se retourne sur sa couverture (les deux plats ensemble, livre fermé
   * d'un bloc), puis revient au début.
   */
  const swing = (board: 'front' | 'back' | 'flip', target: number): void => {
    const from = board === 'back' ? shut : Number(open.value);
    // Le livre s'ouvre (couverture, ou plat arrière qui se relève) : la caméra rejoint la vue de lecture
    // et s'y bloque ; il se referme : elle redevient libre.
    view.begin(board === 'front' ? target === 1 : board === 'back' && target === 0);
    const start = performance.now();
    const duration = OPEN_MS * Math.abs(target - from);
    swinging = true;
    const step = (now: number): void => {
      const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const value = from + (target - from) * eased;
      if (board !== 'back') {
        open.value = String(value);
        book?.setOpen(value);
      }
      if (board !== 'front') {
        shut = value;
        book?.setShut(value);
      }
      view.step(eased);
      if (t < 1) return void requestAnimationFrame(step);
      if (board === 'flip') turner?.jump(0);
      swinging = false;
    };
    requestAnimationFrame(step);
  };
  /** Retour au signet (le sommaire), livre ouvert : toutes les pages tournent jusqu'à lui. */
  const backToBookmark = (): void => {
    if (!turner || spec.bookmark === undefined || swinging || shut > 0 || Number(open.value) < 1) return;
    turner.go(Math.floor(spec.bookmark / 2));
  };
  /** Tourne une page de plus (ou de moins) ; des clics rapides s'enchaînent en feuilletage. */
  const turn = (forward: boolean): void => {
    if (!turner || swinging) return;
    // Livre refermé sur son dos : en avant, il se retourne sur sa couverture (fermé) ; en arrière, il se
    // rouvre à la fin.
    if (shut > 0) return forward ? swing('flip', 0) : swing('back', 0);
    // Livre fermé (ou entrouvert) : la flèche ouvre d'abord la couverture ; revenue à la première double
    // page, revenir en arrière la referme. À la dernière, avancer referme le plat arrière.
    const opening = Number(open.value);
    if (forward && opening < 1) return swing('front', 1);
    if (!forward && turner.target === 0 && opening > 0) return swing('front', 0);
    if (forward && turner.target === spreads - 1) return turner.idle ? swing('back', 1) : undefined;
    turner.go(turner.target + (forward ? 1 : -1));
    spread.value = String(turner.target);
  };
  attachBookGesture({
    canvas,
    camera,
    book: () => book?.root ?? null,
    turner: () => turner,
    spreads,
    width: shape.width,
    height: shape.height,
    open: () => !swinging && shut === 0 && Number(open.value) === 1,
    // Livre fermé, d'un côté ou de l'autre : un clic n'importe où sur lui l'ouvre.
    step: (forward) => turn(shut > 0 ? false : Number(open.value) === 0 ? true : forward),
    busy: (on) => {
      controls.enabled = !on && !view.locked;
    },
    hover: (hit) => {
      if (hit && book?.isRibbon(hit.object)) return void (canvas.style.cursor = 'pointer');
      const page = hit ? book?.pageUnder(hit) : null;
      if (!page || !turner?.idle || !view.locked) return void (canvas.style.cursor = '');
      const [index, x, y] = [2 * turner.target + (page.side === 'right' ? 1 : 0), page.u * PAGE_TEXTURE.width, page.v * PAGE_TEXTURE.height];
      canvas.style.cursor = spec.pointable?.(index, x, y) ? 'pointer' : '';
      if (spec.hover?.(index, x, y)) turner.refresh();
    },
    press: (hit) => {
      // Le signet : les pages tournent jusqu'au sommaire.
      if (book?.isRibbon(hit.object) && spec.bookmark !== undefined) {
        backToBookmark();
        return true;
      }
      const page = book?.pageUnder(hit);
      if (!page || !turner?.idle || !spec.press) return false;
      const index = 2 * turner.target + (page.side === 'right' ? 1 : 0);
      if (!spec.press(index, page.u * PAGE_TEXTURE.width, page.v * PAGE_TEXTURE.height)) return false;
      // La page a pu changer (légende d'un sceau, note au crayon) : redessinée.
      turner.refresh();
      return true;
    },
  });
  previous.addEventListener('click', () => turn(false));
  next.addEventListener('click', () => turn(true));
  const onKey = (event: KeyboardEvent): void => {
    if (!root.isConnected) return void window.removeEventListener('keydown', onKey);
    if (event.key === 'ArrowRight') turn(true);
    if (event.key === 'ArrowLeft') turn(false);
    if (event.key === 'Home') backToBookmark();
  };
  window.addEventListener('keydown', onKey);
  open.addEventListener('input', () => book?.setOpen(Number(open.value)));
  spread.addEventListener('input', () => turner?.go(Number(spread.value)));

  const resize = (): void => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  // Pages qui suivent la partie : redessinées de temps en temps, jamais pendant qu'une page tourne.
  if (spec.live) {
    const timer = window.setInterval(() => {
      if (!root.isConnected) return window.clearInterval(timer);
      if (turner?.idle && Number(open.value) === 1 && shut === 0) turner.refresh();
    }, LIVE_MS);
  }
  let before = performance.now();
  const frame = (now: number): void => {
    if (!root.isConnected) return renderer.dispose();
    turner?.update(Math.min(0.05, (now - before) / 1000));
    // Page prise à la main et lâchée : le curseur suit la double page où le livre s'arrête.
    if (turner && document.activeElement !== spread) spread.value = String(turner.target);
    before = now;
    resize();
    controls.update();
    // Livre fermé (d'un côté ou de l'autre), on le fait tourner : la lumière suit la face qu'on regarde.
    // Fermé : les deux plats l'un sur l'autre (couverture fermée, ou plat arrière refermé sur elle).
    lighting.follow(camera, controls.target, 1 - (Number(open.value) - shut));
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { root, update: () => {} };
};
