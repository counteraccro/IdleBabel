import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { passTime } from '../src/core/absence';
import { readWhileAway } from '../src/systems/awayReading';
import { forceRareBook, isRareBookFound } from '../src/systems/rareBooks';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { AWAY_SHARE, MAX_AWAY_SECONDS } from '../src/data/knowledge';

vi.stubGlobal('window', new EventTarget());

/** Une partie dont le premier livre est ouvert, à `pagesPerSecond` pages par seconde. */
const reading = (pagesPerSecond: number) => {
  const state = createInitialState('fr');
  state.playerName = 'Test';
  state.loreSeen.push('lookAround', 'whiteBook', 'firstBook');
  state.tools.diagonal = pagesPerSecond * 10; // 0,1 page/s chacune
  return state;
};

describe('lecture pendant l’absence', () => {
  afterEach(() => forceRareBook(5, undefined));

  it('fait avancer le livre en main, et referme ceux lus jusqu’au bout', () => {
    const state = createInitialState('fr');
    expect(readWhileAway(state, 100, () => 0)).toBe(0);
    expect(state.bookPage).toBe(100);
    expect(readWhileAway(state, 2 * PAGES_PER_BOOK, () => 0)).toBe(2);
    expect(state.booksFinished).toBe(2);
    expect(state.bookPage).toBe(100);
  });

  it('trouve les livres rares pris en route', () => {
    const state = createInitialState('fr');
    forceRareBook(5, 'voynich');
    readWhileAway(state, 10 * PAGES_PER_BOOK, () => 0);
    expect(isRareBookFound(state, 'voynich')).toBe(true);
    expect(state.rareBooks.voynich).toBe(5);
  });
});

describe('absence', () => {
  it('ne rapporte rien sans production', () => {
    const state = reading(0);
    const report = passTime(state, 3600, 'away');
    expect(report).toMatchObject({ pages: 0, books: 0, finds: 0 });
    expect(state.bookPage).toBe(0);
  });

  it('compte les pages au rythme de la production, et le livre avance', () => {
    const state = reading(10);
    const report = passTime(state, 3600, 'away');
    expect(report.pages).toBeCloseTo(10 * 3600 * AWAY_SHARE);
    expect(state.pages).toBeCloseTo(10 * 3600 * AWAY_SHARE);
    // 18 000 pages tournées : 43 livres refermés, et 370 pages du suivant.
    expect(report.books).toBe(43);
    expect(state.booksFinished).toBe(43);
    expect(state.bookPage).toBe(370);
    expect(report.finds).toBeGreaterThan(0);
    expect(report.seals).toBeGreaterThan(0);
  });

  it('plafonne à 8 h', () => {
    const state = reading(10);
    expect(passTime(state, 7 * 24 * 3600, 'away').pages).toBeCloseTo(10 * MAX_AWAY_SECONDS * AWAY_SHARE);
  });

  it('pages coupées : les pages comptent, le livre ne bouge pas', () => {
    const state = reading(10);
    state.settings.autoTurn = false;
    const report = passTime(state, 3600, 'away');
    expect(report.pages).toBeCloseTo(10 * 3600 * AWAY_SHARE);
    expect(report).toMatchObject({ books: 0, finds: 0 });
    expect(state.bookPage).toBe(0);
  });

  it('livre pas encore ouvert (récit firstBook) : rien ne tourne', () => {
    const state = reading(10);
    state.loreSeen = [];
    expect(passTime(state, 3600, 'away').books).toBe(0);
    expect(state.bookPage).toBe(0);
  });

  it('modale : les pages sont déjà comptées par la boucle, le livre avance en entier', () => {
    const state = reading(10);
    const report = passTime(state, 41, 'pause');
    expect(report.pages).toBe(0);
    // 410 pages : le premier livre, tout entier.
    expect(report.books).toBe(1);
    expect(state.bookPage).toBe(0);
  });
});
