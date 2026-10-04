import { BUY_LOTS, COST_GROWTH, TOOLS, type BuyLot, type ToolId } from '../data/tools';
import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { armfulLots, toolPriceFactor } from './technologies';

/** Prix(n) = PrixBase × 1,15^n */
export const toolCost = (baseCost: number, owned: number): number => baseCost * COST_GROWTH ** owned;

/** Prix de la prochaine, Économie du geste comprise. */
export const nextToolCost = (state: GameState, id: ToolId): number => {
  const tool = TOOLS.find((t) => t.id === id)!;
  return toolCost(tool.baseCost, state.tools[id]) * toolPriceFactor(state);
};

/** Prix de `count` méthodes d'un coup : chacune 15 % plus chère que la précédente (suite géométrique). */
export const lotCost = (state: GameState, id: ToolId, count: number): number => {
  const next = nextToolCost(state, id);
  return count === 1 ? next : (next * (COST_GROWTH ** count - 1)) / (COST_GROWTH - 1);
};

/** Assez de pages pour ce prix ? (À un cheveu près : la somme d'une suite garde des miettes d'arrondi.) */
const canPay = (state: GameState, cost: number): boolean => cost <= state.pages * (1 + 1e-12);

/** Combien de méthodes les pages permettent d'acheter d'un coup. */
export const affordableTools = (state: GameState, id: ToolId): number => {
  // Des pages sans fin (débogage) : le compte ne finirait jamais.
  if (!Number.isFinite(state.pages)) return 0;
  const next = nextToolCost(state, id);
  let count = Math.max(0, Math.floor(Math.log(1 + (state.pages * (COST_GROWTH - 1)) / next) / Math.log(COST_GROWTH)));
  // Le logarithme peut se tromper d'une unité à l'arrondi : on vérifie avec le prix exact.
  while (count > 0 && !canPay(state, lotCost(state, id, count))) count -= 1;
  while (canPay(state, lotCost(state, id, count + 1))) count += 1;
  return count;
};

/** Lot choisi, ramené à un choix connu (une sauvegarde abîmée achète une par une). */
export const validLot = (lot: unknown): BuyLot => (BUY_LOTS.includes(lot as BuyLot) ? (lot as BuyLot) : 1);

/**
 * Le lot qu'un clic achète : le choix sous la ruche, s'il est ouvert par la Brassée ; sinon le plus grand
 * qui l'est. Maj enfoncée : ×10, si la Brassée l'a ouvert.
 */
export const chosenLot = (state: GameState, shift = false): BuyLot => {
  const lots = armfulLots(state);
  if (shift && lots.includes(10)) return 10;
  const lot = validLot(state.settings.buyLot);
  return lots.includes(lot) ? lot : lots[lots.length - 1];
};

/** Combien de méthodes un clic achèterait avec ce lot (« max » : au moins une, pour en dire le prix). */
export const lotSize = (state: GameState, id: ToolId, lot: BuyLot): number =>
  lot === 'max' ? Math.max(1, affordableTools(state, id)) : lot;

/** Achète le lot entier, ou rien s'il manque des pages. Rend le nombre de méthodes achetées. */
export const buyTools = (state: GameState, id: ToolId, lot: BuyLot = 1): number => {
  const count = lotSize(state, id, lot);
  const cost = lotCost(state, id, count);
  if (!canPay(state, cost)) return 0;
  state.pages = Math.max(0, state.pages - cost);
  state.tools[id] += count;
  recordOnce(state, 'firstTool', id);
  return count;
};

export const buyTool = (state: GameState, id: ToolId): boolean => buyTools(state, id, 1) > 0;
