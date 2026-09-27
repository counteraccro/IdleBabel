import { el, type Component } from './dom';
import { t } from '../i18n';
import { readPage } from '../systems/click';
import { createBook } from './book/book';
import { startAutoTurn } from './book/autoTurn';
import { rollFragment } from '../systems/fragments';
import { pagesPerSecond } from '../systems/production';
import { bookProgress, turnBookPage } from '../systems/books';
import { bindingFor } from './book/bindings';
import type { GameState } from '../core/state';

/** Le livre que le chercheur tient en main : chaque page tournée est une page lue. */
export const createReading = (state: GameState): Component => {
  const root = el('section', 'reading');
  const book = createBook(t('ui.read'), {
    onTurn: () => readPage(state),
    onLeaf: () => turnBookPage(state),
    nextFragment: rollFragment,
    progress: () => bookProgress(state),
    binding: () => bindingFor(state.booksFinished),
  });
  root.append(book.root);
  startAutoTurn(book, () => pagesPerSecond(state));
  return { root, update: () => {} };
};
