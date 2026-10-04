import { RARE_BOOKS } from '../data/rareBooks';
import { gameRandom } from '../core/random';
import { STRANGE_BOOK_INDEX } from './strangeBook';
import { rareChance } from './technologies';
import type { GameState } from '../core/state';

/** Un livre sur 200 est un livre rare (tant qu'il en reste à trouver), avant le Flair. */
export const RARE_CHANCE = 1 / 200;
/**
 * Chaque livre rare trouvé rend le suivant plus rare d'autant (décision de l'auteur, 04/10) : les premiers
 * viennent vite, les derniers sont une récompense de très long terme (le 23e : un livre sur 27 000 environ).
 */
export const RARITY_GROWTH = 1.25;

/** La chance qu'un livre soit rare quand `found` livres rares sont déjà trouvés ; `chance` : celle du Flair. */
export const nextRareChance = (found: number, chance = RARE_CHANCE): number => chance / RARITY_GROWTH ** found;
/** Pas avant le livre étrange : les premiers livres restent ordinaires. */
const FIRST_RARE_INDEX = STRANGE_BOOK_INDEX + 1;

/** Débogage : livres rares imposés à des numéros de livre. */
const forced = new Map<number, string>();
export const forceRareBook = (index: number, id: string | undefined): void => {
  if (id) forced.set(index, id);
  else forced.delete(index);
};

export const isRareBookFound = (state: GameState, id: string): boolean => id in state.rareBooks;

/**
 * Le livre rare que tirerait le livre n° `index`, si ceux de `found` étaient déjà trouvés. Tiré de son
 * numéro (toujours le même tant que rien ne change), parmi ceux qui restent ; `chance` : celle d'être rare
 * selon le Flair (il la monte : un livre rare le reste), plus basse à chaque livre rare déjà trouvé.
 */
export const drawRareBook = (index: number, found: (id: string) => boolean, chance = RARE_CHANCE): string | undefined => {
  const imposed = forced.get(index);
  if (imposed && !found(imposed)) return imposed;
  if (index < FIRST_RARE_INDEX) return undefined;
  const left = RARE_BOOKS.filter((book) => !found(book.id));
  const random = gameRandom(`rare:${index}`);
  if (random() >= nextRareChance(RARE_BOOKS.length - left.length, chance)) return undefined;
  const total = left.reduce((sum, book) => sum + (book.weight ?? 1), 0);
  let roll = random() * total;
  return left.find((book) => (roll -= book.weight ?? 1) < 0)?.id;
};

/**
 * Le livre rare que cache le livre n° `index`, s'il y en a un, parmi ceux pas encore trouvés ; un livre où
 * l'on en a déjà trouvé un le garde.
 */
export const rareBookAt = (state: GameState, index: number): string | undefined => {
  const kept = Object.keys(state.rareBooks).find((id) => state.rareBooks[id] === index);
  if (kept) return kept;
  return drawRareBook(index, (id) => isRareBookFound(state, id), rareChance(state));
};

/** Le livre n° `index` arrive en main : s'il est rare, il est trouvé (pour toujours). */
export const takeBook = (state: GameState, index: number): string | undefined => {
  const id = rareBookAt(state, index);
  if (id && !isRareBookFound(state, id)) state.rareBooks[id] = index;
  return id;
};
