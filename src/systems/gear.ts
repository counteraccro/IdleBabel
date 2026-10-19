import { GEAR_AGES, GEAR_EVERY, GEAR_MAX_BUYS, GEAR_STAR } from '../data/gear';
import { TOOLS, type ToolId } from '../data/tools';
import type { GameState } from '../core/state';
import { starLit } from './etherium';
import { buyTools, chosenLot, lotCost, lotSize } from './tools';
import { toolUnlocked } from './sentences';
import { pagesPerSecond, toolRate } from './production';

/**
 * Le Rouage (19/10, .ai/idee-rouage.md) : une page de l'Etherium qui achète seule les méthodes. Il prend la plus rentable,
 * comme le joueur qui calcule : son prix sur ce qu'elle lit, plus l'attente pour se l'offrir ; si elle n'est pas encore
 * payable, il attend (prendre la moins chère de celles qu'on peut payer vide les pages sur les vieilles méthodes : −45 %
 * d'Éther au simulateur). Jamais une méthode secrète, seulement celles des Âges dont l'étoile est allumée, au lot choisi
 * sous la ruche. Il tourne quand le jeu tourne (onglet caché compris), jamais pendant l'absence.
 */

/** Le Rouage est acheté (l'axe de sa page). */
export const gearKnown = (state: GameState): boolean => starLit(state, GEAR_STAR);

/** Il tourne : acheté, et pas arrêté sous la ruche. */
export const gearRunning = (state: GameState): boolean => gearKnown(state) && state.gear.on;

/** Les Âges dont il achète les méthodes ('' : l'Âge Manuel). */
export const gearAges = (state: GameState): string[] =>
  Object.entries(GEAR_AGES)
    .filter(([star]) => starLit(state, star))
    .map(([, age]) => age);

/** Secondes entre deux achats : la plus courte de ses étoiles allumées (0 : dès qu'il peut). */
export const gearEvery = (state: GameState): number =>
  Math.min(
    ...Object.entries(GEAR_EVERY)
      .filter(([star]) => starLit(state, star))
      .map(([, every]) => every),
  );

/** La méthode qu'il achètera ensuite, et le prix du lot ; rien s'il n'a aucune méthode à acheter. */
export const gearChoice = (state: GameState): { id: ToolId; count: number; cost: number } | undefined => {
  const ages = gearAges(state);
  const income = Math.max(pagesPerSecond(state), 1);
  const lot = chosenLot(state);
  let best: { id: ToolId; count: number; cost: number } | undefined;
  let bestScore = Infinity;
  for (const tool of TOOLS) {
    if (tool.secret || !ages.includes(tool.age ?? '') || !toolUnlocked(state, tool.id)) continue;
    const rate = toolRate(state, tool.id);
    if (rate <= 0) continue;
    const count = lotSize(state, tool.id, lot);
    const cost = lotCost(state, tool.id, count);
    const score = cost / (rate * count) + Math.max(0, cost - state.pages) / income;
    if (score < bestScore) [best, bestScore] = [{ id: tool.id, count, cost }, score];
  }
  return best;
};

/** Le temps depuis son dernier achat (pas gardé : au rechargement, il repart d'un tour entier). */
let waited = 0;

/** Il achète une fois ; false si la meilleure n'est pas encore payable (il attend). */
const buyOnce = (state: GameState): boolean => {
  const choice = gearChoice(state);
  return !!choice && buyTools(state, choice.id, chosenLot(state)) > 0;
};

/** Le Rouage tourne pendant `seconds` : il achète à sa cadence ; rien s'il est arrêté. Rend le nombre d'achats. */
export const turnGear = (state: GameState, seconds: number): number => {
  if (!gearRunning(state)) {
    waited = 0;
    return 0;
  }
  const every = gearEvery(state);
  let bought = 0;
  if (every === 0) {
    while (bought < GEAR_MAX_BUYS && buyOnce(state)) bought += 1;
    return bought;
  }
  waited += seconds;
  while (waited >= every) {
    if (!buyOnce(state)) {
      // Il attend la bonne méthode : il la prendra dès qu'elle sera payable, sans refaire un tour.
      waited = every;
      return bought;
    }
    waited -= every;
    bought += 1;
  }
  return bought;
};

/** Secondes avant son prochain achat (son tour, ou les pages qui manquent) ; pour la légende du rouage. */
export const gearWait = (state: GameState): number | undefined => {
  const choice = gearChoice(state);
  if (!choice) return undefined;
  const missing = Math.max(0, choice.cost - state.pages) / Math.max(pagesPerSecond(state), 1);
  return Math.max(gearEvery(state) - waited, missing, 0);
};
