import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { PAGES_PER_BOOK, bookProgress, turnBookPage } from '../src/systems/books';

describe('livres', () => {
  it('avance dans le livre à chaque page tournée', () => {
    const state = createInitialState('fr');
    expect(turnBookPage(state)).toBe(false);
    expect(state.bookPage).toBe(1);
    expect(bookProgress(state)).toBeCloseTo(1 / PAGES_PER_BOOK);
  });

  it('termine le livre à la 410e page et en commence un autre', () => {
    const state = createInitialState('fr');
    state.bookPage = PAGES_PER_BOOK - 1;
    expect(turnBookPage(state)).toBe(true);
    expect(state.bookPage).toBe(0);
    expect(state.booksFinished).toBe(1);
    expect(state.history.filter((e) => e.type === 'firstBook')).toHaveLength(1);
  });

  it("n'inscrit que le premier livre dans l'historique", () => {
    const state = createInitialState('fr');
    for (let i = 0; i < PAGES_PER_BOOK * 2; i++) turnBookPage(state);
    expect(state.booksFinished).toBe(2);
    expect(state.history.filter((e) => e.type === 'firstBook')).toHaveLength(1);
  });

  it('ne compte pas de pages lues (elles le sont déjà par le clic ou la production)', () => {
    const state = createInitialState('fr');
    turnBookPage(state);
    expect(state.pages).toBe(0);
    expect(state.totalPagesRead).toBe(0);
  });
});
