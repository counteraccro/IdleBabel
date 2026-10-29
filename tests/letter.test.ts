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
  flockGoesOn,
  forceBoon,
  letterStays,
  letterWait,
} from '../src/systems/letter';
import { pagesPerSecond, toolRate } from '../src/systems/production';
import { nextToolCost } from '../src/systems/tools';
import { MAX_FINDS_PER_PAGE, findChance, findKnowledge, findWhileAway, pagesTurnedAway, rollFinds } from '../src/systems/knowledge';
import { nextPrice } from '../src/systems/technologies';
import { STORY } from '../src/ui/rareBooks/idleBabel/idleBabelStory';
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

  it('la Transe : lecture ×5 (×8 avec la pointe de la Plume)', () => {
    const state = game();
    const before = toolRate(state, 'diagonal');
    forceBoon('trance');
    catchLetter(state, 5, Math.random, Date.now());
    expect(state.letters).toBe(1);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before * 5);
    state.etherium.push('quill.p1', 'quill.p2');
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before * 8);
  });

  it('les autres bonus : trouvailles ×5, Connaissance ×5, clics ×410, méthodes à moitié prix', () => {
    const state = game();
    const chance = findChance(state);
    const price = nextToolCost(state, 'diagonal');
    const knowledge = findKnowledge(state);
    startBoon('eye', 10);
    startBoon('deal', 10);
    startBoon('mind', 10);
    // La chance est petite (0,002) : comparée au rapport, pas à deux décimales.
    expect(findChance(state) / chance).toBeCloseTo(5);
    expect(findKnowledge(state)).toBe(Math.ceil(knowledge * 5));
    expect(nextToolCost(state, 'diagonal')).toBeCloseTo(price / 2);
    readPage(state);
    const one = state.pages;
    startBoon('hand', 10);
    readPage(state);
    expect(state.pages - one).toBeCloseTo(one * 410);
  });

  it('l’Éclair donne dix minutes de lecture d’un coup', () => {
    const state = game('quill.r5');
    forceBoon('flash');
    const gift = catchLetter(state, 5);
    expect(gift.pages).toBeCloseTo(pagesPerSecond(state) * 600);
    expect(state.pages).toBeCloseTo(pagesPerSecond(state) * 600);
    expect(activeBoons()).toEqual([]);
  });

  it('la Trouvaille donne cinq minutes de trouvailles d’un coup, au moins une', () => {
    const state = game('quill.r6');
    const expected = Math.floor(pagesTurnedAway(state, 300) * findChance(state) + 0.5);
    forceBoon('find');
    const gift = catchLetter(state, 5, () => 0.5);
    expect(gift.finds).toBe(Math.max(1, expected));
    expect(activeBoons()).toEqual([]);
    // Beaucoup de pages tournées seules : bien plus d'une.
    state.tools.diagonal = 10_000;
    forceBoon('find');
    expect(catchLetter(state, 5, () => 0.5).finds).toBe(Math.floor(pagesTurnedAway(state, 300) * findChance(state) + 0.5));
    expect(pagesTurnedAway(state, 300) * findChance(state)).toBeGreaterThan(1);
  });

  it('une lettre sur cinquante lâche un jeton de la Loterie', () => {
    const state = game();
    const before = state.lottery.tokens;
    forceBoon('trance');
    expect(catchLetter(state, 5, () => 0.5).token).toBeUndefined();
    expect(state.lottery.tokens).toBe(before);
    forceBoon('trance');
    expect(catchLetter(state, 5, () => 0.01).token).toBe(true);
    expect(state.lottery.tokens).toBe(before + 1);
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

  it('la Volée : la 1re attrapée en appelle une 2e à 10 % par niveau, la 2e une 3e au tiers, jamais une 4e', () => {
    const state = game();
    expect(flockGoesOn(state, { caught: 1 }, () => 0)).toBe(false);
    state.technologies = { flock: 3 };
    expect(flockGoesOn(state, { caught: 1 }, () => 0.29)).toBe(true);
    expect(flockGoesOn(state, { caught: 1 }, () => 0.31)).toBe(false);
    expect(flockGoesOn(state, { caught: 2 }, () => 0.09)).toBe(true);
    expect(flockGoesOn(state, { caught: 2 }, () => 0.11)).toBe(false);
    expect(flockGoesOn(state, { caught: 3 }, () => 0)).toBe(false);
    state.technologies = { flock: 5 };
    expect(nextPrice(state, 'flock')).toBeUndefined();
  });

  it('une volée : les bonus se cumulent, le même deux fois s’ajoute ; deux puis trois lettres, un sceau chacun', () => {
    const state = game('quill.r1');
    const flock = { caught: 0 };
    forceBoon('trance');
    catchLetter(state, 5, Math.random, 0, flock);
    expect('twoLetters' in state.seals).toBe(false);
    forceBoon('eye');
    catchLetter(state, 5, Math.random, 0, flock);
    expect('twoLetters' in state.seals).toBe(true);
    expect(activeBoons(0).map((boon) => boon.id)).toEqual(['trance', 'eye']);
    forceBoon('trance');
    catchLetter(state, 5, Math.random, 10_000, flock);
    expect(activeBoons(10_000).find((boon) => boon.id === 'trance')!.left).toBe(50_000);
    expect('threeLetters' in state.seals).toBe(true);
  });

  it('Quatre cent dix : appris avec la Volée, 30 secondes fixes, pages et trouvailles ×410', () => {
    const state = game(...QUILL);
    expect(boonKnown(state, 'fourTen')).toBe(false);
    state.technologies = { flock: 1, letterUnderstood: 5 };
    expect(boonKnown(state, 'fourTen')).toBe(true);
    expect(boonSeconds(state, 'fourTen')).toBe(30);
    const rate = toolRate(state, 'diagonal');
    const chance = findChance(state);
    startBoon('fourTen', 30);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(rate * 410);
    expect(findChance(state)).toBeCloseTo(chance * 410);
  });

  it('Quatre cent dix : un clic lit 410 fois plus, pas 410 × 410 la part de la lecture qu’il ajoute (revue, 12/10)', () => {
    const state = game();
    state.tools.diagonal = 50;
    state.technologies = { muscleMemory: 3 };
    readPage(state);
    const before = state.pagesByHand;
    startBoon('fourTen', 30);
    readPage(state);
    expect(state.pagesByHand - before).toBeCloseTo(before * 410);
  });

  it('jamais plus de 100 trouvailles par page, ni pendant l’absence (choix de l’auteur, 12/10)', () => {
    const state = game();
    state.technologies = { semanticFilter: 30 };
    startBoon('fourTen', 30);
    expect(findChance(state)).toBeGreaterThan(1000);
    expect(rollFinds(state)).toHaveLength(MAX_FINDS_PER_PAGE);
    // Une minute d'absence : pas plus de 100 trouvailles par page tournée (et une de plus, l'arrondi au hasard).
    const turned = pagesTurnedAway(state, 60);
    expect(findWhileAway(state, 60)).toBeLessThanOrEqual(Math.ceil(turned * MAX_FINDS_PER_PAGE) + 1);
  });

  it('le livre « Idle Babel » raconte la lettre rendue forte, juste avant sa dernière partie', () => {
    const sections = STORY.flatMap((chapter) => chapter.sections ?? []).map((section) => section.key);
    expect(sections.slice(-2)).toEqual(['letterAgain', 'thisBook']);
  });
});
