import { PLAYER } from './config';
import type { Run } from './partie';

/**
 * Le livre de jeux (20/10, .ai/plan-livre-jeux.md), pas encore dans le jeu : chaque jour, trois sudokus, trois mots fléchés
 * et trois mots croisés ; une grille juste rend tant de minutes de lecture ET de Connaissance au rythme du moment, le double
 * si elle est juste dès la première vérification. Hypothèses : le bot a le livre dès le jour PLAYER.puzzleBook, résout
 * PLAYER.puzzlesPerDay grilles par jour, une tous les quarts d'heure à l'écran, dans l'ordre du livre (la plus facile de
 * chaque jeu d'abord) ; une part PLAYER.puzzleFirstTry juste du premier coup, les autres dans les vérifications gratuites.
 */

/** Minutes que rend chaque grille, dans l'ordre où le bot les fait (proposition du 20/10, à régler). */
export const PUZZLE_MINUTES = {
  sudoku: [15, 30, 60],
  words: 30,
};
const ORDER: readonly number[] = [0, 1, 2].flatMap((n) => [PUZZLE_MINUTES.sudoku[n], PUZZLE_MINUTES.words, PUZZLE_MINUTES.words]);
/** Minutes à l'écran pour une grille. */
const MINUTES_PER_GRID = 15;

/** Ce que le livre de jeux a rendu, sur toute la simulation. */
export const puzzleLog = {
  grids: 0,
  firstTry: 0,
  seconds: 0,
  pages: 0,
  knowledge: 0,
  day: -1,
  screen: 0,
  solved: 0,
  foundAt: undefined as number | undefined,
};

/** Le hasard du « premier coup », qui se répète d'une simulation à l'autre. */
let seed = 2010;
const random = (): number => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
};

/** Le temps passe à l'écran : les grilles du jour se résolvent ; minuit en apporte de nouvelles. */
export const tickPuzzles = (
  run: Run,
  seconds: number,
  pps: number,
  to: { pages: (seconds: number) => void; knowledge: (seconds: number) => void },
): void => {
  const { life } = run;
  if (PLAYER.puzzleBook < 0 || life.clock < PLAYER.puzzleBook * 86400) return;
  puzzleLog.foundAt ??= life.clock;
  const day = Math.floor(life.clock / 86400);
  if (day !== puzzleLog.day) {
    puzzleLog.day = day;
    puzzleLog.screen = 0;
    puzzleLog.solved = 0;
  }
  puzzleLog.screen += seconds;
  const perDay = Math.min(PLAYER.puzzlesPerDay, ORDER.length);
  while (puzzleLog.solved < perDay && puzzleLog.screen >= (puzzleLog.solved + 1) * MINUTES_PER_GRID * 60) {
    const first = random() < PLAYER.puzzleFirstTry;
    const given = ORDER[puzzleLog.solved] * 60 * (first ? 2 : 1);
    puzzleLog.solved += 1;
    puzzleLog.grids += 1;
    if (first) puzzleLog.firstTry += 1;
    puzzleLog.seconds += given;
    puzzleLog.pages += pps * given;
    puzzleLog.knowledge += run.knowledgeRate * given;
    to.pages(given);
    to.knowledge(given);
  }
};
