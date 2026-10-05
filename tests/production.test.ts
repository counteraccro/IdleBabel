import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { gainPages, produce, producedWholePages } from '../src/systems/production';

describe('pages gagnées', () => {
  it('comptent ce que chaque méthode a lu dans la partie', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 10;
    state.tools.finger = 2;
    produce(state, 5);
    expect(state.methodPages.diagonal).toBeCloseTo(5);
    expect(state.methodPages.finger).toBeCloseTo(5);
    expect(state.methodPages.voice).toBeUndefined();
  });

  it('avancent encore au-delà de 10¹⁵ pages, même par petites quantités', () => {
    const state = createInitialState('fr');
    state.pages = 1e15;
    state.totalPagesRead = 1e16;
    for (let i = 0; i < 100; i++) gainPages(state, 0.1);
    expect(state.pages).toBe(1e15 + 10);
    expect(state.totalPagesRead).toBe(1e16 + 10);
  });

  it('font tourner les pages au-delà de 10¹⁵ pages', () => {
    const state = createInitialState('fr');
    state.pages = 1e15;
    state.tools.diagonal = 10;
    const before = producedWholePages();
    for (let i = 0; i < 100; i++) produce(state, 0.1);
    expect(producedWholePages() - before).toBe(10);
  });
});
