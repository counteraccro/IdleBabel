import { GOLDEN_STRIKES } from '../data/lottery';
import { sealEvent } from './seals';
import { catchMimic } from './mimic';
import { lotterySeconds } from './lotteryStars';
import type { GameState } from '../core/state';

/**
 * La Mimic dorée (un malus de la Loterie, l'auteur, 16/10) : on ne peut pas la tuer. Tant qu'elle est là, elle mange
 * tout ce qui est gagné, pages et Connaissance (pas ce qu'on a déjà), avant la Mimic ordinaire ; au bout de cinq
 * minutes (plus, avec le rouleau du temps de l'Etherium), elle s'en va sans rien rendre. Un gain de la Loterie tiré pendant ce temps y passe aussi.
 */

export const goldenHere = (state: GameState, now = Date.now()): boolean => (state.lottery.golden?.until ?? 0) > now;

/**
 * Elle arrive : la Mimic ordinaire, si elle est là, est écrasée et rend ce qu'elle doit (comme attrapée, l'auteur, 16/10).
 * Déjà là (débogage seulement : un malus ne se tire pas deux fois), elle reste encore autant. Rend ces secondes
 * (mods compris), et ce qu'a rendu la Mimic écrasée (la Connaissance, un jeton ou non).
 */
export const spawnGolden = (
  state: GameState,
  random: () => number = Math.random,
  now = Date.now(),
): { seconds: number; crushed?: { knowledge: number; token: boolean } } => {
  const golden = state.lottery.golden;
  const length = lotterySeconds(state, 'golden') * 1000;
  if (golden && golden.until > now) {
    golden.until += length;
    golden.total = golden.until - now;
    return { seconds: length / 1000 };
  }
  const given = catchMimic(state, now, random);
  state.lottery.golden = {
    until: now + length,
    total: length,
    book: 1 + Math.floor(random() * 1_000_000),
    spot: null,
    pages: 0,
    knowledge: 0,
    strikes: 0,
  };
  return {
    seconds: length / 1000,
    ...(given ? { crushed: { knowledge: Math.ceil(given.eaten + given.bonus), token: given.token } } : {}),
  };
};

/** Des pages gagnées : mangées si elle est là (renvoie true). */
export const goldenEatsPages = (state: GameState, amount: number): boolean => {
  if (!goldenHere(state)) return false;
  state.lottery.golden!.pages += amount;
  return true;
};

/** De la Connaissance gagnée : mangée si elle est là (renvoie true). */
export const goldenEatsKnowledge = (state: GameState, amount: number): boolean => {
  if (!goldenHere(state)) return false;
  state.lottery.golden!.knowledge += amount;
  return true;
};

/** On la frappe quand même : rien ne se passe. Dix fois : un sceau secret (« Dix fois. Pour rien. »). */
export const strikeGolden = (state: GameState, now = Date.now()): void => {
  if (!goldenHere(state, now)) return;
  const golden = state.lottery.golden!;
  golden.strikes += 1;
  if (golden.strikes >= GOLDEN_STRIKES) sealEvent(state, 'tenTimes', now);
};

/** Partie : elle ne laisse rien derrière elle (renvoie true si elle vient de partir). */
export const goldenGone = (state: GameState, now = Date.now()): boolean => {
  if (!state.lottery.golden || goldenHere(state, now)) return false;
  state.lottery.golden = null;
  return true;
};
