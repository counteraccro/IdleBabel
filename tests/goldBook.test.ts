import { describe, expect, it, vi } from 'vitest';

// Le Livre d'or n'existe qu'en mode débogage pour l'instant (data/goldBookOn.ts) : l'adresse ?debug, avant d'importer le jeu.
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location = { search: '?debug' };
});

import { createInitialState, type GameState } from '../src/core/state';
import { ATELIER_ON } from '../src/data/atelierOn';
import { GOLD_BOOK_ON } from '../src/data/goldBookOn';
import { GOLD_BOOK_STAR, LIVES, TOME_SCORE, TREE } from '../src/data/goldBook';
import { S } from '../src/data/etheriumStars';
import {
  buyCase,
  canBuyCase,
  caseShown,
  dustFor,
  endRun,
  feedRun,
  goldBookOpen,
  readMinutes,
  readRun,
  readsLeft,
} from '../src/systems/goldBook';
import { advanceRun, chooseFavor, comboMultiplier, comboWindow, newRun, takeLetter, type Run } from '../src/systems/goldBookRun';
import { pagesPerSecond } from '../src/systems/production';
import { tomeFound } from '../src/systems/endings';

/** Un hasard qui rend toujours la même chose (0,99 : jamais d'or pur, d'encre ni de mot). */
const always = (value: number) => () => value;
const GOLD_ONLY = always(0.99);

const NOON = new Date(2026, 10, 7, 12).getTime();
const NEXT_DAY = new Date(2026, 10, 8, 9).getTime();

const game = (): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = [GOLD_BOOK_STAR];
  state.tools.diagonal = 1;
  return state;
};

/** La partie avance jusqu'à la lettre suivante, et le joueur l'attrape. */
const catchNext = (run: Run, random = GOLD_ONLY) => {
  advanceRun(run, run.next - run.t, random);
  return takeLetter(run, run.letters.at(-1)!.id, random);
};

describe('le Livre d’or, à la place de l’atelier', () => {
  it('en débogage, le Livre d’or ; l’atelier seulement avec ?atelier', () => {
    expect(GOLD_BOOK_ON).toBe(true);
    expect(ATELIER_ON).toBe(false);
  });

  it('s’ouvre avec le Sud de la Rose des vents', () => {
    const state = game();
    expect(goldBookOpen(state)).toBe(true);
    state.etherium = [];
    expect(goldBookOpen(state)).toBe(false);
  });
});

describe('une partie', () => {
  it('une lettre au bout de 600 ms ; attrapée, 10 points au combo ×1', () => {
    const run = newRun(game());
    expect(advanceRun(run, 599, GOLD_ONLY)).toEqual([]);
    const [event] = advanceRun(run, 1, GOLD_ONLY);
    expect(event.type).toBe('spawn');
    expect(takeLetter(run, run.letters[0].id)?.gain).toBe(10);
    expect(run.score).toBe(10);
  });

  it('le combo : ×1 de plus toutes les 10 lettres, plafond ×8 ; il casse après sa fenêtre de 3 s', () => {
    const run = newRun(game());
    for (let i = 0; i < 9; i++) catchNext(run);
    expect(comboMultiplier(run)).toBe(1);
    catchNext(run);
    expect(comboMultiplier(run)).toBe(2);
    run.chain = 200;
    expect(comboMultiplier(run)).toBe(8);
    run.chain = 10;
    run.letters = [];
    run.next = Infinity;
    expect(comboWindow(run)).toBeLessThan(3000);
    advanceRun(run, comboWindow(run) + 1);
    expect(run.chain).toBe(0);
  });

  it('la fenêtre du combo descend de 3 s à 1,5 s vers 160 lettres', () => {
    const run = newRun(game());
    expect(comboWindow(run)).toBe(3000);
    run.count = 160;
    expect(comboWindow(run)).toBe(1500);
  });

  it('une lettre dorée éteinte : une erreur ; trois, la partie est finie', () => {
    const run = newRun(game());
    advanceRun(run, 600, GOLD_ONLY);
    run.next = Infinity;
    const letter = run.letters[0];
    const events = advanceRun(run, letter.life);
    expect(events.map((event) => event.type)).toEqual(['out']);
    expect(run.lives).toBe(LIVES - 1);
    run.lives = 1;
    run.letters.push({ ...letter, id: 99, born: run.t });
    expect(advanceRun(run, 10_000).at(-1)?.type).toBe('over');
    expect(run.over).toBe(true);
  });

  it('une lettre d’encre touchée : une erreur, le combo cassé, aucun point', () => {
    const run = newRun(game());
    run.count = 20;
    run.chain = 15;
    // Le hasard de la lettre, pas de mot, puis 0,05 : de l'encre (après 15 lettres).
    const rolls = [0.5, 0.5, 0.05];
    advanceRun(run, 600, () => rolls.shift() ?? 0.5);
    expect(run.letters[0].kind).toBe('ink');
    expect(takeLetter(run, run.letters[0].id)).toEqual({ gain: 0, ink: true });
    expect(run.chain).toBe(0);
    expect(run.lives).toBe(LIVES - 1);
  });

  it('BABEL lettre par lettre : 500 × le combo de plus ; une lettre ratée arrête le mot, sans erreur', () => {
    const run = newRun(game());
    run.count = 11;
    run.word = 1;
    for (const char of 'babe') {
      advanceRun(run, run.next - run.t, always(0.5));
      expect(run.letters.at(-1)?.char).toBe(char);
      takeLetter(run, run.letters.at(-1)!.id);
    }
    advanceRun(run, run.next - run.t, always(0.5));
    const take = takeLetter(run, run.letters.at(-1)!.id);
    expect(take?.word).toBe(500 * comboMultiplier(run));
    expect(run.words).toBe(1);
    run.word = 1;
    advanceRun(run, run.next - run.t, always(0.5));
    run.next = Infinity;
    const lives = run.lives;
    expect(advanceRun(run, 100_000).map((event) => event.type)).toContain('wordOut');
    expect(run.spelling).toBeNull();
    expect(run.lives).toBe(lives);
  });

  it('toutes les 25 lettres, trois faveurs : la partie s’arrête jusqu’au choix', () => {
    const run = newRun(game());
    let take;
    for (let i = 0; i < 25; i++) take = catchNext(run);
    expect(take?.favors).toHaveLength(3);
    const t = run.t;
    expect(advanceRun(run, 5000)).toEqual([]);
    expect(run.t).toBe(t);
    expect(chooseFavor(run, take!.favors![0])).toBe(true);
    expect(run.favors).toBeNull();
  });

  it('les faveurs : le Ralenti ralentit, le Pardon et la Reprise rendent des erreurs', () => {
    const run = newRun(game());
    run.favors = ['slow', 'pardon', 'mend'];
    chooseFavor(run, 'slow');
    expect(run.slow).toBeGreaterThan(1);
    run.favors = ['pardon'];
    chooseFavor(run, 'pardon');
    expect([run.lives, run.maxLives]).toEqual([LIVES + 1, LIVES + 1]);
    run.lives = 1;
    run.favors = ['mend'];
    chooseFavor(run, 'mend');
    expect(run.lives).toBe(LIVES + 1);
    expect(chooseFavor(run, 'vein')).toBe(false);
  });
});

describe('l’arbre', () => {
  it('une case au départ ; achetée, ses pousses paraissent', () => {
    const state = game();
    expect(caseShown(state, 'root')).toBe(true);
    expect(caseShown(state, 'a')).toBe(false);
    expect(canBuyCase(state, 'root')).toBe(false);
    state.goldBook.dust = 50;
    expect(buyCase(state, 'a')).toBe(false);
    expect(buyCase(state, 'root')).toBe(true);
    expect(state.goldBook.dust).toBe(50 - TREE.root.cost);
    expect(['a', 'b', 'c'].every((id) => caseShown(state, id))).toBe(true);
    expect(buyCase(state, 'root')).toBe(false);
  });

  it('ses effets jouent dans la partie suivante', () => {
    const state = game();
    state.goldBook.got = ['root', 'a', 'a1', 'a2', 'a1x', 'a1x1'];
    const run = newRun(state);
    expect(run.points).toBeCloseTo(1.08);
    expect(run.maxLives).toBe(LIVES + 1);
    expect(run.winBonus).toBe(500);
    expect(comboMultiplier({ ...run, chain: 1 })).toBe(2);
  });
});

describe('la fin d’une partie', () => {
  it('comptée, le record gardé', () => {
    const state = game();
    const run = newRun(state);
    run.score = 1234;
    run.words = 2;
    expect(endRun(state, run)).toEqual({ record: true });
    run.score = 100;
    expect(endRun(state, run)).toEqual({ record: false });
    expect(state.goldBook).toMatchObject({ games: 2, best: 1234, words: 4 });
  });

  it('« Le lire » : √score ÷ 4 minutes, trois fois par jour, remis à minuit', () => {
    const state = game();
    expect(readMinutes(state, 10_000)).toBe(25);
    const pages = state.pages;
    expect(readRun(state, 10_000, NOON)).toBe(true);
    expect(state.pages - pages).toBeCloseTo(pagesPerSecond(state) * 25 * 60);
    readRun(state, 10_000, NOON);
    readRun(state, 10_000, NOON);
    expect(readsLeft(state, NOON)).toBe(0);
    expect(readRun(state, 10_000, NOON)).toBe(false);
    expect(readsLeft(state, NEXT_DAY)).toBe(3);
    expect(readRun(state, 0, NEXT_DAY)).toBe(false);
  });

  it('« Nourrir l’arbre » : le score ÷ 100 en poussière d’or, sans limite', () => {
    const state = game();
    expect(dustFor(12_345)).toBe(123);
    feedRun(state, 12_345);
    feedRun(state, 12_345);
    expect(state.goldBook.dust).toBe(246);
  });

  it('un grand score : le tome suivant, seulement après le tome 1', () => {
    const state = game();
    const run = newRun(state);
    run.score = TOME_SCORE;
    expect(endRun(state, run).tome).toBeUndefined();
    state.etherium.push(S.trueStory);
    expect(endRun(state, run).tome).toBe(1);
    expect(tomeFound(state, 1)).toBe(true);
    expect(state.tomeFrom.goldBook).toBe(2);
  });
});
