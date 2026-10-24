import { STARS_LIT_ALL } from '../data/seals';
import type { GameState } from './state';

/** Les paliers fixes du sceau des étoiles allumées (data/seals.ts) : 1, 10, 25 ; le dernier, toutes les étoiles. */
const FIXED_STEPS = new Set(['starsLit-1', 'starsLit-10', 'starsLit-25']);

const isOldAll = (id: string): boolean => /^starsLit-\d+$/.test(id) && !FIXED_STEPS.has(id);

/**
 * Le sceau « Tout le ciel » portait le nombre des étoiles ouvertes (« starsLit-148 ») : il se perdait chaque fois que des
 * étoiles s'ouvraient (revue de l'Alpha 3, 24/10). Une partie qui l'avait obtenu le garde, sous son id fixe, à sa
 * première date.
 */
export const keepStarsLitSeal = (state: GameState): GameState => {
  const old = Object.keys(state.seals).filter(isOldAll);
  if (old.length === 0) return state;
  const seals = Object.fromEntries(Object.entries(state.seals).filter(([id]) => !isOldAll(id)));
  const dates = [...old.map((id) => state.seals[id]), ...(STARS_LIT_ALL in seals ? [seals[STARS_LIT_ALL]] : [])];
  return {
    ...state,
    seals: { ...seals, [STARS_LIT_ALL]: Math.min(...dates) },
    newSeals: [...new Set(state.newSeals.map((id) => (isOldAll(id) ? STARS_LIT_ALL : id)))],
  };
};
