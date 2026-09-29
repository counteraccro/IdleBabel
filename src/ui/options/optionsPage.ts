import { t } from '../../i18n';
import { createBook3dPage } from '../book3d/book3dPage';
import { BIG_BOOK_REWRITE } from '../book3d/book3dBook';
import { notebook3d } from './notebook3d';
import type { NotebookActions } from './notebookPages';
import type { Component } from '../dom';
import type { GameState } from '../../core/state';

export interface OptionsHandlers extends NotebookActions {
  onBack: () => void;
}

/**
 * Page des options : le cahier d'écolier du chercheur, en 3D. On l'ouvre, on tourne ses pages, on coche
 * les réglages au stylo. Changer de langue réécrit les pages sans refermer le cahier.
 */
export const createOptionsPage = (state: GameState, handlers: OptionsHandlers): Component => {
  const page = createBook3dPage(
    notebook3d(state, {
      ...handlers,
      onLocale: (locale) => {
        handlers.onLocale(locale);
        page.root.querySelector('.options-back')!.textContent = `← ${t('ui.back')}`;
        window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
      },
    }),
    handlers.onBack,
  );
  return page;
};
