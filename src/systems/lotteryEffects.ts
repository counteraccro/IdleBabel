import { HALF, LOTTERY_BOONS, type LotteryEffectId } from '../data/lottery';
import type { ToolId } from '../data/tools';
import type { GameState, LotteryEffect } from '../core/state';

/**
 * Ce que font les bonus et les malus de la Loterie en cours (systems/lottery.ts les tire). Ils se cumulent : un nouveau
 * tirage n'en efface aucun (l'auteur, 16/10). Ils comptent en temps réel et restent au prestige.
 */

/** Ceux qui durent encore. */
export const lotteryEffects = (state: GameState, now = Date.now()): LotteryEffect[] =>
  state.lottery.effects.filter((effect) => effect.end > now);

const on = (state: GameState, id: LotteryEffectId, now: number): boolean =>
  state.lottery.effects.some((effect) => effect.id === id && effect.end > now);

/** La production de toutes les méthodes : ×1,5, ×2, ×3 (qui se multiplient), ÷ 2. */
export const lotteryReading = (state: GameState, now = Date.now()): number => {
  if (state.lottery.effects.length === 0) return 1;
  let factor = on(state, 'half', now) ? HALF : 1;
  for (const boon of LOTTERY_BOONS) if (boon.id !== 'method10' && on(state, boon.id, now)) factor *= boon.factor;
  return factor;
};

/** Une seule méthode : ×10 (le bonus), 0 (le malus, la méthode arrêtée). */
export const lotteryMethod = (state: GameState, id: ToolId, now = Date.now()): number => {
  let factor = 1;
  for (const effect of state.lottery.effects)
    if (effect.method === id && effect.end > now)
      factor *= effect.id === 'stopped' ? 0 : LOTTERY_BOONS.find((boon) => boon.id === 'method10')!.factor;
  return factor;
};

/** Un bonus ou un malus commence ; le même (et la même méthode) déjà en cours : sa durée s'ajoute à ce qui restait. */
export const startLotteryEffect = (state: GameState, id: LotteryEffectId, seconds: number, now = Date.now(), method?: ToolId): void => {
  state.lottery.effects = lotteryEffects(state, now);
  const same = state.lottery.effects.find((effect) => effect.id === id && effect.method === method);
  if (same) {
    same.end += seconds * 1000;
    same.total = same.end - now;
    return;
  }
  state.lottery.effects.push({ id, end: now + seconds * 1000, total: seconds * 1000, ...(method ? { method } : {}) });
};
