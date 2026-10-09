import { sealEvent } from './seals';
import type { GameState } from '../core/state';

/**
 * « Le Lapin de garenne » (livre rare, décidé avec l'auteur le 09/10/2026) : un traité d'histoire naturelle très
 * sérieux dont le modèle s'est échappé (dans les douze planches, sa place est vide). Lu dans la bibliothèque, le
 * Lapin blanc d'Alice traverse parfois une double page en bondissant ; attrapé, il s'échappe et revient plus loin,
 * plus vite. La troisième fois, il rentre dans ses planches : le sceau secret « rabbitHome ».
 */

export const RABBIT_ID = 'rabbit';
/** La première page du premier chapitre ; chaque chapitre : son ouverture (page de droite), sa planche en face, son texte. */
export const CHAPTER_FIRST = 7;
export const CHAPTER_PAGES = 32;
export const CHAPTERS = 12;
/** La table alphabétique, jusqu'à l'avant-dernière page. */
export const INDEX_FIRST = CHAPTER_FIRST + CHAPTERS * CHAPTER_PAGES;
/** Les prises qu'il faut pour qu'il rentre. */
export const CATCHES = 3;
/** La chance qu'il traverse une double page qui s'ouvre (une sur quatre, comme validé avec l'auteur). */
export const RUN_CHANCE = 1 / 4;

export const chapterStart = (chapter: number): number => CHAPTER_FIRST + chapter * CHAPTER_PAGES;
/** La planche hors-texte du chapitre : la page qui suit son ouverture (à gauche, en face du texte). */
export const platePage = (chapter: number): number => chapterStart(chapter) + 1;

/** Rentré dans ses planches : il ne court plus. */
export const rabbitHome = (state: GameState): boolean => state.rabbitCaught >= CATCHES;

/**
 * Traverse-t-il la double page dont `page` est la page de droite ? Seulement dès le premier chapitre, tant qu'il
 * n'est pas rentré ; `roll`, un tirage entre 0 et 1.
 */
export const rabbitRuns = (state: GameState, page: number, roll: number): boolean =>
  !rabbitHome(state) && page % 2 === 1 && page >= CHAPTER_FIRST && roll < RUN_CHANCE;

/** Il est attrapé : une prise de plus ; la troisième, il rentre (le sceau secret). */
export const catchRabbit = (state: GameState): void => {
  if (rabbitHome(state)) return;
  state.rabbitCaught += 1;
  if (rabbitHome(state)) sealEvent(state, 'rabbitHome');
};
