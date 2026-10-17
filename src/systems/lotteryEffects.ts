import { LOTTERY_BOONS, LOTTERY_CURSES, type LotteryEffectId } from '../data/lottery';
import { goldenHere } from './goldenMimic';
import { boonFactor, halfFactor } from './lotteryStars';
import type { ToolId } from '../data/tools';
import type { GameState, LotteryEffect } from '../core/state';

/**
 * Ce que font les bonus et les malus de la Loterie en cours (systems/lottery.ts les tire). Des effets différents se
 * cumulent : un nouveau tirage n'en efface aucun (l'auteur, 16/10) ; un bonus ou un malus déjà en cours ne se tire plus
 * (systems/lottery.ts). Ils comptent en temps réel et restent au prestige.
 */

/** Ceux qui durent encore. */
export const lotteryEffects = (state: GameState, now = Date.now()): LotteryEffect[] =>
  state.lottery.effects.filter((effect) => effect.end > now);

const on = (state: GameState, id: LotteryEffectId, now: number): boolean =>
  state.lottery.effects.some((effect) => effect.id === id && effect.end > now);

/** La production de toutes les méthodes : ×1,5, ×2, ×3 (qui se multiplient), ÷ 2 (le rouleau de la valeur les change). */
export const lotteryReading = (state: GameState, now = Date.now()): number => {
  if (state.lottery.effects.length === 0) return 1;
  let factor = on(state, 'half', now) ? halfFactor(state) : 1;
  for (const boon of LOTTERY_BOONS) if (boon.id !== 'method10' && on(state, boon.id, now)) factor *= boonFactor(state, boon.id);
  return factor;
};

/** Une seule méthode : ×10 (le bonus), 0 (le malus, la méthode arrêtée). */
export const lotteryMethod = (state: GameState, id: ToolId, now = Date.now()): number => {
  let factor = 1;
  for (const effect of state.lottery.effects)
    if (effect.method === id && effect.end > now) factor *= effect.id === 'stopped' ? 0 : boonFactor(state, 'method10');
  return factor;
};

/** Tous les bonus à la fois, tous les malus (la Mimic dorée comprise) : deux sceaux secrets, et les deux ensemble un troisième. */
export const allLotteryBoons = (state: GameState, now = Date.now()): boolean => LOTTERY_BOONS.every((boon) => on(state, boon.id, now));
export const allLotteryCurses = (state: GameState, now = Date.now()): boolean =>
  LOTTERY_CURSES.every((curse) => (curse.id === 'golden' ? goldenHere(state, now) : on(state, curse.id, now)));

/** Un bonus ou un malus commence ; le même déjà en cours (débogage seulement) : sa durée s'ajoute à ce qui restait. */
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
