import { sealEvent } from './seals';
import type { GameState } from '../core/state';

/**
 * « Les dark patterns par l'exemple » (livre rare, décidé avec l'auteur le 09/10/2026) : un manuel sérieux dont
 * les cinq premiers exemples sont des pièges. Lu dans la bibliothèque, l'exemple ouvert, le piège passe
 * par-dessus l'écran ; il a toujours deux sorties : la grande porte (il reviendra) et la vraie, cachée, qui le
 * déjoue pour de bon. Les cinq déjoués, même en plusieurs lectures : le sceau secret « escaped ».
 */

export const DARK_PATTERNS_ID = 'darkPatterns';
/** La première page du premier chapitre ; chaque chapitre a quatre pages : ouverture, motif, exemple, exercice. */
export const CHAPTER_FIRST = 7;
export const CHAPTER_PAGES = 4;
export const CHAPTERS = 10;
/** Les chapitres dont l'exemple est un piège (les cinq premiers). */
export const TRAPS = 5;
/** Les conditions générales de lecture, jusqu'à l'avant-dernière page. */
export const TERMS_FIRST = CHAPTER_FIRST + CHAPTERS * CHAPTER_PAGES;

export const chapterStart = (chapter: number): number => CHAPTER_FIRST + chapter * CHAPTER_PAGES;
/** La page de l'exemple du chapitre (toujours à droite, en face du motif). */
export const examplePage = (chapter: number): number => chapterStart(chapter) + 2;

/** Le piège de la page `page` (son chapitre), s'il y en a un. */
export const trapAt = (page: number): number | undefined => {
  for (let trap = 0; trap < TRAPS; trap++) if (examplePage(trap) === page) return trap;
  return undefined;
};

export const isTrapFoiled = (state: GameState, trap: number): boolean => state.darkPatternsFoiled.includes(trap);

/** Le piège `trap` déjoué par sa vraie sortie ; les cinq : le sceau secret. */
export const foilTrap = (state: GameState, trap: number): void => {
  if (!isTrapFoiled(state, trap)) state.darkPatternsFoiled.push(trap);
  if (state.darkPatternsFoiled.length >= TRAPS) sealEvent(state, 'escaped');
};
