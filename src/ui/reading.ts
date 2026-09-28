import { el, type Component } from './dom';
import { t } from '../i18n';
import { readPage } from '../systems/click';
import { createBook } from './book/book';
import { startAutoTurn } from './book/autoTurn';
import { findText, gainFind, rollFind } from '../systems/knowledge';
import type { Find } from '../data/knowledge';
import { pagesPerSecond } from '../systems/production';
import { PAGES_PER_BOOK, bookProgress, turnBookPage } from '../systems/books';
import { STRANGE_BINDING, bindingFor, modernBindingFor } from './book/bindings';
import { createPage } from '../systems/babelText';
import { createDigitPage, isStrangeBook } from '../systems/strangeBook';
import { coverDesign } from '../systems/coverDesign';
import type { GameState } from '../core/state';
import { DEBUG_BOOK_EVENT } from '../debug/events';
import { createPages, type LeafPage } from './strangeBook/pages';
import { STRANGE_PAPER } from './strangeBook/pageItems';
import type { PageView } from './book/pageRender';

/**
 * Le livre étrange tenu en main : ses premières pages sont celles du grand livre (garde, sommaire,
 * chiffres, sceaux), en petit et sans rien de cliquable ; ensuite, des chiffres jusqu'au bout.
 */
const createStrangePages = (state: GameState): ((position: number) => PageView | undefined) => {
  let pages: LeafPage[] | null = null;
  return (position) => {
    // Le sommaire et les chapitres sont ceux du moment où l'on ouvre le livre (page 0 : on repart de zéro).
    if (position <= 0 || !pages) pages = createPages(state, () => {});
    const page = pages[position];
    if (!page) return undefined;
    return {
      html: (target) => {
        page.update();
        target.replaceChildren(page.root);
      },
      texture: (canvas, spineOnLeft, paper) => page.paint(canvas, spineOnLeft, paper),
    };
  };
};

/** Le livre que le chercheur tient en main : chaque page tournée est une page lue. */
export const createReading = (state: GameState): Component => {
  const root = el('section', 'reading');
  const strange = (): boolean => isStrangeBook(state.booksFinished);
  const strangePages = createStrangePages(state);
  // Trouvaille de la feuille en train de tourner : gagnée quand elle se pose à gauche.
  let pending: Find | undefined;
  const book = createBook(t('ui.read'), {
    onTurn: () => readPage(state),
    onLeaf: () => {
      if (pending) gainFind(state, pending);
      pending = undefined;
      return turnBookPage(state);
    },
    onFallBack: () => {
      pending = undefined;
    },
    page: (length, fragment) => (strange() ? createDigitPage(length) : createPage(length, fragment)),
    special: (position) => (strange() ? strangePages(position) : undefined),
    turned: () => state.bookPage,
    paper: () => (strange() ? STRANGE_PAPER : undefined),
    // Une chance par page tournée, sur l'une ou l'autre des deux pages découvertes. Le livre étrange
    // n'a que des chiffres : rien à y trouver.
    leafFragments: () => {
      pending = strange() ? undefined : rollFind(state);
      if (!pending) return [undefined, undefined];
      const text = findText(pending);
      return Math.random() < 0.5 ? [text, undefined] : [undefined, text];
    },
    progress: () => bookProgress(state),
    lastLeaf: () => state.bookPage === PAGES_PER_BOOK - 1,
    binding: () => {
      if (strange()) return STRANGE_BINDING;
      return coverDesign(state.booksFinished).modern ? modernBindingFor(state.booksFinished) : bindingFor(state.booksFinished);
    },
    cover: () => coverDesign(state.booksFinished),
    // Sans pages qui tournent seules, le livre suivant attend fermé qu'on l'ouvre.
    stayClosed: () => !state.settings.autoTurn,
  });
  book.root.classList.toggle('still', !state.settings.bookSway);
  root.append(book.root);
  startAutoTurn(book, () => pagesPerSecond(state), () => state.settings.autoTurn);
  // Débogage : page ou numéro du livre changés à la main, le livre en main suit.
  const onDebugBook = (): void => {
    if (book.root.isConnected) book.refresh();
    else window.removeEventListener(DEBUG_BOOK_EVENT, onDebugBook);
  };
  window.addEventListener(DEBUG_BOOK_EVENT, onDebugBook);
  return { root, update: () => {} };
};
