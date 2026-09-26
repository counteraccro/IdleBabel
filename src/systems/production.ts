import { TOOLS } from '../data/tools';
import type { GameState } from '../core/state';

export const pagesPerSecond = (state: GameState): number =>
  TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond, 0);

/** Toute page lue passe par ici : elle s'ajoute au stock et au total à vie. */
export const gainPages = (state: GameState, amount: number): void => {
  state.pages += amount;
  state.totalPagesRead += amount;
};

export const produce = (state: GameState, seconds: number): void => {
  gainPages(state, pagesPerSecond(state) * seconds);
};
