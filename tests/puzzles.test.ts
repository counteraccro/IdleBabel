import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { PUZZLE_GRIDS, type PuzzleGridId } from '../src/data/puzzles';
import fr from '../src/data/puzzleWords/fr';
import en from '../src/data/puzzleWords/en';
import { countSolutions, expected, makeDay } from '../src/systems/puzzleGrids';
import { checkGrid, progressOf, puzzleReward, refreshPuzzles, writeCell } from '../src/systems/puzzles';
import { refreshDay } from '../src/systems/dailyTasks';
import { prestige } from '../src/systems/prestige';

const DAY = '2026-10-20';
const NOON = new Date(`${DAY}T12:00`).getTime();

/** Une partie au jour des grilles, avec les grilles du jour en français. */
const setup = (): { state: GameState; grids: ReturnType<typeof makeDay> } => {
  const state = createInitialState('fr', NOON, 410);
  refreshPuzzles(state, NOON);
  return { state, grids: makeDay(state.seed, state.puzzles.day, fr) };
};

/** La grille remplie juste (ou avec une case fausse). */
const fill = (state: GameState, grids: ReturnType<typeof makeDay>, id: PuzzleGridId, mistake = false): void => {
  const answers = [...expected(grids[id])];
  answers.forEach(([cell, value], i) =>
    writeCell(state, id, 'fr', cell, mistake && i === 0 ? (value === '1' ? '2' : value === 'A' ? 'B' : '1') : value),
  );
};

describe('La réserve de mots du livre de jeux', () => {
  for (const [name, words] of [
    ['fr', fr],
    ['en', en],
  ] as const)
    it(`${name} : 700 mots, en majuscules, sans doublon, avec leurs deux définitions`, () => {
      expect(words.length).toBe(700);
      expect(new Set(words.map(([word]) => word)).size).toBe(700);
      for (const [word, short, long] of words) {
        expect(word).toMatch(/^[A-Z]{2,13}$/);
        expect(short.length).toBeGreaterThan(0);
        expect(short.length).toBeLessThanOrEqual(18);
        expect(long.length).toBeGreaterThan(0);
        expect(long.length).toBeLessThanOrEqual(48);
      }
    });
});

describe('Les grilles du jour', () => {
  it('la même partie, le même jour : les mêmes grilles ; un autre jour, d’autres', () => {
    const a = makeDay(410, DAY, fr);
    const b = makeDay(410, DAY, fr);
    const c = makeDay(410, '2026-10-21', fr);
    expect(a.sudoku0).toEqual(b.sudoku0);
    expect(a.crossword2).toEqual(b.crossword2);
    expect(a.sudoku0).not.toEqual(c.sudoku0);
  });

  it('chaque sudoku n’a qu’une solution, et de moins en moins de chiffres donnés', () => {
    const grids = makeDay(7, DAY, fr);
    const givens = (['sudoku0', 'sudoku1', 'sudoku2'] as const).map((id) => {
      const grid = grids[id];
      if (grid.kind !== 'sudoku') throw new Error(id);
      expect(countSolutions(grid.puzzle.slice())).toBe(1);
      grid.puzzle.forEach((v, i) => v && expect(grid.solution[i]).toBe(v));
      return grid.puzzle.filter(Boolean).length;
    });
    expect(givens[0]).toBeGreaterThan(givens[2]);
  });

  it('un mot ne sort qu’une fois par jour ; les croisés ont 22 mots au plus', () => {
    for (const words of [fr, en]) {
      const grids = makeDay(3, DAY, words);
      const placed = PUZZLE_GRIDS.flatMap((id) => {
        const grid = grids[id];
        return grid.kind === 'sudoku' ? [] : grid.placed.map((p) => p.word);
      });
      expect(placed.length).toBeGreaterThan(60);
      expect(new Set(placed).size).toBe(placed.length);
      for (const id of ['crossword0', 'crossword1', 'crossword2'] as const) {
        const grid = grids[id];
        if (grid.kind === 'sudoku') throw new Error(id);
        expect(grid.placed.length).toBeLessThanOrEqual(22);
      }
    }
  });
});

describe('Vérifier', () => {
  it('le gain : double du premier coup, trois ratés gratuits, puis 10 % de moins chacun, rien au 13e', () => {
    expect(puzzleReward('sudoku2', 0)).toBe(120);
    expect(puzzleReward('sudoku2', 1)).toBe(60);
    expect(puzzleReward('sudoku2', 3)).toBe(60);
    expect(puzzleReward('sudoku2', 4)).toBe(54);
    expect(puzzleReward('arrows0', 12)).toBe(3);
    expect(puzzleReward('arrows0', 13)).toBe(0);
  });

  it('une grille fausse compte un raté et montre ses cases fausses ; juste, elle rapporte et se ferme', () => {
    const { state, grids } = setup();
    fill(state, grids, 'arrows1', true);
    const missed = checkGrid(state, 'arrows1', grids.arrows1, 'fr');
    expect(missed.solved).toBeUndefined();
    expect(missed.wrong.size).toBe(1);
    expect(progressOf(state, 'arrows1', 'fr').misses).toBe(1);
    fill(state, grids, 'arrows1');
    const done = checkGrid(state, 'arrows1', grids.arrows1, 'fr');
    expect(done.solved).toBe(30);
    expect(state.puzzles.solved).toBe(1);
    expect('puzzlesFirst' in state.seals).toBe(true);
    // Résolue, elle ne bouge plus.
    writeCell(state, 'arrows1', 'fr', [...expected(grids.arrows1).keys()][0], null);
    expect(Object.keys(progressOf(state, 'arrows1', 'fr').cells).length).toBe(expected(grids.arrows1).size);
  });

  it('les trois sceaux secrets : sans gomme, pour la gloire, neuf sur neuf', () => {
    const { state, grids } = setup();
    fill(state, grids, 'sudoku2');
    checkGrid(state, 'sudoku2', grids.sudoku2, 'fr');
    expect('puzzlesNoEraser' in state.seals).toBe(true);
    for (let i = 0; i < 13; i++) checkGrid(state, 'sudoku0', grids.sudoku0, 'fr');
    fill(state, grids, 'sudoku0');
    expect(checkGrid(state, 'sudoku0', grids.sudoku0, 'fr').solved).toBe(0);
    expect('puzzlesGlory' in state.seals).toBe(true);
    expect('puzzlesAll' in state.seals).toBe(false);
    for (const id of PUZZLE_GRIDS) {
      fill(state, grids, id);
      checkGrid(state, id, grids[id], 'fr');
    }
    expect('puzzlesAll' in state.seals).toBe(true);
  });

  it('à minuit, les grilles d’hier s’effacent ; au prestige, elles restent', () => {
    const { state, grids } = setup();
    writeCell(state, 'sudoku1', 'fr', [...expected(grids.sudoku1).keys()][0], '5');
    prestige(state, NOON);
    expect(Object.keys(state.puzzles.grids)).toEqual(['sudoku1']);
    refreshPuzzles(state, NOON + 86_400_000);
    expect(state.puzzles.grids).toEqual({});
  });
});

describe('La tâche du jour « Résoudre une grille »', () => {
  const kinds = (state: GameState): string[] => {
    const random = (() => {
      let n = 0;
      return () => (n += 0.137) % 1;
    })();
    const all = new Set<string>();
    for (let day = 0; day < 40; day++) {
      state.tasks.day = null;
      refreshDay(state, random, NOON + day * 86_400_000);
      for (const task of state.tasks.today) all.add(task.kind);
    }
    return [...all];
  };

  it('jamais sans le livre ; avec lui, une grille par jeton', () => {
    const state = createInitialState('fr', NOON, 410);
    expect(kinds(state)).not.toContain('grids');
    state.rareBooks.puzzles = 1;
    expect(kinds(state)).toContain('grids');
    const task = state.tasks.today.find((one) => one.kind === 'grids');
    if (task) expect(task.goal).toBe(task.value);
  });
});
