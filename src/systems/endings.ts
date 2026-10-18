import { starLit } from './etherium';
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

/** Ce qui fait gagner un tome : trois 7 à la Loterie, une Mimic attrapée. */
export type TomeSource = 'jackpot' | 'mimic';

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

/** Ce que fait lire de plus chaque tome, aux méthodes de son Âge : le tome 2 à l'Âge Automatique, le tome 3 à l'Âge Numérique (l'auteur, 18/10). */
export const TOME_READING = 0.15;

/** Le tome 2, « On en parlait tout bas » : les méthodes de l'Âge Automatique lisent 15 % plus vite. */
export const automaticAgeMultiplier = (state: GameState): number => (tomeFound(state, 1) ? 1 + TOME_READING : 1);

/** Le tome 3, « La porte » : les méthodes de l'Âge Numérique lisent 15 % plus vite. */
export const digitalAgeMultiplier = (state: GameState): number => (tomeFound(state, 2) ? 1 + TOME_READING : 1);
