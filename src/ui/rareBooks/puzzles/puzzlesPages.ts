import { getLocale, messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { kindOf, type PuzzleGridId } from '../../../data/puzzles';
import {
  BOX,
  KEY,
  answersOf,
  cellsOf,
  wordAt,
  type Direction,
  type PuzzleGrid,
  type SudokuGrid,
  type WordGrid,
} from '../../../systems/puzzleGrids';
import { checkGrid, freeChecksLeft, puzzleKey, puzzleReward, refreshPuzzles, todayGrids, writeCell } from '../../../systems/puzzles';
import {
  BIG,
  CLUE,
  GOLD,
  GRID,
  H,
  INK,
  NAVY,
  PEN,
  RED,
  ROUND,
  TEAL,
  W,
  WRONG,
  arrow,
  fit,
  fitClue,
  header,
  outlined,
  para,
  speckle,
  stamp,
  text,
} from './puzzlesDraw';
import type { GameState, PuzzleProgress } from '../../../core/state';

/**
 * Les pages de « 410 grilles de JEUX » (maquette .ai/maquette-livre-jeux.html) : la page de titre, puis par doubles pages
 * « Comment jouer » et la règle du sudoku, les trois sudokus, la règle des mots fléchés, les trois grilles, la règle des
 * mots croisés, les trois grilles avec leurs définitions en face ; puis des grilles de Babel jusqu'à la 410ᵉ page. Dans la
 * bibliothèque, on clique une case puis on tape au clavier ; « Vérifier » sous chaque grille.
 */

type Rule = 'play' | 'sudoku' | 'arrows' | 'crossword';
type Content =
  | { kind: 'title' }
  | { kind: 'rules'; rule: Rule }
  | { kind: 'grid'; id: PuzzleGridId }
  | { kind: 'defs'; id: PuzzleGridId }
  | { kind: 'babel' };

const PAGES: Readonly<Record<number, Content>> = {
  1: { kind: 'title' },
  2: { kind: 'rules', rule: 'play' },
  3: { kind: 'rules', rule: 'sudoku' },
  4: { kind: 'grid', id: 'sudoku0' },
  5: { kind: 'grid', id: 'sudoku1' },
  6: { kind: 'grid', id: 'sudoku2' },
  7: { kind: 'rules', rule: 'arrows' },
  8: { kind: 'grid', id: 'arrows0' },
  9: { kind: 'grid', id: 'arrows1' },
  10: { kind: 'grid', id: 'arrows2' },
  11: { kind: 'rules', rule: 'crossword' },
  12: { kind: 'grid', id: 'crossword0' },
  13: { kind: 'defs', id: 'crossword0' },
  14: { kind: 'grid', id: 'crossword1' },
  15: { kind: 'defs', id: 'crossword1' },
  16: { kind: 'grid', id: 'crossword2' },
  17: { kind: 'defs', id: 'crossword2' },
};
const contentOf = (page: number): Content => PAGES[page] ?? { kind: 'babel' };
const pageOf = (id: PuzzleGridId): number => Number(Object.entries(PAGES).find(([, c]) => c.kind === 'grid' && c.id === id)![0]);

const texts = () => messages().rareBooks.puzzles;
const plural = (forms: readonly string[], n: number): string => forms[n > 1 ? 1 : 0].replace('{n}', String(n));

/** Des minutes en clair : « 30 min », « 1 h », « 1 h 30 » ; 0 : rien. */
export const minutesText = (minutes: number): string => {
  const book = texts();
  if (minutes <= 0) return book.nothing;
  if (minutes < 60) return book.minutes.replace('{n}', String(minutes));
  const [h, m] = [Math.floor(minutes / 60), minutes % 60];
  return (m ? book.hoursMinutes : book.hours).replace('{h}', String(h)).replace('{mm}', String(m).padStart(2, '0'));
};

const dateLabel = (day: string): string =>
  new Date(`${day}T12:00`).toLocaleDateString(texts().locale, { weekday: 'long', day: 'numeric', month: 'long' });

// ————— Où le joueur en est (le temps de la séance) —————

/** La case choisie : la grille, la case, le sens d'écriture (grilles de mots). */
let focus: { id: PuzzleGridId; cell: number; dir: Direction } | null = null;
/** Les cases fausses montrées par « Vérifier », le message sous chaque grille. */
const wrong = new Map<PuzzleGridId, Set<number>>();
const notes = new Map<PuzzleGridId, string>();
/** La double page sous les yeux ; le jour des grilles montrées (minuit efface tout). */
let spread = -1;
let shownDay = '';

const forget = (): void => {
  focus = null;
  wrong.clear();
  notes.clear();
};

/** Les grilles du jour, le jour changé s'il le faut ; null tant que la réserve de mots n'est pas chargée. */
const gridsOf = (state: GameState): ReturnType<typeof todayGrids> => {
  refreshPuzzles(state);
  if (state.puzzles.day !== shownDay) {
    shownDay = state.puzzles.day;
    forget();
  }
  return todayGrids(state, getLocale());
};

const NO_PROGRESS: PuzzleProgress = { cells: {}, misses: 0 };
const progress = (state: GameState, id: PuzzleGridId): PuzzleProgress => state.puzzles.grids[puzzleKey(id, getLocale())] ?? NO_PROGRESS;

// ————— La géométrie des pages (pour dessiner et pour cliquer) —————

type Box = { x: number; y: number; w: number; h: number };
const inside = (box: Box, x: number, y: number): boolean => x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;

const VERIFY: Box = { x: W / 2 - 90, y: 718, w: 180, h: 44 };
const SUDOKU = { size: 58, x0: (W - 58 * 9) / 2, y0: 140 };
const ARROWS = { size: 55, y0: 122 };
const CROSSWORD = { size: 40, y0: 130 };

/** Les cases d'une grille : la case (indice du sudoku, KEY des mots) et sa boîte. */
const cellBoxes = (grid: PuzzleGrid): { cell: number; box: Box }[] => {
  if (grid.kind === 'sudoku')
    return [...Array(81).keys()].map((i) => ({
      cell: i,
      box: { x: SUDOKU.x0 + (i % 9) * SUDOKU.size, y: SUDOKU.y0 + Math.floor(i / 9) * SUDOKU.size, w: SUDOKU.size, h: SUDOKU.size },
    }));
  const { size, y0 } = grid.kind === 'arrows' ? ARROWS : CROSSWORD;
  const x0 = Math.round((W - size * grid.width) / 2);
  return [...grid.cells.keys()].map((k) => ({
    cell: k,
    box: { x: x0 + (k % 100) * size, y: y0 + Math.floor(k / 100) * size, w: size, h: size },
  }));
};

/** Les lignes des définitions des mots croisés, en face de la grille. */
const definitionLines = (grid: WordGrid): { dir: Direction; title?: string; word?: (typeof grid.placed)[number]; y: number }[] => {
  const book = texts();
  const line = Math.min(27, (H - 140 - 60 - 2 * 48) / Math.max(1, grid.placed.length));
  const out: { dir: Direction; title?: string; word?: (typeof grid.placed)[number]; y: number }[] = [];
  let y = 140;
  for (const [dir, title] of [
    ['a', book.across],
    ['d', book.down],
  ] as const) {
    out.push({ dir, title, y });
    y += 30;
    for (const word of grid.placed.filter((p) => p.d === dir).sort((a, b) => a.n - b.n)) {
      out.push({ dir, word, y });
      y += line;
    }
    y += 18;
  }
  return out;
};
const lineHeight = (grid: WordGrid): number => Math.min(27, (H - 140 - 60 - 2 * 48) / Math.max(1, grid.placed.length));

// ————— Le dessin —————

const verifyArea = (context: CanvasRenderingContext2D, id: PuzzleGridId, color: string, mine: PuzzleProgress): void => {
  const book = texts();
  if (mine.solved !== undefined) {
    const line =
      mine.solved === 0 ? book.solvedGlory : (mine.misses === 0 ? book.solvedFirst : book.solved).replace('{m}', minutesText(mine.solved));
    text(context, line, W / 2, 748, `600 ${fit(context, line, (px) => `600 ${px}px ${ROUND}`, 18, W - 80)}px ${ROUND}`, color);
    return;
  }
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(VERIFY.x, VERIFY.y, VERIFY.w, VERIFY.h, 22);
  context.fill();
  text(context, book.verify, W / 2, VERIFY.y + 31, `22px ${BIG}`, '#fff');
  const note = notes.get(id);
  if (note)
    text(
      context,
      note,
      W / 2,
      VERIFY.y - 12,
      `600 ${fit(context, note, (px) => `600 ${px}px ${ROUND}`, 19, W - 80)}px ${ROUND}`,
      '#6a6050',
    );
};

const solvedStamp = (context: CanvasRenderingContext2D, y: number, mine: PuzzleProgress): void => {
  if (mine.solved === undefined) return;
  const book = texts();
  const line =
    mine.solved === 0 ? book.stampGlory : (mine.misses === 0 ? book.stampFirst : book.stampGain).replace('{m}', minutesText(mine.solved));
  stamp(context, W / 2, y, book.stamp, line);
};

const paintSudoku = (context: CanvasRenderingContext2D, id: PuzzleGridId, grid: SudokuGrid, mine: PuzzleProgress): void => {
  const bad = wrong.get(id);
  const selected = focus?.id === id ? focus.cell : -1;
  for (const { cell: i, box } of cellBoxes(grid)) {
    const { x, y, w } = box;
    if (selected >= 0 && (Math.floor(selected / 9) === Math.floor(i / 9) || selected % 9 === i % 9 || BOX(selected) === BOX(i))) {
      context.fillStyle = 'rgba(23,163,160,0.10)';
      context.fillRect(x, y, w, w);
    }
    if (i === selected) {
      context.fillStyle = 'rgba(242,165,29,0.45)';
      context.fillRect(x, y, w, w);
    }
    if (bad?.has(i)) {
      context.fillStyle = 'rgba(210,58,44,0.18)';
      context.fillRect(x, y, w, w);
    }
    if (grid.puzzle[i]) text(context, String(grid.puzzle[i]), x + w / 2, y + 41, `800 32px ${GRID}`, INK);
    else if (mine.cells[i]) text(context, mine.cells[i], x + w / 2, y + 41, `500 32px ${ROUND}`, bad?.has(i) ? WRONG : PEN);
  }
  const { size, x0, y0 } = SUDOKU;
  context.strokeStyle = INK;
  for (let k = 0; k <= 9; k++) {
    context.lineWidth = k % 3 ? 1 : 3;
    context.beginPath();
    context.moveTo(x0, y0 + k * size);
    context.lineTo(x0 + 9 * size, y0 + k * size);
    context.stroke();
    context.beginPath();
    context.moveTo(x0 + k * size, y0);
    context.lineTo(x0 + k * size, y0 + 9 * size);
    context.stroke();
  }
  verifyArea(context, id, TEAL, mine);
  solvedStamp(context, 400, mine);
};

const paintArrows = (context: CanvasRenderingContext2D, id: PuzzleGridId, grid: WordGrid, mine: PuzzleProgress): void => {
  const bad = wrong.get(id);
  const { size, y0 } = ARROWS;
  const x0 = Math.round((W - size * grid.width) / 2);
  const word = focus?.id === id ? wordAt(grid, focus.cell, focus.dir) : undefined;
  const inWord = word ? cellsOf(word) : [];
  const arrows: [number, number, Direction][] = [];
  for (let r = 0; r < grid.height; r++)
    for (let c = 0; c < grid.width; c++) {
      const [k, x, y] = [KEY(r, c), x0 + c * size, y0 + r * size];
      const value = grid.cells.get(k);
      if (value === '#') {
        const clue = grid.clues.get(k) ?? {};
        context.fillStyle = CLUE;
        context.fillRect(x, y, size, size);
        if (clue.a && clue.d) {
          context.strokeStyle = INK;
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(x, y + size / 2);
          context.lineTo(x + size, y + size / 2);
          context.stroke();
          fitClue(context, clue.a, x, y, size - 6, size / 2);
          arrows.push([x + size + 1, y + size / 4, 'a']);
          fitClue(context, clue.d, x, y + size / 2, size, size / 2);
          arrows.push([x + size / 2, y + size + 1, 'd']);
        } else if (clue.a) {
          fitClue(context, clue.a, x, y, size - 6, size);
          arrows.push([x + size + 1, y + size / 2, 'a']);
        } else if (clue.d) {
          fitClue(context, clue.d, x, y, size, size - 6);
          arrows.push([x + size / 2, y + size + 1, 'd']);
        }
      } else if (value) {
        context.fillStyle = inWord.includes(k) ? 'rgba(242,165,29,0.22)' : '#fff';
        context.fillRect(x, y, size, size);
        if (focus?.id === id && focus.cell === k) {
          context.fillStyle = 'rgba(242,165,29,0.55)';
          context.fillRect(x, y, size, size);
        }
        if (bad?.has(k)) {
          context.fillStyle = 'rgba(210,58,44,0.18)';
          context.fillRect(x, y, size, size);
        }
        if (mine.cells[k]) text(context, mine.cells[k], x + size / 2, y + 39, `500 30px ${ROUND}`, bad?.has(k) ? WRONG : PEN);
      } else {
        context.fillStyle = '#e8e2d2';
        context.fillRect(x, y, size, size);
      }
    }
  context.strokeStyle = INK;
  context.lineWidth = 1.2;
  for (let r = 0; r <= grid.height; r++) {
    context.beginPath();
    context.moveTo(x0, y0 + r * size);
    context.lineTo(x0 + grid.width * size, y0 + r * size);
    context.stroke();
  }
  for (let c = 0; c <= grid.width; c++) {
    context.beginPath();
    context.moveTo(x0 + c * size, y0);
    context.lineTo(x0 + c * size, y0 + grid.height * size);
    context.stroke();
  }
  context.lineWidth = 3;
  context.strokeRect(x0, y0, grid.width * size, grid.height * size);
  for (const [ax, ay, dir] of arrows) arrow(context, ax, ay, dir);
  verifyArea(context, id, GOLD, mine);
  solvedStamp(context, 420, mine);
};

const paintCrossword = (context: CanvasRenderingContext2D, id: PuzzleGridId, grid: WordGrid, mine: PuzzleProgress): void => {
  const bad = wrong.get(id);
  const word = focus?.id === id ? wordAt(grid, focus.cell, focus.dir) : undefined;
  const inWord = word ? cellsOf(word) : [];
  const numbers = new Map(grid.placed.map((p) => [KEY(p.r, p.c), p.n]));
  const boxes = cellBoxes(grid);
  for (const { cell: k, box } of boxes) {
    const { x, y, w: size } = box;
    context.fillStyle = inWord.includes(k) ? 'rgba(226,72,58,0.16)' : '#fff';
    context.fillRect(x, y, size, size);
    if (focus?.id === id && focus.cell === k) {
      context.fillStyle = 'rgba(226,72,58,0.38)';
      context.fillRect(x, y, size, size);
    }
    if (bad?.has(k)) {
      context.fillStyle = 'rgba(210,58,44,0.18)';
      context.fillRect(x, y, size, size);
    }
    if (numbers.has(k)) text(context, String(numbers.get(k)), x + 3, y + 12, `700 11px ${GRID}`, INK, 'left');
    if (mine.cells[k]) text(context, mine.cells[k], x + size / 2, y + 30, `500 24px ${ROUND}`, bad?.has(k) ? WRONG : PEN);
  }
  // Les bords après tous les fonds (sinon le fond d'une case mange la moitié du bord de sa voisine), sur des pixels
  // entiers : un bord commun tracé deux fois reste pareil à un bord du tour.
  context.strokeStyle = INK;
  context.lineWidth = 2;
  for (const { box } of boxes) context.strokeRect(box.x, box.y, box.w, box.h);
  verifyArea(context, id, RED, mine);
  solvedStamp(context, 400, mine);
};

const paintDefinitions = (context: CanvasRenderingContext2D, id: PuzzleGridId, grid: WordGrid): void => {
  const word = focus?.id === id ? wordAt(grid, focus.cell, focus.dir) : undefined;
  const line = lineHeight(grid);
  const small = Math.round(line * 0.63);
  for (const entry of definitionLines(grid)) {
    if (entry.title) {
      text(context, entry.title, 52, entry.y, `700 22px ${ROUND}`, RED, 'left');
      continue;
    }
    const p = entry.word!;
    if (word === p) {
      context.fillStyle = 'rgba(226,72,58,0.14)';
      context.fillRect(46, entry.y - line * 0.7, W - 92, line);
    }
    text(context, `${p.n}.`, 84, entry.y, `800 ${small}px ${GRID}`, INK, 'right');
    const clue = `${p.long} (${p.word.length})`;
    text(context, clue, 94, entry.y, `500 ${fit(context, clue, (px) => `500 ${px}px ${GRID}`, small, W - 150)}px ${GRID}`, '#333', 'left');
  }
};

const RULE_COLORS: Record<Rule, string> = { play: NAVY, sudoku: TEAL, arrows: GOLD, crossword: RED };

const paintRules = (context: CanvasRenderingContext2D, rule: Rule): void => {
  const book = texts();
  const paragraphs = book.rules[rule][1] as readonly string[];
  let y = 160;
  paragraphs.forEach((paragraph, i) => (y = para(context, paragraph, 60, i === 0 ? y : y + 20, W - 120, 24)));
  if (rule === 'play') {
    context.fillStyle = NAVY;
    context.beginPath();
    context.roundRect(W / 2 - 90, y + 40, 180, 44, 22);
    context.fill();
    text(context, book.verify, W / 2, y + 71, `22px ${BIG}`, '#fff');
  } else if (rule === 'sudoku') {
    const [size, x0, y0] = [52, W / 2 - 52 * 1.5, y + 40];
    [5, 3, 7, 6, 1, 9, 8, 4, 2].forEach((v, i) =>
      text(
        context,
        String(v),
        x0 + (i % 3) * size + size / 2,
        y0 + Math.floor(i / 3) * size + 36,
        `${i === 4 ? 500 : 800} 28px ${i === 4 ? ROUND : GRID}`,
        i === 4 ? PEN : INK,
      ),
    );
    context.strokeStyle = INK;
    context.lineWidth = 1;
    for (let k = 1; k < 3; k++) {
      context.beginPath();
      context.moveTo(x0, y0 + k * size);
      context.lineTo(x0 + 3 * size, y0 + k * size);
      context.moveTo(x0 + k * size, y0);
      context.lineTo(x0 + k * size, y0 + 3 * size);
      context.stroke();
    }
    context.lineWidth = 3;
    context.strokeRect(x0, y0, 3 * size, 3 * size);
    para(context, book.sudokuExample, 60, y0 + 3 * size + 40, W - 120, 20, '#6a6050');
  } else if (rule === 'arrows') {
    const [clue, answer] = book.arrowsExample;
    const [size, y0] = [62, y + 40];
    const x0 = W / 2 - (size * (answer.length + 1)) / 2;
    context.fillStyle = CLUE;
    context.fillRect(x0, y0, size, size);
    fitClue(context, clue, x0, y0, size - 6, size);
    [...answer].forEach((letter, i) => {
      context.fillStyle = '#fff';
      context.fillRect(x0 + (i + 1) * size, y0, size, size);
      text(context, letter, x0 + (i + 1.5) * size, y0 + 44, `500 34px ${ROUND}`, PEN);
    });
    context.strokeStyle = INK;
    context.lineWidth = 1.5;
    for (let i = 0; i <= answer.length; i++) context.strokeRect(x0 + i * size, y0, size, size);
    arrow(context, x0 + size + 1, y0 + size / 2, 'a');
  } else {
    const [across, down, note] = book.crosswordExample;
    const [size, y0] = [50, y + 40];
    const x0 = W / 2 - (size * across.length) / 2;
    const cells: [number, number, string][] = [
      ...[...across].map((letter, c): [number, number, string] => [0, c, letter]),
      ...[...down].slice(1).map((letter, r): [number, number, string] => [r + 1, 1, letter]),
    ];
    for (const [r, c, letter] of cells) {
      context.fillStyle = '#fff';
      context.fillRect(x0 + c * size, y0 + r * size, size, size);
      context.strokeStyle = INK;
      context.lineWidth = 1.6;
      context.strokeRect(x0 + c * size, y0 + r * size, size, size);
      text(context, letter, x0 + (c + 0.5) * size, y0 + r * size + 36, `500 28px ${ROUND}`, PEN);
    }
    text(context, '1', x0 + 3, y0 + 13, `700 12px ${GRID}`, INK, 'left');
    text(context, '2', x0 + size + 3, y0 + 13, `700 12px ${GRID}`, INK, 'left');
    para(context, note, 60, y0 + down.length * size + 40, W - 120, 19, '#6a6050');
  }
};

/** La page de titre : le titre du cahier, le jour des grilles, ce qu'il contient, l'éditeur. */
const paintTitle = (context: CanvasRenderingContext2D, day: string): void => {
  const book = texts();
  const [a, b, c, d] = book.title;
  outlined(context, a, W / 2, 210, `110px ${BIG}`, GOLD, '#fff', 12);
  outlined(context, b, W / 2, 280, `600 ${fit(context, b, (px) => `600 ${px}px ${ROUND}`, 70, W - 140)}px ${ROUND}`, TEAL, '#fff', 8);
  if (c) outlined(context, c, W / 2, 324, `600 38px ${ROUND}`, NAVY, '#fff', 6);
  outlined(context, d, W / 2, 412, `${fit(context, d, (px) => `${px}px ${BIG}`, 100, W - 140)}px ${BIG}`, NAVY, '#fff', 12);
  const today = book.today.replace('{date}', dateLabel(day));
  text(context, today, W / 2, 500, `600 ${fit(context, today, (px) => `600 ${px}px ${ROUND}`, 26, W - 120)}px ${ROUND}`, RED);
  text(context, book.contents, W / 2, 568, `500 22px ${ROUND}`, '#6a6050');
  text(
    context,
    book.games.join('  ·  '),
    W / 2,
    604,
    `600 ${fit(context, book.games.join('  ·  '), (px) => `600 ${px}px ${ROUND}`, 22, W - 120)}px ${ROUND}`,
    NAVY,
  );
  text(context, book.edition, W / 2, H - 70, `600 20px ${ROUND}`, '#8a8070');
};

/** Une grille de Babel : des lettres au hasard, des définitions qui ne veulent rien dire. */
const paintBabel = (context: CanvasRenderingContext2D, page: number, day: string): void => {
  const random = seeded(hashText(`babel:${day}:${page}`));
  const ABC = 'abcdefghijklmnopqrstuvxyz.,  ';
  const [size, x0, y0] = [48, (W - 48 * 11) / 2, 130];
  for (let i = 0; i < 11 * 12; i++) {
    const [x, y] = [x0 + (i % 11) * size, y0 + Math.floor(i / 11) * size];
    const clue = random() < 0.18;
    context.fillStyle = clue ? '#e4dcec' : '#fff';
    context.fillRect(x, y, size, size);
    if (clue) {
      let line = '';
      for (let k = 0; k < 9; k++) line += ABC[Math.floor(random() * ABC.length)];
      fitClue(context, line, x, y, size, size);
    } else text(context, ABC[Math.floor(random() * 25)].toUpperCase(), x + size / 2, y + 34, `500 26px ${ROUND}`, '#6a5a7a');
    context.strokeStyle = INK;
    context.lineWidth = 1;
    context.strokeRect(x, y, size, size);
  }
};

/** Dessine la page `page` (le papier est déjà là). */
export const paintPuzzlesPage = (context: CanvasRenderingContext2D, page: number, state: GameState): void => {
  const grids = gridsOf(state);
  const content = contentOf(page);
  const left = page % 2 === 0;
  const book = texts();
  speckle(context, 11 + page);
  const day = state.puzzles.day;
  if (content.kind === 'title') return paintTitle(context, day);
  if (content.kind === 'rules') {
    header(context, book.rules[content.rule][0] as string, RULE_COLORS[content.rule], book.rule, page, left);
    return paintRules(context, content.rule);
  }
  if (content.kind === 'babel') {
    header(context, book.babel.replace('{n}', String(page)), '#7a6a8a', '', page, left);
    return paintBabel(context, page, day);
  }
  const { id } = content;
  const kind = kindOf(id);
  const n = Number(id.slice(-1));
  if (content.kind === 'defs') {
    header(context, book.definitions, RED, book.definitionsOf.replace('{n}', String(n + 1)), page, left);
    const grid = grids?.[id];
    if (grid && grid.kind !== 'sudoku') paintDefinitions(context, id, grid);
    return;
  }
  const color = kind === 'sudoku' ? TEAL : kind === 'arrows' ? GOLD : RED;
  header(context, book[kind].replace('{n}', String(n + 1)), color, kind === 'sudoku' ? book.levels[n] : dateLabel(day), page, left);
  const grid = grids?.[id];
  if (!grid) return;
  const mine = progress(state, id);
  if (grid.kind === 'sudoku') paintSudoku(context, id, grid, mine);
  else if (grid.kind === 'arrows') paintArrows(context, id, grid, mine);
  else paintCrossword(context, id, grid, mine);
};

// ————— Le clic, le clavier, la vérification —————

/** Ce que « Vérifier » répond sous une grille fausse : cases fausses, cases vides, vérifications gratuites ou gain. */
const verify = (state: GameState, id: PuzzleGridId, grid: PuzzleGrid): void => {
  const book = texts();
  const check = checkGrid(state, id, grid, getLocale());
  if (check.solved !== undefined) {
    wrong.delete(id);
    notes.delete(id);
    if (focus?.id === id) focus = null;
    return;
  }
  wrong.set(id, check.wrong);
  const misses = progress(state, id).misses;
  const left = freeChecksLeft(misses);
  notes.set(
    id,
    [
      check.wrong.size ? plural(book.wrong, check.wrong.size) : '',
      check.empty ? plural(book.empty, check.empty) : '',
      left > 0 ? plural(book.free, left) : book.gain.replace('{m}', minutesText(puzzleReward(id, misses))),
    ]
      .filter(Boolean)
      .join(' · '),
  );
};

/** Ce qui se clique en (x, y) sur la page `page` : une case, une définition, « Vérifier ». */
type Target = { verify: PuzzleGridId } | { id: PuzzleGridId; cell: number; dir?: Direction; clueSplit?: boolean; y?: number };

const targetAt = (page: number, x: number, y: number, state: GameState): Target | undefined => {
  const content = contentOf(page);
  if (content.kind !== 'grid' && content.kind !== 'defs') return undefined;
  const grid = gridsOf(state)?.[content.id];
  if (!grid || progress(state, content.id).solved !== undefined) return undefined;
  const { id } = content;
  if (content.kind === 'defs') {
    if (grid.kind === 'sudoku') return undefined;
    const line = lineHeight(grid);
    const hit = definitionLines(grid).find((entry) => entry.word && inside({ x: 46, y: entry.y - line * 0.7, w: W - 92, h: line }, x, y));
    return hit?.word ? { id, cell: KEY(hit.word.r, hit.word.c), dir: hit.word.d } : undefined;
  }
  if (inside(VERIFY, x, y)) return { verify: id };
  const hit = cellBoxes(grid).find(({ box }) => inside(box, x, y));
  if (!hit) return undefined;
  if (grid.kind === 'sudoku') return grid.puzzle[hit.cell] ? undefined : { id, cell: hit.cell };
  if (grid.cells.get(hit.cell) === '#') {
    const clue = grid.clues.get(hit.cell) ?? {};
    const dir: Direction = clue.a && clue.d ? (y - hit.box.y < hit.box.h / 2 ? 'a' : 'd') : clue.a ? 'a' : 'd';
    return { id, cell: dir === 'a' ? hit.cell + 1 : hit.cell + 100, dir };
  }
  return { id, cell: hit.cell };
};

export const puzzlesPointable = (page: number, x: number, y: number, state: GameState): boolean =>
  targetAt(page, x, y, state) !== undefined;

/** Un clic sur la page `page` : une case choisie, une définition suivie, une grille vérifiée. True s'il a servi. */
export const pressPuzzles = (page: number, x: number, y: number, state: GameState): boolean => {
  const target = targetAt(page, x, y, state);
  const grids = gridsOf(state);
  if (!target || !grids) {
    // Un clic à côté lâche la grille (sans tourner la page).
    if (!focus || contentOf(page).kind !== 'grid') return false;
    focus = null;
    return true;
  }
  if ('verify' in target) {
    verify(state, target.verify, grids[target.verify]);
    return true;
  }
  const grid = grids[target.id];
  if (grid.kind === 'sudoku') focus = { id: target.id, cell: target.cell, dir: 'a' };
  else if (target.dir) focus = { id: target.id, cell: target.cell, dir: target.dir };
  else {
    // La même case cliquée deux fois : l'autre sens, s'il y a un mot.
    const again = focus?.id === target.id && focus.cell === target.cell;
    const wanted: Direction = again ? (focus!.dir === 'a' ? 'd' : 'a') : (focus?.dir ?? 'a');
    focus = { id: target.id, cell: target.cell, dir: wordAt(grid, target.cell, wanted)?.d ?? wanted };
  }
  return true;
};

/** La double page sous les yeux a changé : une grille choisie ailleurs est lâchée. */
export const shownPuzzles = (page: number): void => {
  spread = Math.floor(page / 2);
  if (focus && Math.floor(pageOf(focus.id) / 2) !== spread) focus = null;
};

const ARROW_KEYS: Readonly<Record<string, [number, number]>> = {
  ARROWUP: [-1, 0],
  ARROWDOWN: [1, 0],
  ARROWLEFT: [0, -1],
  ARROWRIGHT: [0, 1],
};

/** Une touche, une grille choisie : un chiffre, une lettre, effacer, se déplacer, lâcher. True si elle a servi. */
export const keyPuzzles = (key: string, state: GameState): boolean => {
  const grids = gridsOf(state);
  if (!focus || !grids) return false;
  const { id } = focus;
  const grid = grids[id];
  const locale = getLocale();
  const k = key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (k === 'ESCAPE') {
    focus = null;
    return true;
  }
  const move = ARROW_KEYS[k];
  if (move) {
    const [dr, dc] = move;
    if (grid.kind === 'sudoku') {
      let [r, c] = [Math.floor(focus.cell / 9), focus.cell % 9];
      do {
        r += dr;
        c += dc;
      } while (r >= 0 && r < 9 && c >= 0 && c < 9 && grid.puzzle[r * 9 + c]);
      if (r >= 0 && r < 9 && c >= 0 && c < 9) focus.cell = r * 9 + c;
    } else {
      const next = focus.cell + dr * 100 + dc;
      if (answersOf(grid).has(next)) focus = { id, cell: next, dir: dr ? 'd' : 'a' };
    }
    return true;
  }
  const unmark = (cell: number): void => void wrong.get(id)?.delete(cell);
  const erase = k === 'BACKSPACE' || k === 'DELETE';
  notes.delete(id);
  if (grid.kind === 'sudoku') {
    if (erase) writeCell(state, id, locale, focus.cell, null);
    else if (/^[1-9]$/.test(k)) writeCell(state, id, locale, focus.cell, k);
    else return false;
    unmark(focus.cell);
    return true;
  }
  const word = wordAt(grid, focus.cell, focus.dir);
  const list = word ? cellsOf(word) : [focus.cell];
  const i = list.indexOf(focus.cell);
  const mine = progress(state, id);
  if (erase) {
    // Une case vide : on recule d'une lettre et on l'efface.
    if (!mine.cells[focus.cell] && i > 0) focus.cell = list[i - 1];
    writeCell(state, id, locale, focus.cell, null);
    unmark(focus.cell);
    return true;
  }
  if (!/^[A-Z]$/.test(k)) return false;
  writeCell(state, id, locale, focus.cell, k);
  unmark(focus.cell);
  if (i >= 0 && i < list.length - 1) focus.cell = list[i + 1];
  return true;
};

/** Pour les tests et le débogage : tout oublier de la séance. */
export const forgetPuzzleSession = forget;
