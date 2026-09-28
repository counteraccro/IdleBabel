import './book3d.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createVellum } from '../whiteBook/vellum';
import { createBookMesh, type BookShape } from './bookMesh';
import { braidTexture, edgeTexture, svgTexture } from './textures';
import { createWhiteBookPages } from '../whiteBook/pages';
import { WHITE_PAPER } from '../whiteBook/whiteBookPage';
import { PAGE_TEXTURE } from '../book/pageLayout';
import type { LeafPage } from '../strangeBook/pages';
import type { GameState } from '../../core/state';

/** Durée d'une page qui tourne. */
const TURN_MS = 1100;

/** Proportions d'un grand livre : 4 × 5, épais (410 pages), plats solides qui débordent un peu. */
const SHAPE: BookShape = { width: 0.8, height: 1, thickness: 0.16, board: 0.018, overhang: 0.012, corner: 0.035 };

/** Plat de vélin rendu en image, à la taille d'une texture. */
const vellumTexture = (seed: number, stamped: boolean, ornaments = true): Promise<THREE.CanvasTexture> =>
  svgTexture(createVellum(seed, stamped, { ornaments }).querySelector('svg')!, 800, 1000);

/**
 * Prototype : le livre des Connaissances fermé, en vraie 3D (Three.js) — une seule caméra, une seule
 * lumière. On le fait tourner à la souris pour juger le rendu sous tous les angles.
 */
/** Page du livre dessinée sur un canvas (le même dessin que la feuille qui tourne), en texture. */
const pageTexture = (page: LeafPage | null | undefined, spineOnLeft: boolean): THREE.CanvasTexture | null => {
  if (!page) return null;
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_TEXTURE.width;
  canvas.height = PAGE_TEXTURE.height;
  page.paint(canvas, spineOnLeft, WHITE_PAPER);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

export const createBook3dPage = (state: GameState, onBack: () => void): Component => {
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
  const leaves = createWhiteBookPages(state, () => {});
  const spreads = Math.ceil(leaves.length / 2);
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
  const controls_ = el('div', 'book3d-controls');
  controls_.append(open, previous, next, spread, ...viewButtons);
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

  // Lumière de la pièce : une lueur chaude venue d'en haut à gauche (la lampe), qui porte les ombres ;
  // un fond doux partout (aucune face ne tombe dans le noir) et un peu de lumière froide de la fenêtre,
  // à droite, qui dessine la tranche et le dos.
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x4a3a28, 1.3));
  const lamp = new THREE.DirectionalLight(0xffe2b0, 2.4);
  lamp.position.set(-1.5, 2, 2.5);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.left = -1;
  lamp.shadow.camera.right = 1.5;
  lamp.shadow.camera.top = 1;
  lamp.shadow.camera.bottom = -1;
  lamp.shadow.bias = -0.0015;
  lamp.shadow.normalBias = 0.02;
  lamp.shadow.radius = 4;
  lamp.target.position.set(0.4, 0, 0);
  scene.add(lamp, lamp.target);
  const window_ = new THREE.DirectionalLight(0xc8d4ff, 0.6);
  window_.position.set(2.5, 0.5, -1);
  // Lumière douce venue de devant (la pièce) : le bord avant du bloc, ses feuilles, ne tombe pas dans le noir.
  const room = new THREE.DirectionalLight(0xffe8c8, 0.9);
  room.position.set(0.3, -2.5, 1.2);
  scene.add(window_, room);

  let book: ReturnType<typeof createBookMesh> | null = null;
  void Promise.all([vellumTexture(3, true), vellumTexture(11, false), vellumTexture(19, false, false)]).then(([cover, backCover, spine]) => {
    book = createBookMesh(SHAPE, { cover, back: backCover, inside: spine, spine, leather: 0xe8dcc0, edge: edgeTexture('#d6ae5a', '#a47d2e'), paper: 0xf3eee2, headband: braidTexture('#c8993f', '#efe4c6') });
    scene.add(book.root);
    showSpread();
    // Débogage du prototype : accès au livre depuis la console.
    (window as unknown as { book3d?: unknown }).book3d = book;
  });
  const showSpread = (): void => {
    if (!book) return;
    const index = Number(spread.value);
    book.setProgress(spreads > 1 ? index / (spreads - 1) : 0);
    book.setPages(pageTexture(leaves[index * 2], false), pageTexture(leaves[index * 2 + 1], true));
  };
  /**
   * Tourne une page : la feuille (recto : la page de droite, verso : la page de gauche d'après) passe
   * de droite à gauche (ou revient), et on découvre dessous la page suivante.
   */
  let turning = false;
  /** Ouvre (ou referme) la couverture, de là où elle en est. */
  const swing = (target: number): void => {
    const from = Number(open.value);
    const start = performance.now();
    const duration = TURN_MS * Math.abs(target - from);
    turning = true;
    const step = (now: number): void => {
      const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      open.value = String(from + (target - from) * eased);
      book?.setOpen(Number(open.value));
      if (t < 1) return void requestAnimationFrame(step);
      turning = false;
    };
    requestAnimationFrame(step);
  };
  const turn = (forward: boolean): void => {
    const from = Number(spread.value);
    const to = from + (forward ? 1 : -1);
    if (!book || turning) return;
    // Livre fermé (ou entrouvert) : la flèche ouvre d'abord la couverture ; à la première double page,
    // revenir en arrière la referme.
    const opening = Number(open.value);
    if (forward && opening < 1) return swing(1);
    if (!forward && from === 0 && opening > 0) return swing(0);
    if (to < 0 || to >= spreads) return;
    turning = true;
    const front = pageTexture(leaves[(forward ? from : to) * 2 + 1], true);
    const back = pageTexture(leaves[(forward ? to : from) * 2], false);
    // Dessous : la page qu'on découvre ; de l'autre côté, celle que la feuille va recouvrir.
    book.setPages(
      pageTexture(leaves[(forward ? from : to) * 2], false),
      pageTexture(leaves[(forward ? to : from) * 2 + 1], true),
    );
    const start = performance.now();
    const at = (index: number): number => (spreads > 1 ? index / (spreads - 1) : 0);
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / TURN_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      // Les piles passent d'un côté à l'autre pendant que la feuille tourne : rien ne saute à la fin.
      // Sauf à la première double page : à gauche, rien que l'intérieur de la couverture, tant que la
      // feuille n'y est pas posée (ou dès qu'elle s'en soulève).
      const read = at(from) + (at(to) - at(from)) * eased;
      book?.setProgress(read, Math.min(from, to) === 0 ? 0 : read);
      book?.setLeaf(forward ? eased : 1 - eased, front, back);
      if (t < 1) return void requestAnimationFrame(step);
      book?.setLeaf(null);
      spread.value = String(to);
      showSpread();
      turning = false;
    };
    requestAnimationFrame(step);
  };
  previous.addEventListener('click', () => turn(false));
  next.addEventListener('click', () => turn(true));
  open.addEventListener('input', () => book?.setOpen(Number(open.value)));
  spread.addEventListener('input', showSpread);

  const resize = (): void => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const frame = (): void => {
    if (!root.isConnected) return renderer.dispose();
    resize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { root, update: () => {} };
};
