import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';

/** Tous les livres de la Bibliothèque ont 410 pages (Borges), comme le Livre Total. */
export const PAGES_PER_BOOK = 410;

/**
 * Une page du livre en main vient d'être tournée à l'écran (clic ou production).
 * Renvoie true si le livre est terminé : le chercheur le referme et en prend un autre.
 */
export const turnBookPage = (state: GameState): boolean => {
  state.bookPage += 1;
  if (state.bookPage < PAGES_PER_BOOK) return false;
  state.bookPage = 0;
  state.booksFinished += 1;
  recordOnce(state, 'firstBook');
  return true;
};

/** Avancement dans le livre en main, de 0 (ouvert au début) à 1 (dernière page). */
export const bookProgress = (state: GameState): number => state.bookPage / PAGES_PER_BOOK;
