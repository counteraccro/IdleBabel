import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { LOTTERY_STARS } from '../src/data/lottery';
import { lightStar, pageOpen, starOpen } from '../src/systems/etherium';
import { boonFactor, halfFactor, lotteryOdds, lotterySeconds, tokenChance } from '../src/systems/lotteryStars';
import { drawLottery, forceDraw } from '../src/systems/lottery';
import { lotteryReading } from '../src/systems/lotteryEffects';
import { goldenHere } from '../src/systems/goldenMimic';
import { effectText } from '../src/ui/library/lotteryText';
import { setLocale } from '../src/i18n';

vi.stubGlobal('window', new EventTarget());

/** Une partie qui a de l'Éther, des méthodes et des jetons. */
const rich = (stars: string[] = []) => {
  const state = createInitialState('fr');
  state.ether = 1000;
  state.tools.diagonal = 10;
  state.lottery.tokens = 10;
  state.etherium.push(...stars.map((id) => `lottery.${id}`));
  return state;
};

describe('La Loterie dans l’Etherium', () => {
  it('ouvre sa page au premier jeton joué, et ses étoiles avec', () => {
    const state = rich();
    expect(pageOpen(state, 'lottery')).toBe(false);
    expect(starOpen(state, 'lottery.j1')).toBe(false);
    expect(lightStar(state, 'lottery.j1')).toBe(false);
    drawLottery(state);
    expect(pageOpen(state, 'lottery')).toBe(true);
    expect(lightStar(state, 'lottery.j1')).toBe(true);
    // Chaque branche part de la fente offerte ; la deuxième étoile attend la première.
    expect(starOpen(state, 'lottery.g1') && starOpen(state, 'lottery.m1') && starOpen(state, 'lottery.d1')).toBe(true);
    expect(starOpen(state, 'lottery.g2')).toBe(false);
  });

  it('le levier : la Mimic lâche un jeton une fois sur 3, puis sur 2, puis 2 sur 3', () => {
    expect(tokenChance(rich())).toBeCloseTo(1 / 3);
    expect(tokenChance(rich(['j1']))).toBeCloseTo(1 / 2);
    expect(tokenChance(rich(['j1', 'j2']))).toBeCloseTo(2 / 3);
  });

  it('le temps allonge le gain, les bonus, les malus et la Mimic dorée', () => {
    const minutes = (stars: string[]) =>
      (['gain', 'boon', 'curse', 'golden'] as const).map((kind) => lotterySeconds(rich(stars), kind) / 60);
    expect(minutes([])).toEqual([30, 60, 10, 5]);
    expect(minutes(['g1'])).toEqual([45, 90, 15, 8]);
    expect(minutes(['g1', 'g2'])).toEqual([60, 120, 20, 10]);
    // La Mimic dorée tirée reste d'autant plus longtemps.
    const state = rich(['g1', 'g2']);
    state.lottery.draws = 1;
    const now = 1_000_000;
    forceDraw('golden');
    drawLottery(state, Math.random, now);
    expect(goldenHere(state, now + 9 * 60_000)).toBe(true);
    expect(goldenHere(state, now + 11 * 60_000)).toBe(false);
  });

  it('la valeur : les bonus ajoutent plus, mais la production tombe plus bas pendant le malus', () => {
    expect([boonFactor(rich(), 'all15'), boonFactor(rich(), 'method10'), halfFactor(rich())]).toEqual([1.5, 10, 0.5]);
    const once = rich(['m1']);
    expect([boonFactor(once, 'all15'), boonFactor(once, 'all2'), boonFactor(once, 'all3'), boonFactor(once, 'method10')]).toEqual([
      1.75, 2.5, 4, 14.5,
    ]);
    expect(halfFactor(once)).toBeCloseTo(1 / 3);
    const twice = rich(['m1', 'm2']);
    expect([boonFactor(twice, 'all15'), boonFactor(twice, 'all2'), boonFactor(twice, 'all3'), boonFactor(twice, 'method10')]).toEqual([
      2, 3, 5, 19,
    ]);
    expect(halfFactor(twice)).toBe(0.25);
    // Ce que lit la production pendant le bonus ×1,5, avec la valeur.
    const now = 1_000_000;
    forceDraw('all15');
    drawLottery(twice, Math.random, now);
    expect(lotteryReading(twice, now + 1000)).toBe(2);
  });

  it('la chance : « rien » baisse, les malus montent, le total reste 100', () => {
    const odds = (stars: string[]) => Object.fromEntries(lotteryOdds(rich(stars)).map((one) => [one.id, one.weight]));
    expect(odds([])).toEqual({ nothing: 40, gain: 28, boon: 18, curse: 12, jackpot: 2 });
    expect(odds(['d1'])).toEqual({ nothing: 30, gain: 30, boon: 20, curse: 18, jackpot: 2 });
    expect(odds(['d1', 'd2'])).toEqual({ nothing: 20, gain: 32, boon: 22, curse: 24, jackpot: 2 });
    for (const level of [0, 1, 2]) expect(Object.values(LOTTERY_STARS.luck).reduce((total, by) => total + by[level], 0)).toBe(100);
  });

  it('les textes disent le facteur du moment', () => {
    setLocale('fr');
    expect(effectText(rich(), 'all15')).toBe('Production ×1,5');
    expect(effectText(rich(['m1']), 'all15')).toBe('Production ×1,75');
    expect(effectText(rich(['m1', 'm2']), 'half')).toBe('Production ÷4');
  });
});
