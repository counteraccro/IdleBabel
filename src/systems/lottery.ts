import {
  BOON_SECONDS,
  CURSE_DIGIT,
  CURSE_SECONDS,
  GAIN_SECONDS,
  JACKPOT_DIGIT,
  JACKPOT_READY,
  LOTTERY_BOONS,
  LOTTERY_CURSES,
  OUTCOMES,
  type LotteryBoonId,
  type LotteryCurseId,
  type OutcomeId,
} from '../data/lottery';
import { TOOLS, type ToolId } from '../data/tools';
import { gainPages, pagesPerSecond, toolRate } from './production';
import { findWhileAway } from './knowledge';
import { checkSeals } from './seals';
import { startLotteryEffect } from './lotteryEffects';
import { spawnGolden } from './goldenMimic';
import type { GameState } from '../core/state';

/**
 * Un tirage de la Loterie (data/lottery.ts) : un jeton part, les rouleaux s'arrêtent sur trois chiffres de Babel qui
 * disent le résultat. Rien n'annule rien : un nouveau tirage n'efface pas un malus en cours, et ce que gagne un tirage
 * pendant que la Mimic dorée est là, elle le mange (l'auteur, 16/10).
 */

export interface Draw {
  outcome: OutcomeId;
  /** Les trois chiffres des rouleaux, de gauche à droite. */
  reels: [number, number, number];
  /** Le gain : pages et Connaissance (ce qui est arrivé ; mangé par la Mimic dorée, il ne compte pas). */
  pages?: number;
  knowledge?: number;
  /** Le bonus ou le malus tiré, et la méthode qu'il vise. */
  boon?: LotteryBoonId;
  curse?: LotteryCurseId;
  method?: ToolId;
}

/** Débogage : le prochain tirage donnera ceci (un résultat, ou un bonus, ou un malus précis). */
let forced: OutcomeId | LotteryBoonId | LotteryCurseId | null = null;
export const forceDraw = (what: typeof forced): void => {
  forced = what;
};

const pick = <T extends { weight: number }>(list: readonly T[], random: () => number): T => {
  let roll = random() * list.reduce((total, item) => total + item.weight, 0);
  for (const item of list) if ((roll -= item.weight) < 0) return item;
  return list[list.length - 1];
};

/** Un chiffre de 0 à 9, sauf ceux de `not`. */
const digit = (random: () => number, not: readonly number[]): number => {
  const allowed = [...Array(10).keys()].filter((candidate) => !not.includes(candidate));
  return allowed[Math.floor(random() * allowed.length)];
};

/** Les rouleaux du résultat : trois différents ; deux pareils ; trois pareils (ni 7 ni 0) ; trois 0 ; trois 7. */
export const reelsFor = (outcome: OutcomeId, random: () => number): [number, number, number] => {
  if (outcome === 'jackpot') return [JACKPOT_DIGIT, JACKPOT_DIGIT, JACKPOT_DIGIT];
  if (outcome === 'curse') return [CURSE_DIGIT, CURSE_DIGIT, CURSE_DIGIT];
  if (outcome === 'boon') {
    const same = digit(random, [JACKPOT_DIGIT, CURSE_DIGIT]);
    return [same, same, same];
  }
  if (outcome === 'gain') {
    const pair = digit(random, []);
    const other = digit(random, [pair]);
    const reels: [number, number, number] = [pair, pair, pair];
    reels[Math.floor(random() * 3)] = other;
    return reels;
  }
  const a = digit(random, []);
  const b = digit(random, [a]);
  return [a, b, digit(random, [a, b])];
};

/** Les méthodes qu'on a, la mieux lisante d'abord. */
const ownedMethods = (state: GameState): ToolId[] =>
  TOOLS.filter((tool) => state.tools[tool.id] > 0)
    .map((tool) => tool.id)
    .sort((a, b) => state.tools[b] * toolRate(state, b) - state.tools[a] * toolRate(state, a));

/** Le gain : trente minutes de lecture d'absence, d'un coup (les pages de la production, les trouvailles de leurs feuilles). */
const gain = (state: GameState, draw: Draw, random: () => number): void => {
  const before = { pages: state.pages, knowledge: state.knowledge };
  gainPages(state, pagesPerSecond(state) * GAIN_SECONDS);
  findWhileAway(state, GAIN_SECONDS, random);
  draw.pages = state.pages - before.pages;
  draw.knowledge = state.knowledge - before.knowledge;
};

const boon = (state: GameState, draw: Draw, random: () => number, now: number): void => {
  const owned = ownedMethods(state);
  // Sans méthode, pas de ×10 : un des autres.
  const chosen =
    LOTTERY_BOONS.find((one) => one.id === forced && (one.id !== 'method10' || owned.length > 0)) ??
    pick(
      LOTTERY_BOONS.filter((one) => one.id !== 'method10' || owned.length > 0),
      random,
    );
  draw.boon = chosen.id;
  if (chosen.id === 'method10') draw.method = owned[Math.floor(random() * owned.length)];
  startLotteryEffect(state, chosen.id, BOON_SECONDS, now, draw.method);
};

const curse = (state: GameState, draw: Draw, random: () => number, now: number): void => {
  const best = ownedMethods(state)[0];
  // Sans méthode, rien à arrêter : la production ÷ 2 (qui ne fait rien non plus), ou la Mimic dorée.
  const chosen =
    LOTTERY_CURSES.find((one) => one.id === forced && (one.id !== 'stopped' || best)) ??
    pick(
      LOTTERY_CURSES.filter((one) => one.id !== 'stopped' || best),
      random,
    );
  draw.curse = chosen.id;
  if (chosen.id === 'golden') return spawnGolden(state, random, now);
  if (chosen.id === 'stopped') draw.method = best;
  startLotteryEffect(state, chosen.id, CURSE_SECONDS, now, draw.method);
};

/** On joue un jeton : rien sans jeton (renvoie undefined). */
export const drawLottery = (state: GameState, random: () => number = Math.random, now = Date.now()): Draw | undefined => {
  if (state.lottery.tokens <= 0) return undefined;
  state.lottery.tokens -= 1;
  state.lottery.draws += 1;
  let outcome = OUTCOMES.find((one) => one.id === forced)?.id ?? pick(OUTCOMES, random).id;
  if (LOTTERY_BOONS.some((one) => one.id === forced)) outcome = 'boon';
  if (LOTTERY_CURSES.some((one) => one.id === forced)) outcome = 'curse';
  // Le livre du gros lot n'est pas encore écrit : ses chances vont à « rien ».
  if (outcome === 'jackpot' && !JACKPOT_READY) outcome = 'nothing';
  const draw: Draw = { outcome, reels: reelsFor(outcome, random) };
  if (outcome === 'gain') gain(state, draw, random);
  else if (outcome === 'boon') boon(state, draw, random, now);
  else if (outcome === 'curse') curse(state, draw, random, now);
  forced = null;
  checkSeals(state, now);
  return draw;
};
