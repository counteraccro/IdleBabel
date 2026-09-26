import { TOOLS } from '../data/tools';
import type { GameState } from '../core/state';

export const pagesPerSecond = (state: GameState): number =>
  TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond, 0);

export const produce = (state: GameState, seconds: number): void => {
  state.pages += pagesPerSecond(state) * seconds;
};
