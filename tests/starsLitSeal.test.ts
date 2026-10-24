import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { SEALS, STARS_LIT_ALL } from '../src/data/seals';
import { keepStarsLitSeal } from '../src/core/starsLitSeal';

vi.stubGlobal('window', new EventTarget());

describe('le sceau « Tout le ciel » (revue de l’Alpha 3, 24/10)', () => {
  it('garde le même id, quel que soit le nombre d’étoiles ouvertes', () => {
    const ids = SEALS.filter((seal) => seal.text === 'starsLit').map((seal) => seal.id);
    expect(ids).toEqual(['starsLit-1', 'starsLit-10', 'starsLit-25', STARS_LIT_ALL]);
  });

  it('une partie qui l’avait sous l’ancien id le garde, à sa première date', () => {
    const state = createInitialState('fr');
    state.seals = { 'starsLit-1': 1, 'starsLit-10': 2, 'starsLit-25': 3, 'starsLit-129': 4, 'starsLit-148': 6 };
    state.newSeals = ['starsLit-148'];
    const kept = keepStarsLitSeal(state);
    expect(kept.seals).toEqual({ 'starsLit-1': 1, 'starsLit-10': 2, 'starsLit-25': 3, [STARS_LIT_ALL]: 4 });
    expect(kept.newSeals).toEqual([STARS_LIT_ALL]);
  });

  it('ne touche pas une partie sans l’ancien sceau', () => {
    const state = createInitialState('fr');
    state.seals = { 'starsLit-25': 3 };
    expect(keepStarsLitSeal(state)).toBe(state);
  });
});
