import { el, type Component } from './dom';
import { t } from '../i18n';
import { readPage } from '../systems/click';
import { createBook } from './book';
import type { GameState } from '../core/state';

/** Le livre que le chercheur tient en main : chaque clic tourne une page. */
export const createReading = (state: GameState): Component => {
  const root = el('section', 'reading');
  root.append(createBook(t('ui.read'), () => readPage(state)));
  return { root, update: () => {} };
};
