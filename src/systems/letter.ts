import {
  BABEL_ODDS,
  BABEL_WORD,
  BOON,
  BOONS,
  BREATH_STEP,
  LAST_INSTANT,
  LETTER_STAYS,
  LETTER_WAIT,
  UNDERSTOOD_STEP,
  WATCH_STEP,
  type BoonId,
} from '../data/letter';
import { activeBoons, startBoon } from './boons';
import { boonLengthFactor, letterStaysBonus, letterWaitFactor, starLit } from './etherium';
import { levelOf } from './technologies';
import { gainPages, pagesPerSecond } from './production';
import { drawFind, gainFind } from './knowledge';
import { sealEvent } from './seals';
import type { GameState } from '../core/state';

/**
 * La lettre qui s'échappe (data/letter.ts) : quand elle vient, ce qu'elle donne. Le compte à rebours n'avance qu'à
 * l'écran du jeu, l'onglet visible (ui/letter/letter.ts l'avance à chaque tick) ; il n'est pas sauvegardé.
 */

// Ce que font la Plume et les intuitions, au niveau `level` (le sien par défaut).

/** Le Guet et la Plume : l'attente entre deux lettres, en secondes. */
export const letterWait = (state: GameState, level = levelOf(state, 'watch')): { min: number; max: number } => {
  const factor = letterWaitFactor(state) * (1 - WATCH_STEP * level);
  return { min: LETTER_WAIT.min * factor, max: LETTER_WAIT.max * factor };
};

/** Le Souffle retenu et la Plume : le temps où la lettre reste à l'écran, en secondes. */
export const letterStays = (state: GameState, level = levelOf(state, 'heldBreath')): number =>
  LETTER_STAYS + BREATH_STEP * level + letterStaysBonus(state);

/** La Lettre comprise et la Plume : ce qu'elles font à la durée des bonus. */
export const boonLength = (state: GameState, level = levelOf(state, 'letterUnderstood')): number =>
  boonLengthFactor(state) * (1 + UNDERSTOOD_STEP * level);

/** La durée d'un bonus, en secondes ; aucune s'il agit d'un coup. */
export const boonSeconds = (state: GameState, id: BoonId, level?: number): number | undefined => {
  const seconds = BOONS.find((boon) => boon.id === id)?.seconds;
  return seconds === undefined ? undefined : seconds * boonLength(state, level);
};

/** La lettre le connaît : la Transe dès le début, les autres une fois leur étoile de la Plume allumée. */
export const boonKnown = (state: GameState, id: BoonId): boolean => {
  const star = BOONS.find((boon) => boon.id === id)?.star;
  return !star || starLit(state, star);
};

/** Débogage : le bonus que donnera la prochaine lettre, à la place du tirage. */
let forcedBoon: BoonId | undefined;
export const forceBoon = (id: BoonId | undefined): void => {
  forcedBoon = id;
};

/** Ce que donne la lettre : au hasard, selon les parts, parmi les bonus qu'elle connaît. */
export const drawBoon = (state: GameState, random: () => number = Math.random): BoonId => {
  if (forcedBoon) return forcedBoon;
  const known = BOONS.filter((boon) => boonKnown(state, boon.id));
  let roll = random() * known.reduce((total, boon) => total + boon.weight, 0);
  for (const boon of known) if ((roll -= boon.weight) < 0) return boon.id;
  return 'trance';
};

/** Ce qui vient : une lettre, ou le mot BABEL. */
export type Coming = 'letter' | 'word';

/** Secondes avant la prochaine lettre (tirées à la première avance, puis après chaque venue). */
let countdown: number | undefined;
/** Débogage : ce qui viendra à la prochaine avance, tout de suite. */
let called: Coming | undefined;

/** Débogage : faire venir la lettre, ou le mot, tout de suite. */
export const callLetter = (coming: Coming): void => {
  called = coming;
};

/** Secondes avant la prochaine lettre (débogage). */
export const letterCountdown = (): number | undefined => countdown;

/**
 * Le temps passe à l'écran du jeu : `seconds` de moins avant la prochaine lettre. Renvoie ce qui vient, s'il est temps
 * (une lettre sur BABEL_ODDS est le mot) ; l'attente suivante est tirée aussitôt.
 */
export const advanceLetter = (state: GameState, seconds: number, random: () => number = Math.random): Coming | undefined => {
  const wait = letterWait(state);
  const draw = (): number => wait.min + random() * (wait.max - wait.min);
  if (called) {
    const coming = called;
    called = undefined;
    countdown = draw();
    return coming;
  }
  countdown = (countdown ?? draw()) - seconds;
  if (countdown > 0) return undefined;
  countdown = draw();
  return random() < 1 / BABEL_ODDS ? 'word' : 'letter';
};

/** Ce qu'une lettre a donné. */
export interface Gift {
  boon: BoonId;
  /** Pages données d'un coup (l'Éclair). */
  pages?: number;
}

/**
 * Une lettre attrapée, `left` secondes avant qu'elle s'éteigne : son bonus commence (ou agit d'un coup). Dans ses
 * dernières secondes, un sceau secret ; trois bonus à la fois, un sceau.
 */
export const catchLetter = (state: GameState, left: number, random: () => number = Math.random, now = Date.now()): Gift => {
  state.letters += 1;
  if (left <= LAST_INSTANT) sealEvent(state, 'lastInstant', now);
  const boon = drawBoon(state, random);
  const seconds = boonSeconds(state, boon);
  const gift: Gift = { boon };
  if (seconds !== undefined) startBoon(boon, seconds, now);
  else if (boon === 'flash') {
    gift.pages = pagesPerSecond(state) * BOON.flash;
    gainPages(state, gift.pages);
  } else gainFind(state, drawFind(state, random));
  if (activeBoons(now).length >= 3) sealEvent(state, 'threeLights', now);
  return gift;
};

/**
 * La lettre n° `index` du mot BABEL attrapée : sa part des pages en réserve, aussitôt. La dernière : un sceau secret.
 * Renvoie les pages données.
 */
export const catchWordLetter = (state: GameState, index: number, now = Date.now()): number => {
  state.letters += 1;
  const gain = state.pages * BABEL_WORD[index][1];
  gainPages(state, gain);
  if (index === BABEL_WORD.length - 1) sealEvent(state, 'babelWord', now);
  return gain;
};
