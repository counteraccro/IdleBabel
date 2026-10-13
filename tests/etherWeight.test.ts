import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { etherCounted, etherReading, lightStar, pageOpen, readingGain, starOpen } from '../src/systems/etherium';
import { starById } from '../src/data/etheriumStars';

const received = (ether: number) => {
  const state = createInitialState('fr', 0, 1);
  state.etherReceived = ether;
  state.ether = ether;
  return state;
};

describe('Le poids de la Bibliothèque', () => {
  it('tout l’Éther compte jusqu’à 5 000, puis 5 000 × (reçu / 5 000)^0,3', () => {
    expect(etherCounted(5000, 0)).toBe(5000);
    expect(etherCounted(40_000, 0)).toBeCloseTo(5000 * 8 ** 0.3);
    expect(etherReading(received(3000))).toBeCloseTo(31);
    expect(etherReading(received(40_000))).toBeCloseTo(1 + 50 * 8 ** 0.3);
  });

  it('chaque étoile de l’Atlas élève l’exposant de 0,1 ; la dernière lève le poids', () => {
    const state = received(5e6);
    const before = etherReading(state);
    expect(lightStar(state, 'weight.w1')).toBe(true);
    expect(etherReading(state)).toBeCloseTo(1 + 50 * 1000 ** 0.4);
    expect(etherReading(state)).toBeGreaterThan(before);
    state.etherium.push('weight.w2', 'weight.w3', 'weight.w4', 'weight.w5', 'weight.w6', 'weight.w7');
    expect(etherReading(state)).toBeCloseTo(1 + 5e6 * 0.01);
    expect([1, 2, 3, 4, 5, 6, 7].map((i) => starById(`weight.w${i}`)?.cost)).toEqual([
      10_000, 25_000, 60_000, 150_000, 400_000, 1_000_000, 2_500_000,
    ]);
  });

  it('la page du Poids reste blanche, ses étoiles fermées, avant 5 000 Éther reçus', () => {
    const state = received(4999);
    expect(pageOpen(state, 'weight')).toBe(false);
    state.ether = 1e6;
    expect(starOpen(state, 'weight.w1')).toBe(false);
    state.etherReceived = 5000;
    expect(pageOpen(state, 'weight')).toBe(true);
    expect(starOpen(state, 'weight.w1')).toBe(true);
  });

  it('le prestige annonce la lecture en plus sous le poids, pas un pour cent par Éther', () => {
    expect(readingGain(received(1000), 2000)).toBeCloseTo(2000);
    const state = received(100_000);
    expect(readingGain(state, 27_000)).toBeCloseTo((etherCounted(127_000, 0) - etherCounted(100_000, 0)) * 1);
    expect(readingGain(state, 27_000)).toBeLessThan(27_000 / 10);
  });
});
