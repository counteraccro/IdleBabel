import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { clarity } from '../src/systems/perception';
import { buyTool } from '../src/systems/tools';
import { gainPages } from '../src/systems/production';

describe('découverte de la pièce', () => {
  it('commence dans le noir', () => {
    expect(clarity(createInitialState('fr'))).toBeLessThan(0.2);
  });

  it('progresse avec la lecture et révèle toute la pièce', () => {
    const state = createInitialState('fr');
    gainPages(state, 100);
    const early = clarity(state);
    gainPages(state, 5_000);
    expect(clarity(state)).toBeGreaterThan(early);
    expect(clarity(state)).toBeGreaterThanOrEqual(1);
  });

  it("dépenser des pages ne rend pas l'obscurité", () => {
    const state = createInitialState('fr');
    gainPages(state, 500);
    const before = clarity(state);
    buyTool(state, 'diagonal');
    expect(state.pages).toBeLessThan(500);
    expect(clarity(state)).toBe(before);
  });
});
