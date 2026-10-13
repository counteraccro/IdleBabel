import { MIMIC_BONUS, MIMIC_EVERY, MIMIC_SLOW_CAP } from '../data/mimic';
import { mimicComesFactor, mimicGivesBonus, mimicUnlocked } from './etherium';
import type { GameState } from '../core/state';

/**
 * La Mimic (data/mimic.ts) : quand elle vient, ce qu'elle avale, ce qu'elle rend. Elle ne vient qu'à l'écran du jeu
 * (ui/mimic/mimic.ts avance son attente à chaque tick), jamais pendant une absence ; mais celle qui est là mange aussi
 * ce que rapporte l'absence. Elle ne part jamais d'elle-même.
 */

export const mimicHere = (state: GameState): boolean => state.mimic.at !== null;

/** Secondes, en moyenne, entre deux Mimics (les dents du haut les rapprochent). */
export const mimicEvery = (state: GameState): number => MIMIC_EVERY / mimicComesFactor(state);

/** Ce qu'elle rend en plus de ce qu'elle a avalé : 10 %, et les dents du bas. */
export const mimicBonusShare = (state: GameState): number => MIMIC_BONUS + mimicGivesBonus(state);

/** Ce qu'elle laisse de la lecture des méthodes : tant qu'elle est là, −(ce qu'elle rendra en plus), −50 % au plus. */
export const mimicReading = (state: GameState): number => (mimicHere(state) ? 1 - Math.min(MIMIC_SLOW_CAP, mimicBonusShare(state)) : 1);

/** Débogage : la prochaine avance la fait venir. */
let called = false;
export const callMimic = (): void => {
  called = true;
};

/** Elle apparaît : sa reliure tirée au hasard, sa place choisie par l'écran (ui/mimic). */
export const spawnMimic = (state: GameState, random: () => number = Math.random, now = Date.now()): void => {
  state.mimic.at = now;
  state.mimic.spot = null;
  state.mimic.eaten = 0;
  state.mimic.book = 1 + Math.floor(random() * 1_000_000);
};

/**
 * `seconds` de jeu à l'écran : peut-être une Mimic (une par heure en moyenne). Seulement une fois débloquée, et s'il n'y
 * en a pas déjà une. Renvoie true si elle vient d'apparaître.
 */
export const advanceMimic = (state: GameState, seconds: number, random: () => number = Math.random, now = Date.now()): boolean => {
  if (!mimicUnlocked(state) || mimicHere(state)) {
    called = false;
    return false;
  }
  if (!called && random() >= seconds / mimicEvery(state)) return false;
  called = false;
  spawnMimic(state, random, now);
  return true;
};

/** Une connaissance gagnée : avalée s'il y a une Mimic (renvoie true), sinon elle va au joueur. */
export const swallow = (state: GameState, amount: number): boolean => {
  if (!mimicHere(state)) return false;
  state.mimic.eaten += amount;
  return true;
};

/** Ce qu'elle rendrait maintenant : tout ce qu'elle a avalé, et le bonus. */
export const mimicReturn = (state: GameState): { eaten: number; bonus: number } => {
  const eaten = state.mimic.eaten;
  return { eaten, bonus: eaten * mimicBonusShare(state) };
};

/** Secondes passées à manger, depuis toujours : celles des Mimics attrapées, et celle qui est là. */
export const mimicSeconds = (state: GameState, now = Date.now()): number =>
  state.mimic.seconds + (state.mimic.at === null ? 0 : Math.max(0, now - state.mimic.at) / 1000);

/**
 * Elle disparaît (le second clic, ou juste avant un prestige) : elle rend tout, avec le bonus. Renvoie ce qu'elle a rendu
 * (rien s'il n'y avait pas de Mimic).
 */
export const catchMimic = (state: GameState, now = Date.now()): { eaten: number; bonus: number } | undefined => {
  if (!mimicHere(state)) return undefined;
  const given = mimicReturn(state);
  const total = given.eaten + given.bonus;
  state.knowledge += total;
  state.cycleKnowledge += total;
  state.lifetimeKnowledge += total;
  state.mimic.seconds = mimicSeconds(state, now);
  state.mimic.caught += 1;
  state.mimic.bonus += given.bonus;
  state.mimic.at = null;
  state.mimic.spot = null;
  state.mimic.eaten = 0;
  return given;
};
