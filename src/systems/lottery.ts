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
import { creditMethods, gainPages, pagesPerSecond, toolRate } from './production';
import { findWhileAway } from './knowledge';
import { checkSeals } from './seals';
import { lotteryEffects, startLotteryEffect } from './lotteryEffects';
import { spawnGolden } from './goldenMimic';
import { modded } from '../mods/quantities';
import { runHooks } from '../mods/hooks';
import type { GameState } from '../core/state';

/**
 * Un tirage de la Loterie (data/lottery.ts) : un jeton part, les rouleaux s'arrêtent sur trois chiffres de Babel qui
 * disent le résultat. Rien n'annule rien : un nouveau tirage n'efface pas un malus en cours, et ce que gagne un tirage
 * pendant que la Mimic dorée est là, elle le mange (l'auteur, 16/10). Un bonus ne vaut qu'une fois à la fois : avec
 * beaucoup de jetons, ils casseraient le jeu ; tous en cours, la machine se bloque (l'auteur, 16/10).
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
  /** La durée qu'il donne (secondes, mods compris) ; un malus déjà en cours s'allonge d'autant. */
  seconds?: number;
}

/** Débogage : le prochain tirage donnera ceci (un résultat, ou un bonus, ou un malus précis). */
let forced: OutcomeId | LotteryBoonId | LotteryCurseId | null = null;
export const forceDraw = (what: typeof forced): void => {
  forced = what;
};

/** Au hasard, selon les poids ; tous à 0 (un mod), le premier (pour les résultats : « rien »). */
const pick = <T extends { weight: number }>(list: readonly T[], random: () => number): T => {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  if (!(total > 0)) return list[0];
  let roll = random() * total;
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
  // Ce qu'avale la Mimic ordinaire compte : elle le rendra. Ce que mange la dorée, non.
  const before = { pages: state.pages, knowledge: state.knowledge + state.mimic.eaten };
  const seconds = GAIN_SECONDS * modded('lotteryGain');
  gainPages(state, pagesPerSecond(state) * seconds);
  creditMethods(state, seconds);
  findWhileAway(state, seconds, random);
  draw.pages = state.pages - before.pages;
  draw.knowledge = state.knowledge + state.mimic.eaten - before.knowledge;
};

/** Les bonus qu'un tirage peut encore donner : ceux qui ne sont pas en cours ; pas de ×10 sans méthode. */
export const drawableBoons = (state: GameState, now = Date.now()): (typeof LOTTERY_BOONS)[number][] => {
  const running = lotteryEffects(state, now);
  const methods = TOOLS.some((tool) => state.tools[tool.id] > 0);
  return LOTTERY_BOONS.filter((one) => !running.some((effect) => effect.id === one.id) && (one.id !== 'method10' || methods));
};

/** Tous les bonus en cours : la machine ne prend plus de jeton (le levier descend à peine, comme sans jeton). */
export const lotteryBlocked = (state: GameState, now = Date.now()): boolean => drawableBoons(state, now).length === 0;

const boon = (state: GameState, draw: Draw, random: () => number, now: number): void => {
  const drawable = drawableBoons(state, now);
  const chosen = drawable.find((one) => one.id === forced) ?? pick(drawable, random);
  draw.boon = chosen.id;
  if (chosen.id === 'method10') {
    const owned = ownedMethods(state);
    draw.method = owned[Math.floor(random() * owned.length)];
  }
  draw.seconds = BOON_SECONDS * modded('lotteryBoon');
  startLotteryEffect(state, chosen.id, draw.seconds, now, draw.method);
};

const curse = (state: GameState, draw: Draw, random: () => number, now: number): void => {
  // Une méthode déjà arrêtée le reste plus longtemps (sinon, à 0, elle laisserait la suivante s'arrêter aussi).
  const best = lotteryEffects(state, now).find((effect) => effect.id === 'stopped')?.method ?? ownedMethods(state)[0];
  // Sans méthode, rien à arrêter : la production ÷ 2 (qui ne fait rien non plus), ou la Mimic dorée.
  const chosen =
    LOTTERY_CURSES.find((one) => one.id === forced && (one.id !== 'stopped' || best)) ??
    pick(
      LOTTERY_CURSES.filter((one) => one.id !== 'stopped' || best),
      random,
    );
  draw.curse = chosen.id;
  if (chosen.id === 'golden') {
    draw.seconds = spawnGolden(state, random, now);
    return;
  }
  if (chosen.id === 'stopped') draw.method = best;
  draw.seconds = CURSE_SECONDS * modded('lotteryCurse');
  startLotteryEffect(state, chosen.id, draw.seconds, now, draw.method);
};

/** On joue un jeton : rien sans jeton, ni tous les bonus en cours (renvoie undefined). */
export const drawLottery = (state: GameState, random: () => number = Math.random, now = Date.now()): Draw | undefined => {
  if (state.lottery.tokens <= 0 || lotteryBlocked(state, now)) return undefined;
  state.lottery.tokens -= 1;
  state.lottery.draws += 1;
  // Les mods peuvent changer les chances de chaque résultat (lotteryOdds:<résultat>).
  const odds = OUTCOMES.map((one) => ({ id: one.id, weight: one.weight * modded(`lotteryOdds:${one.id}`) }));
  let outcome = OUTCOMES.find((one) => one.id === forced)?.id ?? pick(odds, random).id;
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
  runHooks('lottery', { ...draw, reels: [...draw.reels] });
  return draw;
};
