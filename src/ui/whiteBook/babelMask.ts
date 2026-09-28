import { LETTERS } from '../../systems/babelText';
import { hash } from '../strangeBook/pageItems';

/**
 * Texte pas encore révélé : chaque lettre devient un symbole de Babel (toujours le même pour une même
 * graine), les espaces, la ponctuation et les chiffres restent. La page garde la forme de ce qu'elle dira.
 */
export const babelize = (text: string, seed: number): string =>
  [...text].map((char, index) => (/\p{L}/u.test(char) ? LETTERS[hash(seed, index) % LETTERS.length] : char)).join('');

/** Graine tirée d'un texte (identifiant de phrase, nom de champ). */
export const seedOf = (text: string): number => [...text].reduce((sum, char) => (Math.imul(sum, 31) + char.charCodeAt(0)) >>> 0, 7);
