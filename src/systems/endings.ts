import { S } from '../data/etheriumStars';
import { starLit, storyBribes } from './etherium';
import type { GameState } from '../core/state';

/**
 * Le meuble des fins (idée de l'auteur, 16/10, .ai/plan-fausses-fins.md) : onze places pour onze fausses fins, la
 * collection « La Vraie Fin ». Aujourd'hui, une seule existe : « Mon histoire vraie », le tome 1.
 */
export const ENDING_TOMES = 11;

/** « Mon histoire vraie » est lue jusqu'au bout (« Pas celui-ci ») : elle quitte le haut du meuble pour sa place de tome 1. */
export const storyFinished = (state: GameState): boolean => starLit(state, S.storyEnd);

/** Les fausses fins trouvées (rangées en bas, ou en lecture en haut), sur ENDING_TOMES. */
export const fakeEndingsFound = (state: GameState): number => (storyBribes(state) > 0 ? 1 : 0);
