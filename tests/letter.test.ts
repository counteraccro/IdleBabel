import { afterEach, describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { BABEL_WORD, LETTER_WAIT } from '../src/data/letter';
import { activeBoons, boonOn, forgetBoons, startBoon } from '../src/systems/boons';
import {
  advanceLetter,
  boonKnown,
  boonSeconds,
  catchLetter,
  catchWordLetter,
  drawBoon,
  forceBoon,
  letterStays,
  letterWait,
} from '../src/systems/letter';
import { pagesPerSecond, toolRate } from '../src/systems/production';
import { nextToolCost } from '../src/systems/tools';
import { findChance } from '../src/systems/knowledge';
import { readPage } from '../src/systems/click';
import { prestige } from '../src/systems/prestige';
import { intuitionVisible } from '../src/systems/technologies';
import { OPEN_STARS } from '../src/data/etheriumStars';

/** Une partie aux étoiles `stars` allumées, une Lecture Diagonale en main. */
const game = (...stars: string[]): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = stars;
  state.tools.diagonal = 1;
  return state;
};

const QUILL = OPEN_STARS.filter((star) => star.page === 'quill').map((star) => star.id);

afterEach(() => {
  forgetBoons();
  forceBoon(undefined);
});

describe('La lettre qui s’échappe', () => {
  it('sans Etherium : toutes les 10 à 20 minutes, 8 secondes à l’écran, la Transe seule', () => {
    const state = game();
    expect(letterWait(state)).toEqual(LETTER_WAIT);
    expect(letterStays(state)).toBe(8);
    expect(boonKnown(state, 'trance')).toBe(true);
    expect(boonKnown(state, 'eye')).toBe(false);
    expect(drawBoon(state, () => 0.99)).toBe('trance');
    expect(boonSeconds(state, 'trance')).toBe(30);
  });

  it('la Plume allumée : 5 à 10 minutes (×0,48), 12 secondes, durées ×3, sept bonus', () => {
    const state = game(...QUILL);
    expect(letterWait(state).min).toBeCloseTo(600 * 0.48);
    expect(letterWait(state).max).toBeCloseTo(1200 * 0.48);
    expect(letterStays(state)).toBe(12);
    expect(boonSeconds(state, 'trance')).toBe(90);
    expect(boonSeconds(state, 'flash')).toBeUndefined();
    expect(['eye', 'hand', 'mind', 'deal', 'flash', 'find'].every((id) => boonKnown(state, id as never))).toBe(true);
  });

  it('ses intuitions : le Guet, le Souffle retenu, la Lettre comprise, au maximum', () => {
    const state = game();
    state.technologies = { watch: 5, heldBreath: 3, letterUnderstood: 5 };
    expect(letterWait(state).min).toBeCloseTo(450);
    expect(letterStays(state)).toBe(11);
    expect(boonSeconds(state, 'trance')).toBeCloseTo(45);
  });

  it('elle vient quand le compte à rebours est fini ; une sur vingt est le mot BABEL', () => {
    const state = game();
    expect(advanceLetter(state, 1, () => 0)).toBeUndefined();
    expect(advanceLetter(state, 600, () => 0.5)).toBe('letter');
    expect(advanceLetter(state, 1200, () => 0.01)).toBe('word');
  });

  it('la Transe double la lecture (×4 avec la pointe de la Plume)', () => {
    const state = game();
    const before = toolRate(state, 'diagonal');
    forceBoon('trance');
    catchLetter(state, 5, Math.random, Date.now());
    expect(state.letters).toBe(1);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before * 2);
    state.etherium.push('quill.p1', 'quill.p2');
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before * 4);
  });

  it('les autres bonus : trouvailles ×3, clics ×10, méthodes à moitié prix', () => {
    const state = game();
    const chance = findChance(state);
    const price = nextToolCost(state, 'diagonal');
    startBoon('eye', 10);
    startBoon('deal', 10);
    expect(findChance(state)).toBeCloseTo(chance * 3);
    expect(nextToolCost(state, 'diagonal')).toBeCloseTo(price / 2);
    readPage(state);
    const one = state.pages;
    startBoon('hand', 10);
    readPage(state);
    expect(state.pages - one).toBeCloseTo(one * 10);
  });

  it('l’Éclair donne trois minutes de lecture d’un coup', () => {
    const state = game('quill.r5');
    forceBoon('flash');
    const gift = catchLetter(state, 5);
    expect(gift.pages).toBeCloseTo(pagesPerSecond(state) * 180);
    expect(state.pages).toBeCloseTo(pagesPerSecond(state) * 180);
    expect(activeBoons()).toEqual([]);
  });

  it('un bonus repris repart à sa durée entière ; trois à la fois : un sceau', () => {
    const state = game();
    startBoon('trance', 30, 0);
    startBoon('trance', 30, 20_000);
    expect(activeBoons(40_000)[0].left).toBe(10_000);
    startBoon('eye', 30, 40_000);
    forceBoon('hand');
    catchLetter(state, 5, Math.random, 40_000);
    expect('threeLights' in state.seals).toBe(true);
  });

  it('attrapée dans sa dernière demi-seconde : un sceau secret', () => {
    const state = game();
    catchLetter(state, 1);
    expect('lastInstant' in state.seals).toBe(false);
    catchLetter(state, 0.4);
    expect('lastInstant' in state.seals).toBe(true);
  });

  it('le mot BABEL : 2, 5, 7, 10 et 15 % des pages, puis un sceau secret', () => {
    const state = game();
    state.pages = 1000;
    BABEL_WORD.forEach((_, index) => catchWordLetter(state, index));
    expect(state.pages).toBeCloseTo(1000 * 1.02 * 1.05 * 1.07 * 1.1 * 1.15);
    expect(state.letters).toBe(5);
    expect('babelWord' in state.seals).toBe(true);
  });

  it('ses intuitions se voient dès la première lettre ; le prestige éteint les bonus et garde les lettres', () => {
    const state = game();
    expect(intuitionVisible(state, 'watch')).toBe(false);
    catchLetter(state, 5);
    expect(intuitionVisible(state, 'watch')).toBe(true);
    expect(boonOn('trance')).toBe(true);
    state.totalPagesRead = 1e30;
    prestige(state);
    expect(boonOn('trance')).toBe(false);
    expect(state.letters).toBe(1);
  });
});
