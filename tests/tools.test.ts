import { describe, expect, it } from 'vitest';
import { buyTool, toolCost } from '../src/systems/tools';
import { pagesPerSecond, produce } from '../src/systems/production';
import { createInitialState } from '../src/core/state';

describe('outils', () => {
  it('le prix augmente de 15 % par exemplaire', () => {
    expect(toolCost(15, 0)).toBe(15);
    expect(toolCost(15, 1)).toBeCloseTo(17.25);
    expect(toolCost(15, 10)).toBeCloseTo(60.68, 1);
  });

  it("l'achat débite les pages, ajoute l'outil et l'inscrit une seule fois dans l'historique", () => {
    const state = createInitialState('fr');
    state.pages = 100;
    expect(buyTool(state, 'diagonal')).toBe(true);
    expect(buyTool(state, 'diagonal')).toBe(true);
    expect(state.tools.diagonal).toBe(2);
    expect(state.pages).toBeCloseTo(100 - 15 - 17.25);
    expect(state.history.filter((e) => e.type === 'firstTool')).toHaveLength(1);
  });

  it("l'achat est refusé sans assez de pages", () => {
    const state = createInitialState('fr');
    state.pages = 10;
    expect(buyTool(state, 'diagonal')).toBe(false);
    expect(state.tools.diagonal).toBe(0);
  });

  it('la production suit le temps écoulé', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 10;
    expect(pagesPerSecond(state)).toBeCloseTo(1);
    produce(state, 30);
    expect(state.pages).toBeCloseTo(30);
  });
});
