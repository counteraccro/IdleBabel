import { el, type Component } from './dom';
import { t } from '../i18n';
import { readPage } from '../systems/click';
import { createBook } from './book/book';
import { rollFragment } from '../systems/fragments';
import type { GameState } from '../core/state';

/** Le livre que le chercheur tient en main : chaque page tournée est une page lue. */
export const createReading = (state: GameState): Component => {
  const root = el('section', 'reading');
  root.append(
    createBook(t('ui.read'), {
      onTurn: () => readPage(state),
      nextFragment: rollFragment,
    }),
  );
  return { root, update: () => {} };
};
