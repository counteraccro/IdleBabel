import { dayOf } from './dailyTasks';
import { relicBonus } from './relics';
import type { GameState } from '../core/state';

/**
 * Le Jeton, la 5e relique (l'auteur, 18/10, .ai/maquette-relique-jeton.html) : tant qu'il agit, des jetons offerts chaque
 * jour (5, puis 7 et 10 avec ses étoiles), joués avant les jetons gagnés et perdus à minuit s'ils ne l'ont pas été. Le jour
 * où on le pose, ils arrivent tout de suite ; poser une autre relique les met de côté jusqu'à minuit (le reposer le même
 * jour ne les redonne pas).
 */

/** Les jetons du jour qui restent : ceux d'aujourd'hui, si le Jeton agit. */
export const dailyTokensLeft = (state: GameState, now = Date.now()): number => {
  const daily = state.lottery.daily;
  return state.relics.active === 'token' && daily?.day === dayOf(now) ? daily.left : 0;
};

/** Tous les jetons qu'on peut jouer : ceux du jour, puis ceux gagnés (l'écran de la machine). */
export const lotteryTokens = (state: GameState, now = Date.now()): number => state.lottery.tokens + dailyTokensLeft(state, now);

/** Un jeton joué : un du jour d'abord, sinon un gagné. */
export const spendToken = (state: GameState, now = Date.now()): void => {
  if (dailyTokensLeft(state, now) > 0) state.lottery.daily!.left -= 1;
  else state.lottery.tokens -= 1;
};

/**
 * Le Jeton qui agit : à minuit (ou le jour où on le pose), les jetons du jour ; une étoile allumée dans la journée ajoute
 * ce qui manque. Renvoie les jetons donnés.
 */
export const refreshTokenDay = (state: GameState, now = Date.now()): number => {
  if (state.relics.active !== 'token') return 0;
  const day = dayOf(now);
  const daily = state.lottery.daily?.day === day ? state.lottery.daily : (state.lottery.daily = { day, left: 0, given: 0 });
  const more = relicBonus(state, 'token') - daily.given;
  if (more <= 0) return 0;
  daily.left += more;
  daily.given += more;
  return more;
};
