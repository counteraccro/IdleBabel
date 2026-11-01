import { afterEach, describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { BOON } from '../src/data/letter';
import { activeBoons, boonOn, forgetBoons } from '../src/systems/boons';
import { buy, canBuy, hourPrice, hoursToday, shopPrice } from '../src/systems/stampShop';
import { pagesPerSecond } from '../src/systems/production';

/** Une partie qui lit seule (une Lecture Diagonale), `balance` tampons sur la carte, les étoiles `stars` allumées. */
const game = (balance: number, ...stars: string[]): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = stars;
  state.tools.diagonal = 1;
  state.tasks.stamps.balance = balance;
  return state;
};

const NOON = new Date(2026, 10, 2, 12).getTime();
const NEXT_DAY = new Date(2026, 10, 3, 9).getTime();

afterEach(() => forgetBoons());

describe('le guichet', () => {
  it('réserve un bonus appris : les tampons dépensés, le bonus lancé ; sa durée s’ajoute à ce qui restait', () => {
    const state = game(100);
    expect(buy(state, { kind: 'boon', id: 'trance' }, Math.random, NOON)).toBe(true);
    expect(state.tasks.stamps.balance).toBe(70);
    expect(boonOn('trance', NOON + 1000)).toBe(true);
    buy(state, { kind: 'boon', id: 'trance' }, Math.random, NOON);
    expect(activeBoons(NOON)[0].left).toBe(60_000);
    expect(state.tasks.shop.purchases).toBe(2);
  });

  it('ne vend pas un bonus que la lettre ne connaît pas, ni Quatre cent dix', () => {
    const state = game(100);
    expect(shopPrice(state, { kind: 'boon', id: 'eye' })).toBeUndefined();
    expect(buy(state, { kind: 'boon', id: 'eye' })).toBe(false);
    expect(shopPrice(game(100, 'quill.r1'), { kind: 'boon', id: 'eye' })).toBe(15);
    expect(shopPrice(state, { kind: 'boon', id: 'fourTen' })).toBeUndefined();
    expect(state.tasks.stamps.balance).toBe(100);
  });

  it('l’Éclair donne ses dix minutes de lecture d’un coup', () => {
    const state = game(100, 'quill.r5');
    const pages = state.pages;
    buy(state, { kind: 'boon', id: 'flash' }, Math.random, NOON);
    expect(state.pages - pages).toBeCloseTo(pagesPerSecond(state) * BOON.flash);
  });

  it('pas assez de tampons : rien', () => {
    const state = game(29);
    expect(canBuy(state, { kind: 'boon', id: 'trance' })).toBe(false);
    expect(buy(state, { kind: 'boon', id: 'trance' })).toBe(false);
    expect(state.tasks.stamps.balance).toBe(29);
  });

  it('une heure de lecture : une heure de pages ; 10, puis 10 de plus à chaque heure, remis à 10 le lendemain', () => {
    const state = game(100);
    const pages = state.pages;
    expect(hourPrice(state, NOON)).toBe(10);
    buy(state, { kind: 'hour', of: 'reading' }, Math.random, NOON);
    expect(state.pages - pages).toBeCloseTo(pagesPerSecond(state) * 3600);
    buy(state, { kind: 'hour', of: 'knowledge' }, Math.random, NOON);
    expect(state.tasks.stamps.balance).toBe(70);
    expect(hoursToday(state, NOON)).toBe(2);
    expect(hourPrice(state, NOON)).toBe(30);
    expect(hourPrice(state, NEXT_DAY)).toBe(10);
    buy(state, { kind: 'hour', of: 'reading' }, Math.random, NEXT_DAY);
    expect(hoursToday(state, NEXT_DAY)).toBe(1);
  });

  it('une heure de Connaissance au rythme du moment ; pages qui ne tournent pas seules : rien à vendre', () => {
    const state = game(100);
    const knowledge = state.knowledge;
    buy(state, { kind: 'hour', of: 'knowledge' }, Math.random, NOON);
    expect(state.knowledge).toBeGreaterThan(knowledge);
    state.settings.autoTurn = false;
    expect(canBuy(state, { kind: 'hour', of: 'knowledge' }, NOON)).toBe(false);
  });
});
