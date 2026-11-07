import {
  COMBO_CAP,
  COMBO_STEP,
  FAVOR_BREATH,
  FAVOR_CEILING,
  FAVOR_CHOICES,
  FAVOR_EVERY,
  FAVOR_NAME,
  FAVOR_SLOW,
  FAVORS,
  FIRST_LETTER,
  FULL_SPEED_AT,
  GAP_END,
  GAP_START,
  INK_AFTER,
  INK_CHANCE,
  LETTER_POINTS,
  LIFE_END,
  LIFE_START,
  LIVES,
  PURE_CHANCE,
  PURE_LIFE,
  PURE_POINTS,
  WINDOW_END,
  WINDOW_START,
  WORD,
  WORD_AFTER,
  WORD_CHANCE,
  WORD_LIFE,
  WORD_POINTS,
  type FavorId,
} from '../data/goldBook';
import { treeProduct, treeSum } from './goldBook';
import type { GameState } from '../core/state';

/**
 * Une partie du Livre d'or (.ai/plan-livre-dor.md, maquette .ai/maquette-livre-dor.html), sans écran : le temps de la partie
 * avance par `advanceRun` (arrêté pendant le choix d'une faveur), le joueur attrape avec `takeLetter`. Rien n'est gardé dans la
 * sauvegarde : seule la fin compte (systems/goldBook.ts, endRun). Les bonus temporaires n'y jouent pas.
 */

export type LetterKind = 'gold' | 'pure' | 'ink' | 'word';

export interface RunLetter {
  id: number;
  kind: LetterKind;
  char: string;
  /** Née à (ms de la partie), et le temps qu'elle met à monter du livre et s'éteindre. */
  born: number;
  life: number;
  /** D'où elle part sur le livre (part de la largeur), et son balancement : pour l'écran. */
  x0: number;
  seed: number;
}

export interface Run {
  /** Le temps de la partie (ms) ; la lettre suivante à. */
  t: number;
  next: number;
  score: number;
  /** Lettres attrapées, et celles d'affilée (le combo) ; la dernière attrapée à. */
  count: number;
  chain: number;
  lastCatch: number;
  lives: number;
  maxLives: number;
  /** Ce que règlent l'arbre et les faveurs : rythme (plus grand : plus lent), points, chances, plafond, fenêtre, départ. */
  slow: number;
  points: number;
  pure: number;
  ink: number;
  word: number;
  cap: number;
  winBonus: number;
  startMult: number;
  pureValue: number;
  babel: number;
  choices: number;
  /** Le mot en cours : la lettre où il en est ; `ready`, la suivante peut venir. */
  spelling: { i: number; ready: boolean } | null;
  letters: RunLetter[];
  nextId: number;
  lastX0: number;
  /** Les faveurs proposées, en attendant le choix (la partie est arrêtée) ; aucune : elle continue. */
  favors: FavorId[] | null;
  /** BABEL écrits en entier, et ceux écrits le combo au plafond. */
  words: number;
  capWords: number;
  over: boolean;
}

/** Ce qui arrive en avançant : une lettre née, une lettre dorée éteinte (une erreur), le mot éteint, le combo cassé, la fin. */
export type RunEvent =
  | { type: 'spawn'; letter: RunLetter }
  | { type: 'out'; letter: RunLetter }
  | { type: 'wordOut'; letter: RunLetter }
  | { type: 'break' }
  | { type: 'over' };

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Une partie neuve, avec ce que donne l'arbre. */
export const newRun = (state: GameState): Run => {
  const maxLives = LIVES + treeSum(state, 'lives');
  return {
    t: 0,
    next: FIRST_LETTER,
    score: 0,
    count: 0,
    chain: 0,
    lastCatch: 0,
    lives: maxLives,
    maxLives,
    slow: 1 + treeSum(state, 'calm'),
    points: 1 + treeSum(state, 'points'),
    pure: PURE_CHANCE + treeSum(state, 'pure'),
    ink: INK_CHANCE,
    word: WORD_CHANCE * treeProduct(state, 'word'),
    cap: COMBO_CAP + treeSum(state, 'cap'),
    winBonus: treeSum(state, 'window'),
    startMult: Math.max(1, treeSum(state, 'startMult')),
    pureValue: PURE_POINTS + treeSum(state, 'pureValue'),
    babel: treeProduct(state, 'babel'),
    choices: FAVOR_CHOICES + treeSum(state, 'choice'),
    spelling: null,
    letters: [],
    nextId: 1,
    lastX0: -1,
    favors: null,
    words: 0,
    capWords: 0,
    over: false,
  };
};

/** Où en est le rythme, de 0 (début) à 1 (vers 160 lettres). */
export const runSpeed = (run: Run): number => Math.min(1, run.count / FULL_SPEED_AT);
const between = (start: number, end: number, run: Run): number => start + (end - start) * runSpeed(run);
const spawnGap = (run: Run): number => between(GAP_START, GAP_END, run) * run.slow;
const lifeOf = (run: Run): number => between(LIFE_START, LIFE_END, run) * run.slow;

/** La fenêtre du combo (ms) : 3 s qui descendent à 1,5 s, plus ce que donnent l'arbre et les faveurs. */
export const comboWindow = (run: Run): number => between(WINDOW_START, WINDOW_END, run) + run.winBonus;

/** Le combo : ×1 de plus toutes les 10 lettres d'affilée, au moins le départ de l'arbre, au plus le plafond. */
export const comboMultiplier = (run: Run): number =>
  run.chain === 0 ? 1 : Math.min(run.cap, Math.max(run.startMult, 1 + Math.floor(run.chain / COMBO_STEP)));

/** Un départ sur le livre, pas trop près de celui de la lettre d'avant. */
const placeLetter = (run: Run, random: () => number): number => {
  let x0 = 0.34 + random() * 0.32;
  for (let i = 0; i < 8 && Math.abs(x0 - run.lastX0) <= 0.06; i++) x0 = 0.34 + random() * 0.32;
  run.lastX0 = x0;
  return x0;
};

const spawn = (run: Run, random: () => number): RunLetter => {
  let kind: LetterKind = 'gold';
  let char = LETTERS[Math.floor(random() * LETTERS.length)];
  if (run.spelling?.ready) {
    kind = 'word';
    char = WORD[run.spelling.i];
    run.spelling.ready = false;
  } else if (!run.spelling && run.count > WORD_AFTER && random() < run.word) {
    run.spelling = { i: 0, ready: false };
    kind = 'word';
    char = WORD[0];
  } else if (run.count >= INK_AFTER && random() < run.ink) kind = 'ink';
  else if (random() < run.pure) kind = 'pure';
  const life = lifeOf(run) * (kind === 'pure' ? PURE_LIFE : kind === 'word' ? WORD_LIFE : 1);
  const letter = { id: run.nextId++, kind, char, born: run.t, life, x0: placeLetter(run, random), seed: random() * Math.PI * 2 };
  run.letters.push(letter);
  return letter;
};

/** Une erreur : une goutte perdue, le combo cassé ; plus de goutte, la partie est finie. */
const mistake = (run: Run): void => {
  run.lives -= 1;
  run.chain = 0;
  if (run.lives <= 0) run.over = true;
};

/** La partie avance de `ms` (rien pendant le choix d'une faveur, ni après la fin). */
export const advanceRun = (run: Run, ms: number, random: () => number = Math.random): RunEvent[] => {
  if (run.over || run.favors) return [];
  const events: RunEvent[] = [];
  run.t += ms;
  while (run.t >= run.next) {
    events.push({ type: 'spawn', letter: spawn(run, random) });
    run.next += spawnGap(run);
  }
  for (const letter of [...run.letters]) {
    if (run.t - letter.born < letter.life) continue;
    run.letters = run.letters.filter((other) => other !== letter);
    if (letter.kind === 'gold') {
      mistake(run);
      events.push({ type: 'out', letter });
    } else if (letter.kind === 'word') {
      // Une lettre du mot ratée l'arrête, sans erreur.
      run.spelling = null;
      events.push({ type: 'wordOut', letter });
    }
    if (run.over) return [...events, { type: 'over' }];
  }
  if (run.chain > 0 && run.t - run.lastCatch > comboWindow(run)) {
    run.chain = 0;
    events.push({ type: 'break' });
  }
  return events;
};

/** Ce qu'a donné une lettre touchée : ses points (aucun pour l'encre, une erreur), le mot fini, une faveur à choisir. */
export interface Take {
  gain: number;
  ink?: boolean;
  word?: number;
  favors?: FavorId[];
}

/** Le joueur touche la lettre `id` ; rien si elle n'est plus là, ou si la partie est arrêtée. */
export const takeLetter = (run: Run, id: number, random: () => number = Math.random): Take | undefined => {
  const letter = run.letters.find((candidate) => candidate.id === id);
  if (!letter || run.over || run.favors) return undefined;
  run.letters = run.letters.filter((other) => other !== letter);
  if (letter.kind === 'ink') {
    mistake(run);
    return { gain: 0, ink: true };
  }
  run.chain += 1;
  run.lastCatch = run.t;
  run.count += 1;
  const multiplier = comboMultiplier(run);
  const gain = (letter.kind === 'pure' ? run.pureValue : LETTER_POINTS) * multiplier * run.points;
  run.score += gain;
  const take: Take = { gain };
  if (letter.kind === 'word' && run.spelling) {
    run.spelling.i += 1;
    run.spelling.ready = true;
    if (run.spelling.i === WORD.length) {
      take.word = WORD_POINTS * run.babel * multiplier * run.points;
      run.score += take.word;
      run.words += 1;
      if (multiplier >= run.cap) run.capWords += 1;
      run.spelling = null;
    }
  }
  if (run.count % FAVOR_EVERY === 0) {
    run.favors = [...FAVORS]
      .map((favor) => ({ favor, roll: random() }))
      .sort((a, b) => a.roll - b.roll)
      .slice(0, run.choices)
      .map(({ favor }) => favor);
    take.favors = run.favors;
  }
  return take;
};

/** La faveur choisie s'applique le temps de la partie, qui reprend. */
export const chooseFavor = (run: Run, favor: FavorId): boolean => {
  if (!run.favors?.includes(favor)) return false;
  run.favors = null;
  if (favor === 'slow') run.slow *= FAVOR_SLOW;
  if (favor === 'pardon') {
    run.lives += 1;
    run.maxLives += 1;
  }
  if (favor === 'breath') run.winBonus += FAVOR_BREATH;
  if (favor === 'vein') run.pure *= 2;
  if (favor === 'inkPact') {
    run.points *= 2;
    run.ink *= 2;
  }
  if (favor === 'ceiling') run.cap += FAVOR_CEILING;
  if (favor === 'name') run.word *= FAVOR_NAME;
  if (favor === 'mend') run.lives = run.maxLives;
  return true;
};
