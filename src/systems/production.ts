import { TOOLS } from '../data/tools';
import type { GameState } from '../core/state';

export const pagesPerSecond = (state: GameState): number =>
  TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond, 0);

/** Toute page lue passe par ici : elle s'ajoute au stock et au total à vie. */
export const gainPages = (state: GameState, amount: number): void => {
  state.pages += amount;
  state.totalPagesRead += amount;
};

/**
 * Fois où la production a fait passer le compteur de pages à l'entier suivant, depuis le chargement :
 * les pages qui tournent seules suivent ce nombre, pour tourner en même temps que le compteur change
 * (les clics et les achats, qui le changent aussi, n'en font pas partie).
 */
let producedWhole = 0;
export const producedWholePages = (): number => producedWhole;

export const produce = (state: GameState, seconds: number): void => {
  const before = Math.floor(state.pages);
  gainPages(state, pagesPerSecond(state) * seconds);
  producedWhole += Math.max(0, Math.floor(state.pages) - before);
};
