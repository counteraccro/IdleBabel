import { el, type Component } from './dom';
import { t } from '../i18n';
import { readPage } from '../systems/click';
import { createBook } from './book/book';
import { startAutoTurn } from './book/autoTurn';
import { rollFragment } from '../systems/fragments';
import { countFragment } from '../systems/stats';
import { pagesPerSecond } from '../systems/production';
import { PAGES_PER_BOOK, bookProgress, turnBookPage } from '../systems/books';
import { STRANGE_BINDING, bindingFor, modernBindingFor } from './book/bindings';
import { createPage } from '../systems/babelText';
import { createDigitPage, isStrangeBook } from '../systems/strangeBook';
import { coverDesign } from '../systems/coverDesign';
import type { GameState } from '../core/state';
import { DEBUG_BOOK_EVENT } from '../debug/events';

/** Le livre que le chercheur tient en main : chaque page tournée est une page lue. */
export const createReading = (state: GameState): Component => {
  const root = el('section', 'reading');
  const strange = (): boolean => isStrangeBook(state.booksFinished);
  const book = createBook(t('ui.read'), {
    onTurn: () => readPage(state),
    onLeaf: () => turnBookPage(state),
    page: (length, fragment) => (strange() ? createDigitPage(length) : createPage(length, fragment)),
    // Le livre étrange n'a que des chiffres : pas de phrase sensée.
    nextFragment: () => (strange() ? undefined : countFragment(state, rollFragment())),
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
