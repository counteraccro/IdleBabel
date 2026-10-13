import { CLOSED, starById } from '../data/etheriumStars';
import { DIGITAL_AGE } from '../data/tools';
import type { GameState } from './state';

/** Le prix de l'Âge Quantique avant le 08/10 : l'étoile de l'Âge Numérique d'aujourd'hui. */
const OLD_QUANTUM_COST = 10;

/**
 * Les étoiles fermées le 08/10/2026 (data/etheriumStars.ts, CLOSED) : une partie qui en avait allumé une (un Âge
 * d'après l'Automatique, la Goutte) l'éteint, et récupère l'Éther qu'elle y avait mis. L'Âge Quantique, fermé lui aussi
 * ce jour-là, est rouvert le 13/10 en Âge Numérique (1 500 Éther) : une partie qui n'a pas été rechargée depuis
 * (`beforeClosing` : sa sauvegarde n'a pas encore ses trouvailles comptées, core/countedFinds.ts) l'éteint aussi, et
 * récupère les 10 Éther d'alors.
 */
export const refundClosedStars = (state: GameState, beforeClosing = false): GameState => {
  const closes = (id: string): boolean => CLOSED.has(id) || (beforeClosing && id === DIGITAL_AGE);
  const closed = state.etherium.filter(closes);
  if (closed.length === 0) return state;
  const cost = (id: string): number => (id === DIGITAL_AGE ? OLD_QUANTUM_COST : (starById(id)?.cost ?? 0));
  const refund = closed.reduce((total, id) => total + cost(id), 0);
  return { ...state, ether: state.ether + refund, etherium: state.etherium.filter((id) => !closes(id)) };
};
