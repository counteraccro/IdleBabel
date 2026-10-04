import { TOOLS } from '../data/tools';
import { gestureMultiplier } from './technologies';
import type { GameState } from '../core/state';

/** Débogage : production imposée à la main, à la place de celle des méthodes (pas dans la sauvegarde). */
let forcedPagesPerSecond: number | undefined;
export const forcePagesPerSecond = (value: number | undefined): void => {
  forcedPagesPerSecond = value;
};
export const isForcingPagesPerSecond = (): boolean => forcedPagesPerSecond !== undefined;

/** Production : celle de chaque méthode, doublée par son intuition à chaque niveau. */
export const pagesPerSecond = (state: GameState): number =>
  forcedPagesPerSecond ??
  TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond * gestureMultiplier(state, tool.id), 0);

/**
 * Ce qu'un ajout n'a pas pu compter : au-delà de ~10¹⁵ pages, un nombre à virgule ne distingue plus les
 * petites quantités (0,1 page ajoutée à 10¹⁵ ne change rien). On garde ce reste de côté et on le rajoute
 * aux ajouts suivants, jusqu'à ce qu'il compte : le compteur avance, même lentement, à toute échelle.
 */
const carry = { pages: 0, totalPagesRead: 0 };

const addKeepingRest = (state: GameState, key: keyof typeof carry, amount: number): void => {
  const wanted = carry[key] + amount;
  const next = state[key] + wanted;
  carry[key] = wanted - (next - state[key]);
  state[key] = next;
};

/** Toute page lue passe par ici : elle s'ajoute au stock et au total à vie. */
export const gainPages = (state: GameState, amount: number): void => {
  addKeepingRest(state, 'pages', amount);
  addKeepingRest(state, 'totalPagesRead', amount);
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
