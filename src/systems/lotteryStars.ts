import { LOTTERY_BOONS, LOTTERY_STARS, OUTCOMES, type LotteryBoonId, type OutcomeId } from '../data/lottery';
import { lotteryLuckLevel, lotteryTimeLevel, lotteryTokenLevel, lotteryValueLevel } from './etherium';
import { modded } from '../mods/quantities';
import type { GameState } from '../core/state';

/**
 * La Loterie, avec les étoiles de sa page dans l'Etherium (l'auteur, 17/10 ; data/lottery.ts, LOTTERY_STARS) : chaque
 * rouleau rend la machine plus généreuse et plus cruelle. Les mods s'y ajoutent (tokenChance, lotteryGain, lotteryBoon,
 * lotteryCurse, lotteryOdds:<résultat>).
 */

/** La chance qu'une Mimic attrapée lâche un jeton. */
export const tokenChance = (state: GameState): number => LOTTERY_STARS.token[lotteryTokenLevel(state)] * modded('tokenChance');

/** Les secondes du gain (de lecture d'absence), d'un bonus, d'un malus, de la Mimic dorée. */
export const lotterySeconds = (state: GameState, kind: keyof typeof LOTTERY_STARS.time): number =>
  LOTTERY_STARS.time[kind][lotteryTimeLevel(state)] *
  modded(kind === 'gain' ? 'lotteryGain' : kind === 'boon' ? 'lotteryBoon' : 'lotteryCurse');

/** Le facteur d'un bonus de la Loterie : ce qu'il ajoute, multiplié par le rouleau de la valeur (×1,5 → ×1,75 → ×2). */
export const boonFactor = (state: GameState, id: LotteryBoonId): number => {
  const base = LOTTERY_BOONS.find((boon) => boon.id === id)!.factor;
  return 1 + (base - 1) * LOTTERY_STARS.value.boost[lotteryValueLevel(state)];
};

/** La part de la production qui reste pendant le malus « production divisée » (÷2, puis ÷3, ÷4). */
export const halfFactor = (state: GameState): number => 1 / LOTTERY_STARS.value.half[lotteryValueLevel(state)];

/** La part de chaque résultat d'un tirage (sur 100), avec le rouleau de la chance et les mods. */
export const lotteryOdds = (state: GameState): { id: OutcomeId; weight: number }[] => {
  const level = lotteryLuckLevel(state);
  return OUTCOMES.map((one) => ({ id: one.id, weight: LOTTERY_STARS.luck[one.id][level] * modded(`lotteryOdds:${one.id}`) }));
};
