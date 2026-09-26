import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';

export const PAGES_PER_CLICK = 1;

export const readPage = (state: GameState): void => {
  state.pages += PAGES_PER_CLICK;
  recordOnce(state, 'firstClick');
};
