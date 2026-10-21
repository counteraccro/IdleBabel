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

/**
 * Passe en revue au plus `limit` couvertures pas encore comptées (les couvertures se déduisent du numéro du livre : on compte
 * au fil des livres, sans tout recalculer) ; true quand tout est compté. Le livre a reculé (une partie remise à zéro) :
 * on repart du premier. Le compte est dans la sauvegarde ; une vieille partie, qui ne l'a pas, le rattrape par petits
 * bouts pendant que le jeu attend (main.ts) : 176 000 livres d'un coup, c'est 2,5 s figées.
 */
export const countCovers = (state: GameState, limit = Infinity): boolean => {
  const { stats } = state;
  const booksOpened = state.booksFinished + 1;
  if (booksOpened < stats.coversCounted) {
    stats.coversCounted = 0;
    stats.meaningfulCovers = 0;
  }
  const end = Math.min(booksOpened, stats.coversCounted + limit);
  for (; stats.coversCounted < end; stats.coversCounted++) {
    if (coverDesign(stats.coversCounted).sense.kind !== 'none') stats.meaningfulCovers++;
  }
  return stats.coversCounted >= booksOpened;
};

/** Couvertures passées en revue à la fois, quand le jeu attend (main.ts) : ~7 ms. */
export const COVERS_PER_STEP = 400;
/**
 * Au plus tant à chaque tick et par palier pas encore obtenu (six au plus, ~4 ms en tout), pour les sceaux (data/seals.ts) :
 * ils sont vérifiés dix fois par seconde, et compter toute une vieille partie d'un coup figeait le jeu 3 s au chargement.
 */
export const COVERS_PER_TICK = 40;

/**
 * Livres pris en main (celui en cours compris) dont la couverture portait un vrai mot ou un vrai titre ; `limit` : le compte
 * n'avance que d'autant de couvertures (il peut être en retard).
 */
export const meaningfulCovers = (state: GameState, limit = Infinity): number => {
  countCovers(state, limit);
  return state.stats.meaningfulCovers;
};
