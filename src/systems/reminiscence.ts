import { TECHNOLOGIES } from '../data/technologies';
import { bestOf, levelOf, nextPrice, understand } from './technologies';
import type { GameState } from '../core/state';

/** La Réminiscence agit : obtenue, et laissée faire. */
export const reminiscing = (state: GameState): boolean => state.reminiscence.known && state.reminiscence.on;

/** Les intuitions qui reviendraient seules : sous leur meilleur niveau, et qui peuvent se comprendre. */
const remembered = (state: GameState) =>
  TECHNOLOGIES.filter((tech) => levelOf(state, tech.id) < bestOf(state, tech.id) && nextPrice(state, tech.id) !== undefined);

/** Connaissance qu'il faut encore pour tout retrouver (le niveau suivant de chacune, pas plus). */
export const nextRemembered = (state: GameState): number | undefined => {
  const prices = remembered(state).map((tech) => nextPrice(state, tech.id)!);
  return prices.length > 0 ? Math.min(...prices) : undefined;
};

/**
 * Réminiscence : le chercheur se souvient de ce qu'il avait compris avant l'Exil. Chaque intuition se
 * rachète seule, la moins chère d'abord, jusqu'au niveau le plus haut qu'elle ait atteint ; au-delà, c'est
 * au joueur. Renvoie le nombre de niveaux revenus.
 */
export const remember = (state: GameState): number => {
  if (!reminiscing(state)) return 0;
  let count = 0;
  for (;;) {
    const cheapest = remembered(state).sort((a, b) => nextPrice(state, a.id)! - nextPrice(state, b.id)!)[0];
    if (!cheapest || !understand(state, cheapest.id)) return count;
    count += 1;
  }
};

/**
 * Ce que l'Exil fera aux intuitions : tout oublié, sauf le meilleur niveau de chacune, et celles qui
 * restent pour toujours (la Brassée) (débogage pour l'instant).
 */
export const forgetIntuitions = (state: GameState): void => {
  state.technologies = Object.fromEntries(
    TECHNOLOGIES.filter((tech) => 'permanent' in tech && tech.permanent && levelOf(state, tech.id) > 0).map((tech) => [
      tech.id,
      levelOf(state, tech.id),
    ]),
  );
};
