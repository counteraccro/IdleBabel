import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { STRANGE_BOOK_INDEX } from './strangeBook';
import { loreTold } from './lore';
import { meetStrangeBook } from './decipher';

/** Tous les livres de la Bibliothèque ont 410 pages (Borges), comme le Livre Total. */
export const PAGES_PER_BOOK = 410;
/** Une feuille tournée découvre deux pages (son verso, et le recto de la suivante) : on les lit toutes deux. */
export const PAGES_PER_LEAF = 2;
/** Feuilles d'un livre, page de titre comprise : 205. */
export const LEAVES_PER_BOOK = PAGES_PER_BOOK / PAGES_PER_LEAF;

/** La double page où en est le livre en main (feuilles déjà tournées). */
export const bookSpread = (state: GameState): number => Math.floor(state.bookPage / PAGES_PER_LEAF);

/**
 * Une feuille du livre en main vient d'être tournée à l'écran (clic ou production) : deux pages de plus.
 * Renvoie true si le livre est terminé : le chercheur le referme et en prend un autre.
 */
export const turnBookPage = (state: GameState): boolean => {
  state.bookPage += PAGES_PER_LEAF;
  if (state.bookPage < PAGES_PER_BOOK) return false;
  state.bookPage = 0;
  state.booksFinished += 1;
  recordOnce(state, 'firstBook');
  if (state.booksFinished === STRANGE_BOOK_INDEX) {
    recordOnce(state, 'strangeBook');
    meetStrangeBook(state);
  }
  return true;
};

/**
 * Le chercheur a gardé son premier livre (récit firstBookKept, quand il l'a refermé : handReading3d.ts) :
 * il est dans la bibliothèque, dont il a la clé.
 */
export const firstBookKept = (state: GameState): boolean => loreTold(state, 'firstBookKept');

/** Avancement dans le livre en main, de 0 (ouvert au début) à 1 (dernière page). */
export const bookProgress = (state: GameState): number => state.bookPage / PAGES_PER_BOOK;
