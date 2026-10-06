import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { digitCount, hiveCells, hiveRings, hiveView } from '../src/ui/etherium/etheriumHive';

const reader = (pages: number, received = 0) => {
  const state = createInitialState('fr');
  state.totalPagesRead = pages;
  state.etherReceived = received;
  return state;
};

describe('Ruche de l’Etherium', () => {
  it('compte les chiffres, même au-delà de 10²¹', () => {
    expect(digitCount(1)).toBe(1);
    expect(digitCount(9)).toBe(1);
    expect(digitCount(10)).toBe(2);
    expect(digitCount(12_345)).toBe(5);
    expect(digitCount(9.87e59)).toBe(60);
  });

  it('gagne un anneau quand les alvéoles débordent : 7, 19, 37, 61', () => {
    expect(hiveRings(1)).toBe(1);
    expect(hiveRings(7)).toBe(1);
    expect(hiveRings(8)).toBe(2);
    expect(hiveRings(19)).toBe(2);
    expect(hiveRings(37)).toBe(3);
    expect(hiveRings(61)).toBe(4);
    for (const rings of [1, 2, 3, 4]) {
      const cells = hiveCells(rings);
      expect(cells).toHaveLength(1 + 3 * rings * (rings + 1));
      expect(new Set(cells.map((cell) => cell.join(','))).size).toBe(cells.length);
    }
  });

  it('avant 1 million de pages, un livre sans rien ; puis le centre se remplit vers le premier Éther', () => {
    expect(hiveView(reader(999_999)).named).toBe(false);
    const first = hiveView(reader(3.2e8));
    expect(first).toMatchObject({ named: true, gain: 0, lit: 0, percent: 32 });
    expect(first.level).toBeCloseTo(0.32);
  });

  it('une alvéole par chiffre de l’Éther à l’ouverture, la suivante vers la puissance de dix', () => {
    // 14 Md de pages : 2 Éthers mérités (8 Md), le 3ᵉ à 27 Md.
    const two = hiveView(reader(1.4e10));
    expect(two).toMatchObject({ gain: 2, lit: 1, percent: 31 });
    expect(two.level).toBeCloseTo(Math.log10(2));
    // Après un prestige, seul ce que l'ouverture rapporterait compte.
    expect(hiveView(reader(3e10, 2))).toMatchObject({ gain: 1, lit: 1, level: 0 });
    const huge = hiveView(reader(1e9 * 1234 ** 3));
    expect(huge).toMatchObject({ gain: 1234, lit: 4 });
    expect(huge.level).toBeCloseTo(Math.log10(1.234));
  });
});
