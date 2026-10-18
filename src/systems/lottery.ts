import {
  CURSE_DIGIT,
  JACKPOT_DIGIT,
  LOTTERY_BOONS,
  LOTTERY_SPIN_MS,
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
import { goldenHere, spawnGolden } from './goldenMimic';
import { lotteryOdds, lotterySeconds } from './lotteryStars';
import { taskDraw } from './tasks';
import { giveTome, nextTome } from './endings';
import { runHooks } from '../mods/hooks';
import type { GameState, PendingDraw } from '../core/state';

/**
 * Un tirage de la Loterie (data/lottery.ts) : un jeton part, les rouleaux s'arrêtent sur trois chiffres de Babel qui
 * disent le résultat. Rien n'annule rien : un nouveau tirage n'efface pas un malus en cours, et ce que gagne un tirage
 * pendant que la Mimic dorée est là, elle le mange (l'auteur, 16/10). Un bonus ou un malus ne vaut qu'une fois à la fois :
 * déjà en cours, il ne se tire plus. Tous les bonus en cours, la machine se bloque ; tous les malus, un malus tiré donne
 * « rien » (l'auteur, 16/10).
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
  /** La durée qu'il donne (secondes, mods compris). */
  seconds?: number;
  /** Le gros lot : le tome gagné (1 pour le tome 2). */
  tome?: number;
  /** La Mimic dorée a écrasé la Mimic ordinaire : ce que celle-ci a rendu (Connaissance, un jeton ou non). */
  crushed?: { knowledge: number; token: boolean };
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
  const seconds = lotterySeconds(state, 'gain');
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

/** Les malus qu'un tirage peut encore donner : ceux qui ne sont pas en cours (l'auteur, 16/10) ; pas d'arrêt sans méthode. */
export const drawableCurses = (state: GameState, now = Date.now()): (typeof LOTTERY_CURSES)[number][] => {
  const running = lotteryEffects(state, now);
  const methods = TOOLS.some((tool) => state.tools[tool.id] > 0);
  return LOTTERY_CURSES.filter((one) =>
    one.id === 'golden' ? !goldenHere(state, now) : !running.some((effect) => effect.id === one.id) && (one.id !== 'stopped' || methods),
  );
};

/** Le bonus que donnera le tirage (et la méthode du ×10). */
const pickBoon = (state: GameState, plan: PendingDraw, random: () => number, now: number): void => {
  const drawable = drawableBoons(state, now);
  plan.boon = (drawable.find((one) => one.id === forced) ?? pick(drawable, random)).id;
  if (plan.boon === 'method10') {
    const owned = ownedMethods(state);
    plan.method = owned[Math.floor(random() * owned.length)];
  }
};

/** Le malus que donnera le tirage (et la méthode qu'il arrête : la mieux lisante). */
const pickCurse = (state: GameState, plan: PendingDraw, random: () => number, now: number): void => {
  const drawable = drawableCurses(state, now);
  plan.curse = (drawable.find((one) => one.id === forced) ?? pick(drawable, random)).id;
  if (plan.curse === 'stopped') plan.method = ownedMethods(state)[0];
};

/**
 * On tire le levier : un jeton part, le résultat est choisi (les rouleaux savent où s'arrêter), mais il ne compte qu'à
 * leur arrêt (settleLottery ; l'auteur, 16/10 : le bonus apparaissait avant). Rien sans jeton, ni tous les bonus en
 * cours, ni pendant qu'un tirage tourne (renvoie undefined).
 */
export const startLottery = (state: GameState, random: () => number = Math.random, now = Date.now()): PendingDraw | undefined => {
  if (state.lottery.pending || state.lottery.tokens <= 0 || lotteryBlocked(state, now)) return undefined;
  state.lottery.tokens -= 1;
  state.lottery.draws += 1;
  // Le rouleau de la chance, et les mods, changent les chances de chaque résultat (lotteryOdds:<résultat>).
  const odds = lotteryOdds(state);
  let outcome = OUTCOMES.find((one) => one.id === forced)?.id ?? pick(odds, random).id;
  if (LOTTERY_BOONS.some((one) => one.id === forced)) outcome = 'boon';
  if (LOTTERY_CURSES.some((one) => one.id === forced)) outcome = 'curse';
  // Le gros lot donne le tome suivant : sans tome 1, ou sans tome écrit à gagner, ses chances vont à « rien » (l'auteur, 18/10).
  if (outcome === 'jackpot' && nextTome(state) === undefined) outcome = 'nothing';
  // Tous les malus en cours : un malus ne se tire pas deux fois, ses chances vont à « rien ».
  if (outcome === 'curse' && drawableCurses(state, now).length === 0) outcome = 'nothing';
  const plan: PendingDraw = { at: now, outcome, reels: reelsFor(outcome, random) };
  if (outcome === 'boon') pickBoon(state, plan, random, now);
  else if (outcome === 'curse') pickCurse(state, plan, random, now);
  forced = null;
  state.lottery.pending = plan;
  return plan;
};

/** Le dernier tirage compté : la machine le relit si la boucle du jeu l'a compté avant la fin de son animation. */
let last: Draw | undefined;
export const lastLotteryDraw = (): Draw | undefined => last;

/**
 * Les rouleaux sont arrêtés : le tirage compte (gain, bonus, malus, sceaux, crochet `lottery`). La machine le demande à
 * la fin de son animation (`force`) ; sinon (bibliothèque quittée, onglet caché, jeu rechargé), la boucle du jeu le fait
 * une seconde après. Renvoie le tirage, ou undefined s'il n'y en a pas (ou pas encore).
 */
export const settleLottery = (state: GameState, random: () => number = Math.random, now = Date.now(), force = false): Draw | undefined => {
  const plan = state.lottery.pending;
  if (!plan || (!force && now < plan.at + LOTTERY_SPIN_MS + 1000)) return undefined;
  state.lottery.pending = null;
  const draw: Draw = { outcome: plan.outcome, reels: [...plan.reels] };
  if (plan.outcome === 'gain') gain(state, draw, random);
  else if (plan.outcome === 'jackpot') {
    const tome = nextTome(state);
    if (tome !== undefined) {
      giveTome(state, tome);
      draw.tome = tome;
    }
  } else if (plan.boon) {
    draw.boon = plan.boon;
    if (plan.method) draw.method = plan.method;
    draw.seconds = lotterySeconds(state, 'boon');
    startLotteryEffect(state, plan.boon, draw.seconds, now, draw.method);
  } else if (plan.curse === 'golden') {
    draw.curse = 'golden';
    const golden = spawnGolden(state, random, now);
    draw.seconds = golden.seconds;
    if (golden.crushed) draw.crushed = golden.crushed;
  } else if (plan.curse) {
    draw.curse = plan.curse;
    if (plan.method) draw.method = plan.method;
    draw.seconds = lotterySeconds(state, 'curse');
    startLotteryEffect(state, plan.curse, draw.seconds, now, draw.method);
  }
  taskDraw(state, draw.outcome);
  checkSeals(state, now);
  runHooks('lottery', { ...draw, reels: [...draw.reels] });
  last = draw;
  return draw;
};

/** Un tirage d'un coup, sans attendre les rouleaux (les tests, le débogage). */
export const drawLottery = (state: GameState, random: () => number = Math.random, now = Date.now()): Draw | undefined =>
  startLottery(state, random, now) && settleLottery(state, random, now, true);
