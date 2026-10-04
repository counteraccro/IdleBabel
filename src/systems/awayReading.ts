import { PAGES_PER_BOOK, PAGES_PER_LEAF, closeBook } from './books';
import { takeBook } from './rareBooks';
import { isStrangeBook } from './strangeBook';
import type { GameState } from '../core/state';

/**
 * Pages tournées sans le chercheur (absence, modale) : le livre en main avance d'autant, feuille par
 * feuille (arrondi au hasard : la moyenne est juste) ; chaque livre lu jusqu'au bout est refermé, le suivant
 * pris, et un livre rare pris ainsi est trouvé, comme s'il était arrivé en main. Renvoie les livres refermés.
 */
export const readWhileAway = (state: GameState, pages: number, random: () => number = Math.random): number => {
  let leaves = Math.floor(pages / PAGES_PER_LEAF + random());
  let closed = 0;
  while (leaves > 0) {
    const left = (PAGES_PER_BOOK - state.bookPage) / PAGES_PER_LEAF;
    if (leaves < left) {
      state.bookPage += leaves * PAGES_PER_LEAF;
      break;
    }
    leaves -= left;
    closeBook(state);
    closed += 1;
    if (!isStrangeBook(state.booksFinished)) takeBook(state, state.booksFinished);
  }
  return closed;
};
