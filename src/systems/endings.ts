import { starLit } from './etherium';
import { gameRandom } from '../core/random';
import { STRANGE_BOOK_INDEX } from './strangeBook';
import { S } from '../data/etheriumStars';
import { SAGA_TOMES } from '../data/sagaTomes';
import { TOME_BRIBE_PAGES } from '../data/trueStory';
import type { GameState } from '../core/state';

/**
 * Le meuble des fins (idée de l'auteur, 16/10, .ai/plan-fausses-fins.md) : onze places pour onze fausses fins, les tomes
 * de « L'histoire de Babel ». Le tome 1, « Qui j'étais », s'achète au Nord-Est de la Rose des vents ; les autres se
 * gagnent ensuite, toujours le suivant, quelle que soit leur source (le gros lot de la Loterie, la Mimic…), et seulement une fois le
 * tome 1 acheté (l'auteur, 18/10). Ceux qui ne sont pas encore écrits ne se trouvent que par le débogage.
 */
export const ENDING_TOMES = SAGA_TOMES.length;

/** Le tome `index` (0 : le tome 1) est trouvé : rangé dans le meuble des fins. */
export const tomeFound = (state: GameState, index: number): boolean =>
  index === 0 ? starLit(state, S.trueStory) : state.sagaTomes.includes(index + 1);

/** Les fausses fins trouvées (rangées en bas, lues jusqu'au bout ou pas), sur ENDING_TOMES. */
export const fakeEndingsFound = (state: GameState): number => SAGA_TOMES.filter((_, index) => tomeFound(state, index)).length;

/**
 * Le prochain tome à gagner (son index, 1 pour le tome 2) : le premier qui manque, s'il est écrit (data/trueStory.ts,
 * TOME_BRIBE_PAGES) ; aucun tant que le tome 1 n'est pas acheté (l'auteur, 18/10 : « on ne peut pas déclencher les autres
 * gains si le tome 1 n'est pas acheté »), ni quand tous les tomes écrits sont rangés.
 */
export const nextTome = (state: GameState): number | undefined => {
  if (!tomeFound(state, 0)) return undefined;
  const index = SAGA_TOMES.findIndex((_, candidate) => !tomeFound(state, candidate));
  return index > 0 && index < TOME_BRIBE_PAGES.length ? index : undefined;
};

/**
 * Ce qui fait gagner un tome : trois 7 à la Loterie, une Mimic attrapée, « Une dernière pour la route » (la tâche 21), un
 * livre pris en lisant, le centième sceau.
 */
export type TomeSource = 'jackpot' | 'mimic' | 'task' | 'reading' | 'seals';

/**
 * Le tome `index` (1 pour le tome 2) rejoint le meuble des fins ; il sera montré, en main (state.tomeToShow). La source
 * garde le premier tome qu'elle a donné : son sceau en prend le nom (data/seals.ts, l'auteur, 18/10).
 */
export const giveTome = (state: GameState, index: number, source: TomeSource): void => {
  if (tomeFound(state, index)) return;
  state.sagaTomes.push(index + 1);
  state.tomeToShow = index;
  state.tomeFrom[source] ??= index + 1;
};

/**
 * Un tome trouvé en lisant (l'auteur, 23/10 : « il apparaîtra comme un livre rare », mais ce n'en est pas un, « il se rangera
 * avec les autres ») : un livre sur 3 000 (l’auteur, 23/10), une seule fois dans la partie, le tome suivant, pas avant le livre étrange.
 */
export const READING_TOME_CHANCE = 1 / 3000;

/**
 * Le tome (son index) que cache le livre n° `index`, s'il y en a un : celui où on l'a trouvé le garde ; sinon, tiré de son
 * numéro, tant que la lecture n'a pas encore donné de tome.
 */
/** Débogage : le livre où la lecture trouvera le tome suivant. */
let forcedTomeBook: number | undefined;
export const forceReadingTome = (index: number | undefined): void => {
  forcedTomeBook = index;
};

export const tomeAt = (state: GameState, index: number): number | undefined => {
  if (state.tomeBook === index) return state.tomeFrom.reading === undefined ? undefined : state.tomeFrom.reading - 1;
  if (state.tomeFrom.reading !== undefined || index <= STRANGE_BOOK_INDEX) return undefined;
  if (index !== forcedTomeBook && gameRandom(`tome:${index}`)() >= READING_TOME_CHANCE) return undefined;
  return nextTome(state);
};

/**
 * Le livre n° `index` arrive en main : s'il cache un tome, celui-ci est trouvé et rangé au meuble des fins. `held` : il est
 * déjà en main (le livre tenu devient le tome), rien à montrer de plus ; pris pendant une absence, il sera montré au retour.
 */
export const takeTome = (state: GameState, index: number, held: boolean): number | undefined => {
  const tome = tomeAt(state, index);
  if (tome === undefined || state.tomeBook === index) return tome;
  giveTome(state, tome, 'reading');
  state.tomeBook = index;
  if (held) state.tomeToShow = null;
  return tome;
};

/** Le sceau du palier des 100 sceaux (data/seals.ts, sealsApplied). */
export const HUNDRED_SEALS = 'sealsApplied-100';

/**
 * Le palier des 100 sceaux donne le tome suivant (l'auteur, 22/10 : « ok pour 100 »), une seule fois ; atteint avant que
 * le tome 1 soit acheté, ou sans tome écrit à gagner, il attend.
 */
export const giveSealsTome = (state: GameState): void => {
  if (state.tomeFrom.seals !== undefined || !(HUNDRED_SEALS in state.seals)) return;
  const tome = nextTome(state);
  if (tome !== undefined) giveTome(state, tome, 'seals');
};

/** Ce que fait lire de plus chaque tome, aux méthodes de son Âge : le tome 2 à l'Âge Automatique, le tome 3 à l'Âge Numérique (l'auteur, 18/10). */
export const TOME_READING = 0.15;

/** Le tome 2, « On en parlait tout bas » : les méthodes de l'Âge Automatique lisent 15 % plus vite. */
export const automaticAgeMultiplier = (state: GameState): number => (tomeFound(state, 1) ? 1 + TOME_READING : 1);

/** Le tome 3, « La porte » : les méthodes de l'Âge Numérique lisent 15 % plus vite. */
export const digitalAgeMultiplier = (state: GameState): number => (tomeFound(state, 2) ? 1 + TOME_READING : 1);

/** Le tome 4, « Dedans » : 15 % de Connaissance de plus par trouvaille (l'auteur, 18/10). */
export const tomeKnowledgeMultiplier = (state: GameState): number => (tomeFound(state, 3) ? 1 + TOME_READING : 1);
