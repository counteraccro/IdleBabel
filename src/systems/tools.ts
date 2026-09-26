import { COST_GROWTH, TOOLS, type ToolId } from '../data/tools';
import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';

/** Prix(n) = PrixBase × 1,15^n */
export const toolCost = (baseCost: number, owned: number): number => baseCost * COST_GROWTH ** owned;

export const nextToolCost = (state: GameState, id: ToolId): number => {
  const tool = TOOLS.find((t) => t.id === id)!;
  return toolCost(tool.baseCost, state.tools[id]);
};

export const buyTool = (state: GameState, id: ToolId): boolean => {
  const cost = nextToolCost(state, id);
  if (state.pages < cost) return false;
  state.pages -= cost;
  state.tools[id] += 1;
  recordOnce(state, 'firstTool', id);
  return true;
};
