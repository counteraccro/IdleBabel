import { S } from '../data/etheriumStars';
import type { GameState } from './state';

/** Les étoiles du Rideau et leur prix, jusqu'au 18/10/2026. */
const CURTAIN_COSTS: Record<string, number> = {
  'curtain.c0': 10,
  'curtain.lm': 25,
  'curtain.rm': 60,
  'curtain.l': 150,
  'curtain.r': 400,
  'curtain.blm': 1000,
  'curtain.brm': 3000,
  'curtain.bl': 10_000,
  'curtain.br': 100_000,
};

/**
 * Le Rideau, supprimé le 18/10/2026 (l'auteur : « supprimer le rideau qui n'a plus aucun intérêt ») : le tome 1 de
 * « L'histoire de Babel » s'achète désormais au Nord-Est de la Rose des vents (S.trueStory). Une partie qui avait allumé
 * des étoiles du Rideau les perd, récupère l'Éther qu'elle y avait mis, et garde son tome : le Nord-Est lui est offert.
 */
export const refundCurtain = (state: GameState): GameState => {
  // Une partie des anciens arbres (core/etheriumTrees.ts) n'a pas d'étoiles, ni de Rideau.
  if (!Array.isArray(state.etherium)) return state;
  const curtain = state.etherium.filter((id) => id in CURTAIN_COSTS);
  if (curtain.length === 0) return state;
  const refund = curtain.reduce((total, id) => total + CURTAIN_COSTS[id], 0);
  const kept = state.etherium.filter((id) => !(id in CURTAIN_COSTS));
  return {
    ...state,
    ether: state.ether + refund,
    etherium: kept.includes(S.trueStory) ? kept : [...kept, S.trueStory],
  };
};
