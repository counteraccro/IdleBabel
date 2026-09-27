import './strangeBook.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { gutterCss, paperCss } from '../book/pageRender';
import { STRANGE_PAPER, drawItems } from './pageItems';
import { createPages, type LeafPage } from './pages';
import { createLeafTurn } from './leafTurn';
import { attachGrab } from '../book/bookGrab';
import { HELD_PROGRESS, RELEASE_MS, TURN_MS } from '../book/book';
import { createStrangeCovers } from './bookCovers';
import type { GameState } from '../../core/state';

/** Écran étroit : une seule page à la fois au lieu d'une double page. */
const NARROW = '(max-width: 720px)';

/**
 * Le livre étrange en grand, par-dessus le décor : fermé sur sa couverture, puis ouvert (sommaire,
 * pages qui tournent), et refermé sur son dos après la dernière page.
 */
export const createStrangeBookPage = (state: GameState, onBack: () => void): Component => {
  const root = el('main', 'sb-page');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', onBack);

  const book = el('div', 'sb-book');
  book.style.setProperty('--sb-paper', paperCss(STRANGE_PAPER));
  const spread = el('div', 'sb-spread');
  const leaf = createLeafTurn();
  const previous = el('button', 'sb-turn', '‹');
  const next = el('button', 'sb-turn', '›');
  previous.setAttribute('aria-label', t('ui.previousPage'));
  next.setAttribute('aria-label', t('ui.nextPage'));
  book.append(spread);
  const nav = el('div', 'sb-nav');
  nav.append(previous, next);
  root.append(back, book, nav);

  let perSpread = 2;
  // Position : -1 fermé sur la couverture, 0 à n - 1 les doubles pages, n fermé sur le dos.
  let current = -1;
  let turning = false;
  let slots: HTMLElement[] = [];
  const pages: LeafPage[] = createPages(state, (page) => void goTo(Math.floor(page / perSpread)));
  const spreadCount = (): number => Math.ceil(pages.length / perSpread);
  const covers = createStrangeCovers(book, () => perSpread === 1);
  const closedSide = (position: number): 'front' | 'back' | null =>
    position < 0 ? 'front' : position >= spreadCount() ? 'back' : null;
  const pageAt = (spreadIndex: number, slot: number): LeafPage | undefined => pages[spreadIndex * perSpread + slot];
  const place = (slot: number, page: LeafPage | undefined): void => {
    slots[slot].replaceChildren(page?.root ?? el('div', 'sb-paper'));
  };
  /** Texture d'une page, ou papier vierge (verso d'une page seule, page manquante). */
  const paint = (page: LeafPage | undefined, canvas: HTMLCanvasElement, spineOnLeft: boolean): void => {
    if (page) page.paint(canvas, spineOnLeft);
    else drawItems(canvas, [], spineOnLeft);
  };

  const refreshNav = (): void => {
    previous.disabled = current < 0;
    next.disabled = current >= spreadCount();
  };

  const layout = (): void => {
    const side = closedSide(current);
    const firstPage = current * perSpread;
    perSpread = window.matchMedia(NARROW).matches ? 1 : 2;
    current = side === 'front' ? -1 : side === 'back' ? spreadCount() : Math.floor(firstPage / perSpread);
    // Ombre du dos : à droite de la page de gauche, à gauche de la page de droite (ou de la page seule).
    slots = Array.from({ length: perSpread }, (_, slot) => {
      const node = el('div', 'sb-slot');
      node.style.setProperty('--gutter', gutterCss(perSpread === 2 && slot === 0 ? '270deg' : '90deg'));
      return node;
    });
    spread.replaceChildren(...slots, leaf.canvas);
    book.classList.toggle('single', perSpread === 1);
    leaf.fit(perSpread === 1);
    slots.forEach((_, slot) => place(slot, pageAt(current, slot)));
    const closed = closedSide(current);
    if (closed) covers.showClosed(closed);
    else covers.reset();
    refreshNav();
  };

  /** Ouvrir ou refermer : la couverture pivote, en emportant la page de son côté. */
  const turnCover = async (from: number, target: number): Promise<void> => {
    const side = closedSide(from) ?? closedSide(target)!;
    const opening = closedSide(from) !== null;
    const open = opening ? target : from;
    // Couverture de devant : elle porte la page de gauche ; dos : la page de droite.
    const slot = side === 'front' ? 0 : perSpread - 1;
    const page = pageAt(open, slot)?.root ?? null;
    slots.forEach((_, index) => place(index, pageAt(open, index)));
    await (opening ? covers.open(side, page) : covers.close(side, page));
  };

  /**
   * Feuille entre deux doubles pages ouvertes, comme dans le livre en main : vers l'avant, la page
   * de droite passe à gauche ; vers l'arrière, celle de gauche revient à droite. Page seule : elle
   * part vers la gauche en montrant son verso vierge, ou en revient.
   */
  const prepareLeaf = (from: number, target: number) => {
    const forward = target > from;
    if (perSpread === 2) {
      const [arriving, leaving] = forward ? [0, 1] : [1, 0];
      return {
        forward,
        begin: () => place(leaving, pageAt(target, leaving)),
        paint: (front: HTMLCanvasElement, back: HTMLCanvasElement) => {
          paint(forward ? pageAt(from, 1) : pageAt(target, 1), front, true);
          paint(forward ? pageAt(target, 0) : pageAt(from, 0), back, false);
        },
        finish: () => place(arriving, pageAt(target, arriving)),
        revert: () => place(leaving, pageAt(from, leaving)),
      };
    }
    return {
      forward,
      begin: () => {
        if (forward) place(0, pageAt(target, 0));
      },
      paint: (front: HTMLCanvasElement, back: HTMLCanvasElement) => {
        paint(forward ? pageAt(from, 0) : pageAt(target, 0), front, true);
        paint(undefined, back, false);
      },
      finish: () => {
        if (!forward) place(0, pageAt(target, 0));
      },
      revert: () => {
        if (forward) place(0, pageAt(from, 0));
      },
    };
  };
  /** Avancement de la feuille (0 : à plat à droite) pour une fraction du geste. */
  const along = (forward: boolean, fraction: number): number => (forward ? fraction : 1 - fraction);

  const goTo = async (target: number): Promise<void> => {
    if (turning || target === current || target < -1 || target > spreadCount()) return;
    turning = true;
    const from = current;
    current = target;
    refreshNav();
    try {
      if (closedSide(from) || closedSide(target)) {
        await turnCover(from, target);
      } else {
        const turn = prepareLeaf(from, target);
        turn.begin();
        leaf.begin(turn.paint, along(turn.forward, 0));
        await leaf.animate(along(turn.forward, 1), TURN_MS);
        turn.finish();
        leaf.end();
      }
      turning = false;
    } catch {
      // Animation interrompue : le livre se remet d'aplomb à la position visée au lieu de rester bloqué.
      turning = false;
      layout();
    }
  };

  // Geste sur les pages, comme le livre en main : clic, ou page tenue et tirée. Page de gauche : on
  // revient en arrière ; page de droite : on avance. Livre fermé : il s'ouvre.
  let side: 1 | -1 = 1;
  let held: { turn: ReturnType<typeof prepareLeaf>; from: number; fraction: number } | null = null;
  const sideOf = (event: PointerEvent): 1 | -1 => {
    const bounds = spread.getBoundingClientRect();
    side = event.clientX < bounds.left + bounds.width / 2 ? -1 : 1;
    return side;
  };
  const openClosed = (): boolean => {
    if (current < 0) void goTo(0);
    else if (current >= spreadCount()) void goTo(spreadCount() - 1);
    else return false;
    return true;
  };
  attachGrab(
    spread,
    {
      turn: () => {
        if (!openClosed()) void goTo(current + side);
      },
      grab: () => {
        if (turning || openClosed()) return;
        const target = current + side;
        // Vers une couverture (avant la première page, après la dernière) : elle se referme d'un coup.
        if (closedSide(target)) return void goTo(target);
        if (target < 0 || target >= spreadCount()) return;
        turning = true;
        const turn = prepareLeaf(current, target);
        held = { turn, from: current, fraction: 0 };
        current = target;
        refreshNav();
        turn.begin();
        leaf.begin(turn.paint, along(turn.forward, 0));
        void leaf.animate(along(turn.forward, HELD_PROGRESS), 120);
        held.fraction = HELD_PROGRESS;
      },
      move: (value) => {
        if (!held) return;
        held.fraction = HELD_PROGRESS + (1 - HELD_PROGRESS) * value;
        leaf.draw(along(held.turn.forward, held.fraction));
      },
      release: async (value) => {
        if (!held) return;
        const { turn, from } = held;
        const fraction = value > 0 ? HELD_PROGRESS + (1 - HELD_PROGRESS) * value : held.fraction;
        held = null;
        // Lâchée après la moitié, elle finit de tourner ; sinon elle retombe.
        const completes = fraction > 0.5;
        const to = completes ? 1 : 0;
        await leaf.animate(along(turn.forward, to), RELEASE_MS * Math.max(0.3, Math.abs(to - fraction)));
        if (completes) turn.finish();
        else {
          turn.revert();
          current = from;
          refreshNav();
        }
        leaf.end();
        turning = false;
      },
    },
    { direction: sideOf },
  );

  previous.addEventListener('click', () => void goTo(current - 1));
  next.addEventListener('click', () => void goTo(current + 1));
  const onKey = (event: KeyboardEvent): void => {
    if (!root.isConnected) return void window.removeEventListener('keydown', onKey);
    if (event.key === 'ArrowRight') void goTo(current + 1);
    if (event.key === 'ArrowLeft') void goTo(current - 1);
  };
  window.addEventListener('keydown', onKey);
  const narrow = window.matchMedia(NARROW);
  const onResize = (): void => {
    if (!root.isConnected) return narrow.removeEventListener('change', onResize);
    if (!turning) layout();
  };
  narrow.addEventListener('change', onResize);

  layout();
  return { root, update: () => pages.forEach((page) => page.update()) };
};
