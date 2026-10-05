import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { gainPages, pagesPerSecond } from './production';
import { clickShare } from './technologies';
import { PAGES_PER_LEAF } from './books';

/** Une feuille tournée à la main : ses deux pages lues. */
export const PAGES_PER_CLICK = PAGES_PER_LEAF;

/** Une feuille tournée à la main (ses pages comptent à vie : pagesByHand) ; la Mémoire musculaire y ajoute une part de la production d'une seconde. */
export const readPage = (state: GameState): void => {
  const read = PAGES_PER_CLICK + pagesPerSecond(state) * clickShare(state);
  gainPages(state, read);
  state.pagesByHand += read;
  state.stats.clicks += 1;
  recordOnce(state, 'firstClick');
};
