import type { GameState } from '../core/state';
import { pagesPerSecond } from './production';
import { coverDesign } from './coverDesign';

/** Au-delà, l'écart entre deux ticks vient d'une mise en veille : ce temps-là n'est pas joué. */
const MAX_TICK_SECONDS = 2;

/** Appelé à chaque tick : temps de jeu et record de production. */
export const trackPlay = (state: GameState, seconds: number): void => {
  if (seconds > 0 && seconds <= MAX_TICK_SECONDS) state.stats.playSeconds += seconds;
  state.stats.bestPagesPerSecond = Math.max(state.stats.bestPagesPerSecond, pagesPerSecond(state));
};

/** Compte la phrase sensée tirée pour une page, et la laisse passer. */
export const countFragment = (state: GameState, fragment: string | undefined): string | undefined => {
  if (fragment !== undefined) state.stats.fragments += 1;
  return fragment;
};

// Les couvertures se déduisent du numéro du livre : on compte au fil des livres sans tout recalculer.
let coversCounted = 0;
let meaningfulSoFar = 0;

/** Livres pris en main (celui en cours compris) dont la couverture portait un vrai mot ou un vrai titre. */
export const meaningfulCovers = (state: GameState): number => {
  const booksOpened = state.booksFinished + 1;
  if (booksOpened < coversCounted) {
    coversCounted = 0;
    meaningfulSoFar = 0;
  }
  for (; coversCounted < booksOpened; coversCounted++) {
    if (coverDesign(coversCounted).sense.kind !== 'none') meaningfulSoFar++;
  }
  return meaningfulSoFar;
};
