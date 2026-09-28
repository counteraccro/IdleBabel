import { PARTS, type PartId } from '../data/decipher';
import { statsRevealed } from './strangeBook';
import type { GameState } from '../core/state';

/** La partie se lit-elle en clair ? Payée, ou palier de Connaissance à vie atteint (débogage : tout). */
export const isDeciphered = (state: GameState, part: PartId): boolean =>
  statsRevealed() || state.deciphered.includes(part) || state.lifetimeKnowledge >= PARTS[part].freeAt;

/** Prix pour la déchiffrer tout de suite ; rien si elle est déjà lisible ou ne s'achète pas. */
export const decipherPrice = (state: GameState, part: PartId): number | undefined =>
  isDeciphered(state, part) ? undefined : PARTS[part].price;

/** Paie et déchiffre ; false s'il manque de la Connaissance. */
export const decipher = (state: GameState, part: PartId): boolean => {
  const price = decipherPrice(state, part);
  if (price === undefined || state.knowledge < price) return false;
  state.knowledge -= price;
  state.deciphered.push(part);
  return true;
};
