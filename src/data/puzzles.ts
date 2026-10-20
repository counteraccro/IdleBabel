/**
 * « 410 grilles de JEUX » (livre rare, décidé avec l'auteur le 20/10/2026 ; maquette .ai/maquette-livre-jeux.html, plan
 * .ai/plan-livre-jeux.md) : un cahier de jeux du kiosque. Chaque jour, neuf grilles tirées de la graine de la partie et de
 * la date : trois sudokus, trois mots fléchés, trois mots croisés.
 */

export const PUZZLES_ID = 'puzzles';

/** Les neuf grilles du jour, dans l'ordre du livre. */
export const PUZZLE_GRIDS = [
  'sudoku0',
  'sudoku1',
  'sudoku2',
  'arrows0',
  'arrows1',
  'arrows2',
  'crossword0',
  'crossword1',
  'crossword2',
] as const;
export type PuzzleGridId = (typeof PUZZLE_GRIDS)[number];
export type PuzzleKind = 'sudoku' | 'arrows' | 'crossword';

export const kindOf = (id: PuzzleGridId): PuzzleKind => id.slice(0, -1) as PuzzleKind;
export const numberOf = (id: PuzzleGridId): number => Number(id.slice(-1));

/** Les chiffres donnés des trois sudokus (au plus : la solution unique peut en demander un ou deux de plus). */
export const SUDOKU_GIVENS = [36, 30, 25];

/**
 * Une grille juste rapporte tant de minutes de la partie, en lecture ET en Connaissance, au rythme du moment (simulé le
 * 20/10, simulateur/jeux.ts : trois grilles par jour, ~+7,5 % d'Éther en 30 jours).
 */
export const PUZZLE_MINUTES: Readonly<Record<PuzzleKind, readonly number[]>> = {
  sudoku: [15, 30, 60],
  arrows: [30, 30, 30],
  crossword: [30, 30, 30],
};

/** Juste dès la première vérification : le gain double (l'auteur, 20/10). */
export const FIRST_TRY = 2;
/**
 * Les vérifications ratées : les trois premières sont gratuites, chacune des suivantes ôte 10 % du gain (l'auteur, 20/10 :
 * « pour 10% c'est bien, cela laisse 13 essais ») ; au 13ᵉ raté, il ne reste rien, la grille se finit pour la gloire.
 */
export const FREE_MISSES = 3;
export const MISS_COST = 0.1;
export const GLORY_MISSES = FREE_MISSES + Math.round(1 / MISS_COST);

/** La taille des grilles de mots : fléchés 9 × 10 (définitions comprises), croisés 13 × 13 et 22 mots au plus. */
export const ARROWS_SIZE = { width: 9, height: 10 };
export const CROSSWORD_SIZE = { width: 13, height: 13, words: 22 };
