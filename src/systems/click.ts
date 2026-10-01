import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { gainPages } from './production';
import { PAGES_PER_LEAF } from './books';

/** Une feuille tournée à la main : ses deux pages lues. */
export const PAGES_PER_CLICK = PAGES_PER_LEAF;

export const readPage = (state: GameState): void => {
  gainPages(state, PAGES_PER_CLICK);
  state.stats.clicks += 1;
  recordOnce(state, 'firstClick');
};
