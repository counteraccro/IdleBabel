import { PARTS, READABLE_AT, type PartId } from '../data/decipher';
import { STRANGE_BOOK_INDEX, statsRevealed } from './strangeBook';
import { loreTold, tellLore } from './lore';
import type { GameState } from '../core/state';

/** Les chapitres « Raretés » et « Éther » n'existent qu'une fois le premier livre rare trouvé, le premier Éther reçu : pas d'étoile avant. */
const exists = (state: GameState, part: PartId): boolean =>
  part === 'rareBooks' ? Object.keys(state.rareBooks).length > 0 : part === 'ether' ? state.etherReceived > 0 : true;

/** Lisible pour de bon : palier de Connaissance à vie atteint (ou partie payée, du temps où elles s'achetaient). */
const readable = (state: GameState, part: PartId): boolean =>
  exists(state, part) && (state.deciphered.includes(part) || state.lifetimeKnowledge >= READABLE_AT[part]);

/** La partie se lit-elle en clair ? (débogage : tout.) */
export const isDeciphered = (state: GameState, part: PartId): boolean => statsRevealed() || readable(state, part);

/** Devenue lisible, et pas encore vue en clair : une étoile dorée la signale (sommaire, pile). */
export const partHasNews = (state: GameState, part: PartId): boolean => readable(state, part) && !state.partsRead.includes(part);

export const anyPartNews = (state: GameState): boolean => PARTS.some((part) => partHasNews(state, part));

/** Le joueur a vu la partie en clair. */
export const markPartRead = (state: GameState, part: PartId): void => {
  if (readable(state, part) && !state.partsRead.includes(part)) state.partsRead.push(part);
};

/** Ce qui se lit déjà n'est pas une nouveauté : le joueur découvre le livre tel quel. */
export const markAllPartsRead = (state: GameState): void => PARTS.forEach((part) => markPartRead(state, part));

/**
 * Le Grand Livre arrive en main (ou, partie d'avant ce moment, il y est déjà) : son récit, une fois, qui
 * l'ouvre en grand.
 */
export const meetStrangeBook = (state: GameState): void => {
  if (state.booksFinished < STRANGE_BOOK_INDEX || loreTold(state, 'strangeBook')) return;
  markAllPartsRead(state);
  tellLore(state, 'strangeBook');
};
