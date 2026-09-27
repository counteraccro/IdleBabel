import type { GameState } from '../core/state';
import type { PageContent } from './babelText';

/**
 * Le livre étrange : au lieu des symboles de Babel, il est rempli de chiffres, et ces chiffres
 * semblent évoluer. C'est le troisième livre que le chercheur prend en main ; il le garde ensuite.
 */
export const STRANGE_BOOK_INDEX = 2;

export const isStrangeBook = (bookIndex: number): boolean => bookIndex === STRANGE_BOOK_INDEX;

/** Débogage : le livre est accessible et tous ses chiffres sont visibles, sans l'avoir trouvé. */
let revealed = false;
export const revealStats = (on: boolean): void => {
  revealed = on;
};
export const statsRevealed = (): boolean => revealed;

/** Le livre a été pris en main au moins une fois : on peut l'ouvrir en grand. */
export const strangeBookFound = (state: GameState): boolean => revealed || state.booksFinished >= STRANGE_BOOK_INDEX;

/** Des nombres de un à six chiffres, et parfois un point. */
export const randomDigitText = (length: number, random: () => number = Math.random): string => {
  let text = '';
  while (text.length < length) {
    const size = 1 + Math.floor(random() * 6);
    for (let i = 0; i < size; i++) text += Math.floor(random() * 10);
    text += random() < 0.08 ? '. ' : ' ';
  }
  return text.trim();
};

export const createDigitPage = (length: number, random: () => number = Math.random): PageContent => ({
  before: randomDigitText(length, random),
  after: '',
});
