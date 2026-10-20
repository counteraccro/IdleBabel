import { hashText, seeded } from '../core/random';
import { ARROWS_SIZE, CROSSWORD_SIZE, PUZZLE_GRIDS, SUDOKU_GIVENS, type PuzzleGridId } from '../data/puzzles';

/**
 * Les grilles du livre de jeux (maquette .ai/maquette-livre-jeux.html, 20/10/2026), tirées de la graine de la partie et du
 * jour : le même jour, la même partie, les mêmes grilles ; deux joueurs n'ont pas les mêmes. Le sudoku a une seule
 * solution (vérifiée à chaque chiffre retiré) ; les grilles de mots entrecroisent les mots de la réserve de la langue, un
 * mot ne sort qu'une fois par jour.
 */

/** Un mot de la réserve : [mot en majuscules sans accents, définition courte (fléchés), définition des croisés]. */
export type PuzzleWord = readonly [string, string, string];

export interface SudokuGrid {
  kind: 'sudoku';
  n: number;
  /** Les 81 cases, ligne après ligne : le chiffre donné, 0 pour une case à remplir. */
  puzzle: readonly number[];
  solution: readonly number[];
}

/** Un mot placé : sa première lettre en (r, c), vers la droite (a) ou vers le bas (d) ; `n` : son numéro (croisés). */
export interface PlacedWord {
  word: string;
  short: string;
  long: string;
  r: number;
  c: number;
  d: Direction;
  n: number;
}
export type Direction = 'a' | 'd';

export interface WordGrid {
  kind: 'arrows' | 'crossword';
  n: number;
  width: number;
  height: number;
  /** Case (KEY) → sa lettre, ou '#' : une case de définitions (fléchés). */
  cells: ReadonlyMap<number, string>;
  /** Les définitions d'une case '#' : vers la droite, vers le bas. */
  clues: ReadonlyMap<number, { a?: string; d?: string }>;
  placed: readonly PlacedWord[];
}

export type PuzzleGrid = SudokuGrid | WordGrid;

/** Une case d'une grille de mots : ligne × 100 + colonne. */
export const KEY = (r: number, c: number): number => r * 100 + c;

const shuffle = <T>(list: T[], random: () => number): T[] => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

// ————— Le sudoku —————

export const BOX = (i: number): number => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);

/** Les chiffres possibles en `i`. */
const free = (grid: number[], i: number): number[] => {
  const [r, c, b] = [Math.floor(i / 9), i % 9, BOX(i)];
  let used = 0;
  for (let k = 0; k < 81; k++) if (grid[k] && (Math.floor(k / 9) === r || k % 9 === c || BOX(k) === b)) used |= 1 << grid[k];
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (!(used & (1 << d))) out.push(d);
  return out;
};

/** Le nombre de solutions de la grille (on s'arrête à `limit`). */
export const countSolutions = (grid: number[], limit = 2): number => {
  let best = -1;
  let candidates: number[] | null = null;
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    const here = free(grid, i);
    if (!here.length) return 0;
    if (!candidates || here.length < candidates.length) {
      best = i;
      candidates = here;
      if (here.length === 1) break;
    }
  }
  if (best < 0 || !candidates) return 1;
  let n = 0;
  for (const d of candidates) {
    grid[best] = d;
    n += countSolutions(grid, limit - n);
    grid[best] = 0;
    if (n >= limit) break;
  }
  return n;
};

export const makeSudoku = (random: () => number, givens: number, n: number): SudokuGrid => {
  const grid: number[] = Array(81).fill(0);
  const fill = (i: number): boolean => {
    if (i === 81) return true;
    for (const d of shuffle(free(grid, i), random)) {
      grid[i] = d;
      if (fill(i + 1)) return true;
    }
    grid[i] = 0;
    return false;
  };
  fill(0);
  const solution = grid.slice();
  const puzzle = grid.slice();
  // Les chiffres s'ôtent deux par deux, en miroir autour du centre, tant que la solution reste unique.
  for (const i of shuffle([...Array(41).keys()], random)) {
    if (puzzle.filter(Boolean).length <= givens) break;
    const keep = [puzzle[i], puzzle[80 - i]];
    puzzle[i] = puzzle[80 - i] = 0;
    if (countSolutions(puzzle.slice()) !== 1) [puzzle[i], puzzle[80 - i]] = keep;
  }
  return { kind: 'sudoku', n, puzzle, solution };
};

// ————— Les mots en croix —————

const step = (d: Direction): [number, number] => (d === 'a' ? [0, 1] : [1, 0]);

/**
 * Des mots entrecroisés dans une grille `width` × `height` : chacun en croise au moins un autre. `arrows` : des mots
 * fléchés (la case avant chaque mot porte sa définition). La meilleure de `tries` grilles (le plus de lettres).
 */
export const layoutWords = (
  bank: readonly PuzzleWord[],
  width: number,
  height: number,
  random: () => number,
  arrows: boolean,
  maxWords = 99,
  tries = 120,
): Omit<WordGrid, 'kind' | 'n'> => {
  let best: { letters: number; placed: PlacedWord[]; cells: Map<number, string>; clues: Map<number, { a?: string; d?: string }> } | null =
    null;
  const usable = bank.filter(([word]) => word.length <= Math.max(width, height) - (arrows ? 1 : 0));
  for (let t = 0; t < tries; t++) {
    const cells = new Map<number, string>();
    const clues = new Map<number, { a?: string; d?: string }>();
    const placed: PlacedWord[] = [];
    const pool = shuffle(usable.slice(), random)
      .slice(0, 110)
      .sort((a, b) => b[0].length - a[0].length + (random() - 0.5) * 6);
    /** Le nombre de lettres croisées si `word` va là (au moins une, pas toutes) ; -1 : impossible. */
    const fits = (word: string, r: number, c: number, d: Direction): number => {
      const [dr, dc] = step(d);
      const n = word.length;
      const [er, ec] = [r + dr * (n - 1), c + dc * (n - 1)];
      if (r < 0 || c < 0 || er >= height || ec >= width) return -1;
      const [br, bc] = [r - dr, c - dc];
      if (arrows) {
        if (br < 0 || bc < 0) return -1;
        const before = cells.get(KEY(br, bc));
        if (before !== undefined && before !== '#') return -1;
        if (before === '#' && clues.get(KEY(br, bc))?.[d]) return -1;
      } else if (br >= 0 && bc >= 0 && cells.has(KEY(br, bc))) return -1;
      const [ar, ac] = [er + dr, ec + dc];
      if (ar < height && ac < width && (cells.get(KEY(ar, ac)) ?? '#') !== '#') return -1;
      let crossings = 0;
      for (let k = 0; k < n; k++) {
        const [rr, cc] = [r + dr * k, c + dc * k];
        const current = cells.get(KEY(rr, cc));
        if (current === '#') return -1;
        if (current !== undefined) {
          if (current !== word[k]) return -1;
          crossings++;
          continue;
        }
        for (const [sr, sc] of [
          [rr + dc, cc + dr],
          [rr - dc, cc - dr],
        ])
          if ((cells.get(KEY(sr, sc)) ?? '#') !== '#') return -1;
      }
      return crossings === n ? -1 : crossings;
    };
    const put = ([word, short, long]: PuzzleWord, r: number, c: number, d: Direction): void => {
      const [dr, dc] = step(d);
      for (let k = 0; k < word.length; k++) cells.set(KEY(r + dr * k, c + dc * k), word[k]);
      if (arrows) {
        const k = KEY(r - dr, c - dc);
        cells.set(k, '#');
        clues.set(k, { ...clues.get(k), [d]: short });
      }
      placed.push({ word, short, long, r, c, d, n: 0 });
    };
    const first = pool.shift();
    if (!first) break;
    const d0: Direction = random() < 0.5 ? 'a' : 'd';
    const r0 = d0 === 'a' ? Math.floor(random() * height) : 1;
    const c0 = d0 === 'a' ? 1 : Math.floor(random() * width);
    if (fits(first[0], r0, c0, d0) < 0) continue;
    put(first, r0, c0, d0);
    for (const entry of pool) {
      if (placed.length >= maxWords) break;
      const word = entry[0];
      let pick: [number, number, number, Direction] | null = null;
      for (const [k, letter] of cells) {
        if (letter === '#') continue;
        const [rr, cc] = [Math.floor(k / 100), k % 100];
        for (let i = 0; i < word.length; i++) {
          if (word[i] !== letter) continue;
          for (const d of ['a', 'd'] as const) {
            const [r, c] = d === 'a' ? [rr, cc - i] : [rr - i, cc];
            const score = fits(word, r, c, d);
            if (score > 0 && (!pick || score + random() > pick[0])) pick = [score + random(), r, c, d];
          }
        }
      }
      if (pick) put(entry, pick[1], pick[2], pick[3]);
    }
    const letters = [...cells.values()].filter((v) => v !== '#').length;
    if (!best || letters > best.letters) best = { letters, placed, cells: new Map(cells), clues: new Map(clues) };
  }
  const result = best ?? { letters: 0, placed: [], cells: new Map(), clues: new Map() };
  // Les numéros des mots croisés : de gauche à droite, de haut en bas ; un numéro par case de départ.
  const starts = [...new Set(result.placed.map((p) => KEY(p.r, p.c)))].sort((a, b) => a - b);
  for (const p of result.placed) p.n = starts.indexOf(KEY(p.r, p.c)) + 1;
  return { width, height, cells: result.cells, clues: result.clues, placed: result.placed };
};

/** Les cases d'un mot placé, de sa première lettre à sa dernière. */
export const cellsOf = (p: PlacedWord): number[] => {
  const [dr, dc] = step(p.d);
  return [...p.word].map((_, k) => KEY(p.r + dr * k, p.c + dc * k));
};

/** Les lettres attendues : case → lettre. */
export const answersOf = (grid: WordGrid): Map<number, string> => {
  const out = new Map<number, string>();
  for (const p of grid.placed) cellsOf(p).forEach((k, i) => out.set(k, p.word[i]));
  return out;
};

/** Le mot qui passe par `cell`, dans le sens `d` si possible. */
export const wordAt = (grid: WordGrid, cell: number, d: Direction): PlacedWord | undefined =>
  grid.placed.find((p) => p.d === d && cellsOf(p).includes(cell)) ?? grid.placed.find((p) => cellsOf(p).includes(cell));

// ————— Les neuf grilles d'un jour —————

/** Ce qu'attend chaque case à remplir : le chiffre (sudoku) ou la lettre. */
export const expected = (grid: PuzzleGrid): Map<number, string> =>
  grid.kind === 'sudoku'
    ? new Map(grid.solution.flatMap((v, i) => (grid.puzzle[i] ? [] : [[i, String(v)] as [number, string]])))
    : answersOf(grid);

/** Les neuf grilles du jour `day` (« AAAA-MM-JJ ») de la partie `seed`, avec la réserve de mots `words`. */
export const makeDay = (seed: number, day: string, words: readonly PuzzleWord[]): Record<PuzzleGridId, PuzzleGrid> => {
  const random = (what: string): (() => number) => seeded(hashText(`${seed}:${day}:${what}`));
  const used = new Set<string>();
  // Un mot ne sort qu'une fois par jour : chaque grille pioche dans ce que les précédentes ont laissé.
  const fresh = (): PuzzleWord[] => words.filter(([word]) => !used.has(word));
  const keep = (grid: Omit<WordGrid, 'kind' | 'n'>): Omit<WordGrid, 'kind' | 'n'> => {
    for (const p of grid.placed) used.add(p.word);
    return grid;
  };
  const grids = {} as Record<PuzzleGridId, PuzzleGrid>;
  for (const id of PUZZLE_GRIDS) {
    const n = Number(id.slice(-1));
    if (id.startsWith('sudoku')) grids[id] = makeSudoku(random(id), SUDOKU_GIVENS[n], n);
    else if (id.startsWith('arrows'))
      grids[id] = { kind: 'arrows', n, ...keep(layoutWords(fresh(), ARROWS_SIZE.width, ARROWS_SIZE.height, random(id), true)) };
    else
      grids[id] = {
        kind: 'crossword',
        n,
        ...keep(layoutWords(fresh(), CROSSWORD_SIZE.width, CROSSWORD_SIZE.height, random(id), false, CROSSWORD_SIZE.words)),
      };
  }
  return grids;
};
