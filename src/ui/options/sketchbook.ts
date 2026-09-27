import { el } from '../dom';
import { t } from '../../i18n';
import { createLeafTurn } from '../strangeBook/leafTurn';
import { leafGeometryFor } from '../book/leafRenderer';
import { TURN_MS } from '../book/book';
import { preloadPage, snapshotPage } from './pageSnapshot';

const FLIP_MS = 700;
const EASING = 'cubic-bezier(0.45, 0, 0.25, 1)';
/** Écran étroit : une page à la fois au lieu d'une double page. */
const NARROW = '(max-width: 760px)';

/** Spirale du carnet : des anneaux de fil de fer passés dans des trous, le long du dos. */
const RINGS = 9;
const createRings = (): HTMLElement => {
  const rings = el('div', 'sketchbook-rings');
  for (let i = 0; i < RINGS; i++) rings.append(el('span'));
  return rings;
};

export interface SketchbookContent {
  /** Couverture de devant, son revers (à gauche une fois ouvert) et dos du carnet (plats de carton). */
  front: HTMLElement;
  inside: HTMLElement;
  back: HTMLElement;
  /** Pages de droite, dans l'ordre. */
  pages: HTMLElement[];
  /** Verso de chaque page : ce qu'on voit à gauche une fois qu'elle est tournée (croquis, notes…). */
  versos: HTMLElement[];
  /** Position de départ : -1 (fermé, par défaut), une page, ou le dos. */
  start?: number;
}

export interface Sketchbook {
  root: HTMLElement;
  /** Position actuelle, pour rouvrir le carnet au même endroit. */
  position: () => number;
}

/**
 * Carnet à spirale posé à l'horizontale, comme le livre étrange : fermé sur sa couverture, on
 * l'ouvre, on tourne ses pages, et après la dernière il se referme sur son dos. Les pages de papier
 * s'enroulent avec la feuille WebGL du livre en main ; les plats de carton pivotent d'un bloc.
 * Position : -1 couverture, 0 à n - 1 les pages, n le dos.
 */
export const createSketchbook = (content: SketchbookContent): Sketchbook => {
  const root = el('div', 'sketchbook');
  const body = el('div', 'sketchbook-body');
  const left = el('div', 'sketchbook-half sketchbook-left');
  const right = el('div', 'sketchbook-half sketchbook-right');
  // Coin corné en bas à droite de la page : on le prend pour tourner.
  const corner = el('button', 'sketchbook-corner');
  corner.setAttribute('aria-label', t('ui.nextPage'));
  // Feuille WebGL (papier qui s'enroule) et scène hors écran où l'on photographie les pages.
  const leaf = createLeafTurn();
  const stage = el('div', 'sketchbook-stage');
  body.append(left, right, createRings(), corner, leaf.canvas);

  const previous = el('button', 'sketchbook-turn', '‹');
  const next = el('button', 'sketchbook-turn', '›');
  previous.setAttribute('aria-label', t('ui.previousPage'));
  next.setAttribute('aria-label', t('ui.nextPage'));
  const nav = el('div', 'sketchbook-nav');
  nav.append(previous, next);
  root.append(body, nav, stage);
  [...content.pages, ...content.versos].forEach(preloadPage);

  const count = content.pages.length;
  const insideCover = content.inside;
  let current = content.start ?? -1;
  let turning = false;
  const single = (): boolean => window.matchMedia(NARROW).matches;

  /** Ce qui est posé à gauche et à droite du dos à une position donnée. */
  const sides = (position: number): { left: HTMLElement | null; right: HTMLElement | null } => {
    if (position < 0) return { left: null, right: content.front };
    if (position >= count) return single() ? { left: null, right: content.back } : { left: content.back, right: null };
    if (single()) return { left: null, right: content.pages[position] };
    return { left: position === 0 ? insideCover : content.versos[position - 1], right: content.pages[position] };
  };
  /** Fermé, le carnet est recentré sur la moitié qui reste visible. */
  const shift = (position: number): string => {
    if (single() || (position >= 0 && position < count)) return 'translateX(0%)';
    return `translateX(${position < 0 ? -25 : 25}%)`;
  };

  const place = (half: HTMLElement, node: HTMLElement | null): void => {
    half.replaceChildren(...(node ? [node] : []));
    half.classList.toggle('empty', !node);
  };
  const show = (position: number): void => {
    const { left: l, right: r } = sides(position);
    place(left, l);
    place(right, r);
    body.style.transform = shift(position);
    body.classList.toggle('single', single());
    root.classList.toggle('closed', position < 0 || position >= count);
    corner.hidden = position < 0 || position >= count;
    previous.disabled = position < 0;
    next.disabled = position >= count;
  };

  // Toujours animé, comme le livre en main : c'est le geste de tourner la page, pas une décoration.
  const animate = (element: HTMLElement, from: string, to: string): Promise<void> =>
    element.animate([{ transform: from }, { transform: to }], { duration: FLIP_MS, easing: EASING }).finished.then(() => undefined);

  const copy = (node: HTMLElement | null): HTMLElement | null => (node ? (node.cloneNode(true) as HTMLElement) : null);
  /** Verso d'une feuille en page seule : le papier nu, ou le carton de la couverture. */
  const plainBack = (node: HTMLElement | null): HTMLElement =>
    node === content.front ? copy(content.inside)! : el('div', 'sketchbook-verso');

  /** Une page de papier s'enroule autour de la spirale, photographiée recto (à droite) et verso (à gauche). */
  const curl = async (recto: HTMLElement | null, verso: HTMLElement | null, forward: boolean): Promise<void> => {
    const width = right.offsetWidth;
    const height = right.offsetHeight;
    leaf.fit(single(), leafGeometryFor(width / height));
    leaf.begin((front, back) => {
      snapshotPage(recto, front, stage, width, height);
      snapshotPage(verso, back, stage, width, height);
    }, forward ? 0 : 1);
    try {
      await leaf.animate(forward ? 1 : 0, TURN_MS);
    } finally {
      leaf.end();
    }
  };

  /** Un plat de carton pivote d'un bloc autour de la spirale : son recto (à droite), son verso (à gauche). */
  const flip = async (recto: HTMLElement | null, verso: HTMLElement | null, from: number, to: number, bodyFrom: string, bodyTo: string): Promise<void> => {
    const leaf = el('div', 'sketchbook-leaf');
    const front = el('div', 'leaf-side');
    const back = el('div', 'leaf-side leaf-back');
    if (recto) front.append(recto);
    if (verso) back.append(verso);
    leaf.append(front, back);
    body.insertBefore(leaf, body.querySelector('.sketchbook-rings'));
    try {
      await Promise.all([
        animate(leaf, `rotateY(${from}deg)`, `rotateY(${to}deg)`),
        animate(body, bodyFrom, bodyTo),
      ]);
    } finally {
      leaf.remove();
    }
  };

  const goTo = async (target: number): Promise<void> => {
    if (turning || target === current || Math.abs(target - current) !== 1 || target < -1 || target > count) return;
    turning = true;
    const from = current;
    current = target;
    const forward = target > from;
    // La feuille qui bouge : ce qui était (ou sera) à droite, et son verso qui se pose (ou était) à gauche.
    const moving = forward ? sides(from).right : sides(target).right;
    const landing = forward ? sides(target).left : sides(from).left;
    const verso = single() ? plainBack(moving) : copy(landing);
    // Le coin corné appartient à la page de droite : il ne doit pas flotter pendant qu'elle bouge.
    corner.hidden = true;
    // Entre deux pages, c'est du papier : il s'enroule. Couverture et dos : du carton rigide.
    const paper = from >= 0 && from < count && target >= 0 && target < count;
    try {
      if (paper) {
        if (forward) place(right, sides(target).right);
        else place(left, sides(target).left);
        await curl(moving, single() ? null : landing, forward);
      } else if (forward) {
        // La page part : on découvre déjà la suivante dessous, à droite.
        place(right, sides(target).right);
        await flip(copy(moving), verso, 0, -180, shift(from), shift(target));
      } else {
        // La page revient de la gauche : on découvre déjà, à gauche, ce qu'elle cachait.
        place(left, sides(target).left);
        await flip(copy(moving), verso, -180, 0, shift(from), shift(target));
      }
    } finally {
      show(current);
      turning = false;
    }
  };

  previous.addEventListener('click', () => void goTo(current - 1));
  next.addEventListener('click', () => void goTo(current + 1));
  corner.addEventListener('click', () => void goTo(current + 1));
  // Carnet fermé : un clic sur la couverture l'ouvre, un clic sur le dos le rouvre à la dernière page.
  body.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('.sketchbook-page, .sketchbook-corner')) return;
    if (current < 0) void goTo(0);
    else if (current >= count) void goTo(count - 1);
  });
  const onKey = (event: KeyboardEvent): void => {
    if (!root.isConnected) return void window.removeEventListener('keydown', onKey);
    if (event.key === 'ArrowRight') void goTo(current + 1);
    if (event.key === 'ArrowLeft') void goTo(current - 1);
  };
  window.addEventListener('keydown', onKey);
  const narrow = window.matchMedia(NARROW);
  const onResize = (): void => {
    if (!root.isConnected) return narrow.removeEventListener('change', onResize);
    if (!turning) show(current);
  };
  narrow.addEventListener('change', onResize);

  show(current);
  return { root, position: () => current };
};
