import { CLOSED, starById } from '../data/etheriumStars';
import type { GameState } from './state';

/**
 * Les étoiles fermées le 08/10/2026 (data/etheriumStars.ts, CLOSED) : une partie qui en avait allumé une (un Âge
 * d'après l'Automatique, la Goutte) l'éteint, et récupère l'Éther qu'elle y avait mis.
 */
export const refundClosedStars = (state: GameState): GameState => {
  const closed = state.etherium.filter((id) => CLOSED.has(id));
  if (closed.length === 0) return state;
  const refund = closed.reduce((total, id) => total + (starById(id)?.cost ?? 0), 0);
  return { ...state, ether: state.ether + refund, etherium: state.etherium.filter((id) => !CLOSED.has(id)) };
};
