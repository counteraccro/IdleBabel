import { getLocale, t } from '../i18n';
import { formatCount } from '../core/format';
import type { GameState } from '../core/state';

/** Le titre de l'onglet se refait toutes les tant de millisecondes (onglet caché aussi : on le voit d'un autre onglet). */
const TITLE_MS = 1000;

/** Les pages en réserve dans le titre de l'onglet, « 2 000 pages - Idle Babel » (demande de l'auteur, 14/10). */
export const mountTabTitle = (state: GameState): void => {
  const update = (): void => {
    const pages = Math.floor(state.pages);
    const title = t(pages === 1 ? 'ui.tabTitleOne' : 'ui.tabTitle').replace('{n}', formatCount(pages, getLocale()));
    if (document.title !== title) document.title = title;
  };
  update();
  setInterval(update, TITLE_MS);
};
