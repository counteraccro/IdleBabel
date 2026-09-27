import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { gainPages } from './production';

export const PAGES_PER_CLICK = 1;

export const readPage = (state: GameState): void => {
  gainPages(state, PAGES_PER_CLICK);
  state.stats.clicks += 1;
  recordOnce(state, 'firstClick');
};
