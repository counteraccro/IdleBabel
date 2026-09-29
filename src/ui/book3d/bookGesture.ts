import * as THREE from 'three';
import { attachGrab } from '../book/bookGrab';
import type { Turner } from './turner';

/** Saisie, la page se décolle un peu de sa pile avant même qu'on tire. */
const HELD = 0.08;
/** Part de la largeur d'une page à l'écran à tirer pour la tourner entièrement. */
const FULL_TURN = 0.75;
/** Coin d'une page : le quart de sa hauteur en haut ou en bas, le tiers de sa largeur côté tranche. */
const CORNER_HEIGHT = 0.25;
const CORNER_WIDTH = 0.35;

export interface BookGestureOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  /** Le livre (pour savoir si le pointeur est dessus), null tant qu'il n'est pas prêt. */
  book: () => THREE.Object3D | null;
  turner: () => Turner | null;
  spreads: number;
  /** Largeur et hauteur d'une page, en unités de scène (le livre est centré en hauteur). */
  width: number;
  height: number;
  /** Livre ouvert à plat : ses pages peuvent se prendre à la main (sinon, un clic ouvre ou referme). */
  open: () => boolean;
  /** Un pas en avant ou en arrière, couvertures comprises (clic, ou prise d'une page qui n'existe pas). */
  step: (forward: boolean) => void;
  /** Un geste commence (ou finit) sur le livre : la caméra ne doit pas tourner pendant. */
  busy: (on: boolean) => void;
}

/**
 * Tourner les pages à la main, comme les anciens livres : un clic sur la page de droite avance, sur
 * celle de gauche recule ; un appui maintenu prend la page, qui suit la souris jusqu'au relâchement (lâchée
 * après la moitié, elle finit de tourner, sinon elle retombe).
 */
export const attachBookGesture = (options: BookGestureOptions): void => {
  const { canvas, camera } = options;
  const raycaster = new THREE.Raycaster();
  /** Abscisse à l'écran d'un point du livre à `x` du dos. */
  const screenX = (book: THREE.Object3D, x: number): number => {
    const point = book.localToWorld(new THREE.Vector3(x, 0, 0)).project(camera);
    const bounds = canvas.getBoundingClientRect();
    return bounds.left + ((point.x + 1) / 2) * bounds.width;
  };
  /** Point du livre sous le pointeur, dans son repère (x : distance au dos, y : hauteur) ; null : à côté. */
  const onBook = (event: PointerEvent): THREE.Vector3 | null => {
    const book = options.book();
    if (!book) return null;
    const bounds = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(book, true)[0];
    return hit ? book.worldToLocal(hit.point.clone()) : null;
  };
  /** Coin de page sous le pointeur : 1 en haut, -1 en bas, 0 ailleurs. */
  const cornerOf = ({ x, y }: THREE.Vector3): number =>
    Math.abs(x) < options.width * (1 - CORNER_WIDTH) || Math.abs(y) < options.height * (0.5 - CORNER_HEIGHT) ? 0 : Math.sign(y);

  // Avant la caméra (écouteur en capture) : un appui sur le livre ouvert ne le fait pas pivoter (fermé,
  // on le fait tourner en le tirant ; un clic l'ouvre).
  let active = false;
  let corner = 0;
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      const point = event.button === 0 ? onBook(event) : null;
      active = point !== null;
      corner = point ? cornerOf(point) : 0;
      if (active && options.open()) options.busy(true);
    },
    { capture: true },
  );
  window.addEventListener('pointerup', () => options.busy(false));
  window.addEventListener('pointercancel', () => options.busy(false));

  let side: 1 | -1 = 1;
  let held: number | null = null;
  const sideOf = (event: PointerEvent): 1 | -1 => {
    const book = options.book();
    side = book && event.clientX < screenX(book, 0) ? -1 : 1;
    return side;
  };
  attachGrab(
    canvas,
    {
      turn: () => {
        // Un clic sur un coin : la page part de lui.
        const turner = options.turner();
        const to = (turner?.target ?? 0) + side;
        if (corner && turner && options.open() && to >= 0 && to < options.spreads) turner.go(to, corner);
        else options.step(side === 1);
      },
      grab: () => {
        const turner = options.turner();
        if (!turner || !options.open() || !turner.idle) return;
        const to = turner.target + side;
        // Pas de page de ce côté : c'est la couverture (ou le plat arrière) qu'on referme.
        if (to < 0 || to >= options.spreads) return options.step(side === 1);
        held = turner.target;
        turner.hold(held + side * HELD, corner);
      },
      move: (progress) => {
        if (held !== null) options.turner()?.hold(held + side * (HELD + (1 - HELD) * progress));
      },
      release: (progress) => {
        const turner = options.turner();
        if (held === null || !turner) return;
        const fraction = HELD + (1 - HELD) * progress;
        turner.go(fraction > 0.5 ? held + side : held, corner);
        turner.hold(null);
        held = null;
      },
    },
    {
      direction: sideOf,
      ignore: () => !active,
      span: () => {
        const book = options.book();
        return book ? Math.max(40, Math.abs(screenX(book, options.width) - screenX(book, 0)) * FULL_TURN) : 200;
      },
    },
  );
};
