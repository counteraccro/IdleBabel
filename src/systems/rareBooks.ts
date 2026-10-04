import { RARE_BOOKS } from '../data/rareBooks';
import { gameRandom } from '../core/random';
import { STRANGE_BOOK_INDEX } from './strangeBook';
import { sealEvent } from './seals';
import type { GameState } from '../core/state';

/** Un livre sur 200 est un livre rare (tant qu'il en reste à trouver). */
export const RARE_CHANCE = 1 / 200;
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
 * numéro (toujours le même tant que rien ne change), parmi ceux qui restent.
 */
export const drawRareBook = (index: number, found: (id: string) => boolean): string | undefined => {
  const imposed = forced.get(index);
  if (imposed && !found(imposed)) return imposed;
  if (index < FIRST_RARE_INDEX) return undefined;
  const random = gameRandom(`rare:${index}`);
  if (random() >= RARE_CHANCE) return undefined;
  const left = RARE_BOOKS.filter((book) => !found(book.id));
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
  return drawRareBook(index, (id) => isRareBookFound(state, id));
};

/** Le livre n° `index` arrive en main : s'il est rare, il est trouvé (pour toujours). */
export const takeBook = (state: GameState, index: number): string | undefined => {
  const id = rareBookAt(state, index);
  if (id && !isRareBookFound(state, id)) {
    state.rareBooks[id] = index;
    // Secret : le joueur l'avait lu, à sa place, dans le Catalogue des catalogues (systems/catalogue.ts).
    if (state.catalogueSpotted.includes(id)) sealEvent(state, 'trueCatalogue');
  }
  return id;
};
