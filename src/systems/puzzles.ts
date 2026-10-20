import {
  FIRST_TRY,
  FREE_MISSES,
  GLORY_MISSES,
  MISS_COST,
  PUZZLE_GRIDS,
  PUZZLE_MINUTES,
  kindOf,
  numberOf,
  type PuzzleGridId,
} from '../data/puzzles';
import { dayOf } from './dailyTasks';
import { expected, makeDay, type PuzzleGrid, type PuzzleWord } from './puzzleGrids';
import { sealEvent } from './seals';
import { giveMinutes } from './tasks';
import type { GameState, PuzzleProgress } from '../core/state';
import type { Locale } from '../i18n';

/**
 * « 410 grilles de JEUX » (livre rare, décidé avec l'auteur le 20/10/2026 ; plan .ai/plan-livre-jeux.md) : chaque jour,
 * neuf grilles tirées de la graine de la partie et de la date. Dans la bibliothèque, on remplit une grille au clavier, puis
 * on la vérifie : juste, elle rapporte des minutes de lecture et de Connaissance au rythme du moment (le double du premier
 * coup) ; fausse, les cases fausses sont montrées, trois vérifications ratées sont gratuites, chacune des suivantes ôte 10 %
 * du gain. À minuit, les grilles d'hier s'effacent. Quatre sceaux.
 */

export { PUZZLES_ID } from '../data/puzzles';

/** La réserve de mots de chaque langue, chargée à l'ouverture du livre (le reste du jeu n'en a pas besoin). */
const WORDS: Record<Locale, () => Promise<{ default: readonly PuzzleWord[] }>> = {
  fr: () => import('../data/puzzleWords/fr'),
  en: () => import('../data/puzzleWords/en'),
};
const loaded = new Map<Locale, readonly PuzzleWord[]>();

export const loadPuzzleWords = async (locale: Locale): Promise<readonly PuzzleWord[]> => {
  if (!loaded.has(locale)) loaded.set(locale, (await WORDS[locale]()).default);
  return loaded.get(locale)!;
};

/** Pour les tests : la réserve donnée d'avance. */
export const setPuzzleWords = (locale: Locale, words: readonly PuzzleWord[]): void => {
  loaded.set(locale, words);
};

/** Le jour des grilles a changé (minuit, heure du joueur) : celles d'hier s'effacent. */
export const refreshPuzzles = (state: GameState, now = Date.now()): void => {
  const day = dayOf(now);
  if (state.puzzles.day === day) return;
  state.puzzles.day = day;
  state.puzzles.grids = {};
};

/** Les grilles du jour (gardées : les tirer prend un quart de seconde) ; null tant que la réserve de mots n'est pas là. */
let cached: { key: string; grids: Record<PuzzleGridId, PuzzleGrid> } | null = null;
export const todayGrids = (state: GameState, locale: Locale): Record<PuzzleGridId, PuzzleGrid> | null => {
  const words = loaded.get(locale);
  if (!words) return null;
  const key = `${state.seed}:${state.puzzles.day}:${locale}`;
  if (cached?.key !== key) cached = { key, grids: makeDay(state.seed, state.puzzles.day, words) };
  return cached.grids;
};

/** La clé d'une grille dans la partie : les grilles de mots changent avec la langue, pas les sudokus. */
export const puzzleKey = (id: PuzzleGridId, locale: Locale): string => (kindOf(id) === 'sudoku' ? id : `${id}.${locale}`);

export const progressOf = (state: GameState, id: PuzzleGridId, locale: Locale): PuzzleProgress =>
  (state.puzzles.grids[puzzleKey(id, locale)] ??= { cells: {}, misses: 0 });

/** Ce que rapporterait la grille juste maintenant, en minutes : double du premier coup, moins 10 % par raté au-delà de trois. */
export const puzzleReward = (id: PuzzleGridId, misses: number): number => {
  const base = PUZZLE_MINUTES[kindOf(id)][numberOf(id)];
  if (misses === 0) return base * FIRST_TRY;
  return Math.round(base * Math.max(0, 1 - MISS_COST * Math.max(0, misses - FREE_MISSES)));
};

/** Les vérifications gratuites qui restent. */
export const freeChecksLeft = (misses: number): number => Math.max(0, FREE_MISSES - misses);

/** Une case remplie (un chiffre, une lettre) ou effacée (null). */
export const writeCell = (state: GameState, id: PuzzleGridId, locale: Locale, cell: number, value: string | null): void => {
  const progress = progressOf(state, id, locale);
  if (progress.solved !== undefined) return;
  if (value === null) delete progress.cells[cell];
  else progress.cells[cell] = value;
};

export interface Check {
  empty: number;
  wrong: Set<number>;
  /** Résolue à cette vérification : les minutes rapportées (0 : pour la gloire). */
  solved?: number;
}

/** Les neuf grilles du jour sont-elles toutes résolues (dans n'importe quelle langue) ? */
const allNine = (state: GameState): boolean =>
  PUZZLE_GRIDS.every((id) =>
    Object.entries(state.puzzles.grids).some(([key, progress]) => key.split('.')[0] === id && progress.solved !== undefined),
  );

/** « Vérifier » : les cases vides et fausses ; juste, la grille est résolue et rapporte ses minutes. */
export const checkGrid = (state: GameState, id: PuzzleGridId, grid: PuzzleGrid, locale: Locale): Check => {
  const progress = progressOf(state, id, locale);
  const answers = expected(grid);
  const empty = [...answers.keys()].filter((k) => !progress.cells[k]).length;
  const wrong = new Set([...answers].filter(([k, v]) => progress.cells[k] && progress.cells[k] !== v).map(([k]) => k));
  if (progress.solved !== undefined) return { empty: 0, wrong: new Set(), solved: progress.solved };
  if (empty > 0 || wrong.size > 0) {
    progress.misses += 1;
    return { empty, wrong };
  }
  const minutes = puzzleReward(id, progress.misses);
  progress.solved = minutes;
  state.puzzles.solved += 1;
  if (minutes > 0) giveMinutes(state, minutes);
  sealEvent(state, 'puzzlesFirst');
  if (id === 'sudoku2' && progress.misses === 0) sealEvent(state, 'puzzlesNoEraser');
  if (progress.misses >= GLORY_MISSES) sealEvent(state, 'puzzlesGlory');
  if (allNine(state)) sealEvent(state, 'puzzlesAll');
  return { empty: 0, wrong, solved: minutes };
};
