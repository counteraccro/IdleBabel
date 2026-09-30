import { LETTERS } from './babelText';
import { hashText, seeded } from '../core/random';
import { writeDigits } from '../core/format';

/** Part des pages dont le numéro imprimé est le vrai : les autres ne portent que des symboles de Babel. */
export const TRUE_PAGE_NUMBER_CHANCE = 0.2;
/** Symboles d'un faux numéro : ceux de la Bibliothèque, sans l'espace. */
const SYMBOLS = `${LETTERS},.`;

/**
 * Numéro imprimé en bas de la page `page` du livre n° `book` (page 1 : la page de titre, sans numéro ;
 * 2 et 3 : la double page suivante, etc.). Le vrai numéro compte les feuilles tournées, comme le jeu
 * compte les pages lues (1 à 410, page de titre comprise) : les deux pages d'une double page portent le
 * même, celui de la page de gauche. Le plus souvent, ce n'est qu'un amas de symboles, comme le reste du
 * livre. Même page, même numéro.
 */
export const pageNumberLabel = (book: number, page: number): string | undefined => {
  if (page < 2) return undefined;
  const random = seeded(hashText(`${book}:${page}:numéro`));
  if (random() < TRUE_PAGE_NUMBER_CHANCE) return writeDigits(String(Math.floor(page / 2)));
  const length = 1 + Math.floor(random() * 3);
  return Array.from({ length }, () => SYMBOLS[Math.floor(random() * SYMBOLS.length)]).join('');
};
