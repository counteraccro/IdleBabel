import { el } from '../dom';
import { modalOpen } from '../modal/modal';
import { animationNow } from '../animationClock';
import { attachBookKeys } from './bookKeys';
import { createAutoTurn3d } from './autoTurn3d';
import { handAutoTurn, handPageContent } from './handBook3d';
import { bookSpread, LEAVES_PER_BOOK, PAGES_PER_BOOK } from '../../systems/books';
import { coverDesign } from '../../systems/coverDesign';
import { coverTitle } from '../../systems/coverTitle';
import type { HandFinds } from './handFinds';
import type { HeldBookFactory, ModHeldBook, ModHeldView, ModPage } from '../../mods/heldBook';
import type { GameState } from '../../core/state';

export interface ModHeldOptions {
  finds: HandFinds;
  /** Une feuille tournée (comptée si le lecteur l'a tournée) : la partie avance ; true, le livre est terminé. */
  onLeaf: (spread: number, counted: boolean) => boolean;
  /** Le livre terminé (récit du premier livre gardé). */
  onClosed: () => void;
}

export interface ModHeld {
  root: HTMLElement;
  /** Page ou livre changés hors de l'écran (absence, débogage) : la vue se redessine. */
  reset: () => void;
  signal: AbortSignal;
}

const EMPTY: ModPage = { before: '', find: '', after: '' };

/**
 * Le livre en main remplacé par la vue d'un mod (mods/heldBook.ts) : le jeu garde la partie, comme avec le livre 3D
 * (heldBook3d.ts) — le texte et les trouvailles des pages, celles qui tournent seules au rythme de la production, le
 * clavier, le livre suivant au bout ; la vue ne fait que montrer et appeler `turn()`. Null si le mod plante.
 */
export const createModHeldBook = (state: GameState, factory: HeldBookFactory, options: ModHeldOptions): ModHeld | null => {
  const { finds } = options;
  const root = el('section', 'reading held-mod-book');
  const lifetime = new AbortController();
  const text = (page: number): ModPage => {
    if (page < 2 || page > PAGES_PER_BOOK) return EMPTY;
    finds.open(state.booksFinished);
    const content = handPageContent(state.booksFinished, page, finds);
    return { before: content.before.trim(), find: content.fragment ?? '', after: content.after.trim() };
  };
  let view: ModHeldView | null = null;
  const redraw = (): void => {
    try {
      view?.update?.();
    } catch (error) {
      console.error('[Idle Babel] mod, livre en main :', error);
    }
  };
  /** Une feuille tournée, à la main (`counted`) ou seule : ses deux pages lues, leurs trouvailles. */
  const leaf = (counted: boolean): void => {
    const spread = bookSpread(state) + 1;
    // Une trouvaille n'est gagnée que tirée : le livre 3D les tire en dessinant ses pages, ici on les tire avant.
    for (const page of [2 * spread, 2 * spread + 1]) text(page);
    if (options.onLeaf(spread, counted)) options.onClosed();
    redraw();
  };
  const book: ModHeldBook = {
    get index() {
      return state.booksFinished;
    },
    get page() {
      return state.bookPage;
    },
    pages: PAGES_PER_BOOK,
    get title() {
      return coverTitle(coverDesign(state.booksFinished)).join(' ');
    },
    text,
    turn: () => {
      if (!modalOpen() && !lifetime.signal.aborted) leaf(true);
    },
  };
  try {
    view = factory(book);
    if (!(view?.root instanceof HTMLElement)) throw new Error('la vue doit avoir un root (un élément HTML).');
  } catch (error) {
    console.error('[Idle Babel] mod, livre en main : le livre 3D reste.', error);
    return null;
  }
  root.append(view.root);
  attachBookKeys(root, (forward) => forward && book.turn(), lifetime.signal);

  // Les pages qui tournent seules, au même rythme que celles du livre 3D.
  const autoTurn = createAutoTurn3d(handAutoTurn(state));
  const turner = {
    get target() {
      return bookSpread(state);
    },
    go: () => leaf(false),
  };
  let before = animationNow();
  const frame = (frameTime: number): void => {
    if (!root.isConnected) return lifetime.abort();
    const now = animationNow(frameTime);
    autoTurn(Math.min(0.05, (now - before) / 1000), turner, LEAVES_PER_BOOK, !modalOpen());
    before = now;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { root, reset: redraw, signal: lifetime.signal };
};
