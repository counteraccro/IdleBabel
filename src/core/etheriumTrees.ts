import { starById } from '../data/etheriumStars';
import type { GameState } from './state';

/**
 * Les anciens arbres de l'Etherium (une tige par page, jusqu'au 07/10/2026), remplacés par les constellations
 * (data/etheriumStars.ts). Une partie qui y avait pris des nœuds récupère l'Éther qu'elle y avait mis, à replacer
 * dans les étoiles ; les étoiles qui n'existent pas (ou plus) sont oubliées.
 */
const TREE_COSTS: Record<string, readonly number[]> = {
  reading: [1, 3, 8, 20, 50],
  hands: [2, 6, 15],
  knowledge: [1, 4, 12, 30],
  finds: [1, 3, 8, 20],
  start: [1, 3, 10],
  memory: [2, 4, 8, 16, 32],
};

/** L'Éther mis dans les nœuds des anciens arbres. */
const spentInTrees = (nodes: Record<string, number>): number =>
  Object.entries(nodes).reduce(
    (total, [tree, taken]) => total + (TREE_COSTS[tree] ?? []).slice(0, taken).reduce((sum, cost) => sum + cost, 0),
    0,
  );

export const refundEtheriumTrees = (state: GameState): GameState => {
  const saved = state.etherium as unknown;
  if (Array.isArray(saved)) return { ...state, etherium: saved.filter((id) => typeof id === 'string' && starById(id)) };
  const refund = saved && typeof saved === 'object' ? spentInTrees(saved as Record<string, number>) : 0;
  return { ...state, ether: state.ether + refund, etherium: [] };
};
