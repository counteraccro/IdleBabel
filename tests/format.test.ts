import { describe, expect, it } from 'vitest';
import { formatNumber } from '../src/core/format';

const fr = (value: number, notation: Parameters<typeof formatNumber>[2]): string => formatNumber(value, 'fr', notation).replace(/\s/g, ' ');

describe('formatNumber', () => {
  it('écrit les petits nombres en entier, quelle que soit la notation', () => {
    for (const notation of ['full', 'short', 'scientific', 'engineering'] as const) expect(fr(42.5, notation)).toBe('42,5');
  });

  it('écrit 25 millions de six façons', () => {
    expect(fr(25_000_000, 'full')).toBe('25 000 000');
    expect(fr(25_000_000, 'words')).toBe('25 millions');
    expect(fr(25_000_000, 'short')).toBe('25 M');
    expect(fr(25_000_000, 'scientific')).toBe('2,50e7');
    expect(fr(25_000_000, 'engineering')).toBe('25,0e6');
    expect(fr(25_000_000, 'babel')).toBe('vs.zzz.zzz');
  });

  it("passe à la puissance suivante quand l'arrondi déborde", () => {
    expect(fr(99_960_000, 'scientific')).toBe('1,00e8');
    expect(fr(999_600, 'engineering')).toBe('1,00e6');
  });

  it('garde une décimale en Babel sous 100', () => {
    expect(fr(2.5, 'babel')).toBe('v,s');
    expect(fr(1234, 'babel')).toBe('x.vut');
  });

  it('passe en scientifique au-delà des abréviations', () => {
    expect(fr(2e18, 'short')).toBe('2,00e18');
  });

  it('écrit les nombres en toutes lettres, au singulier ou au pluriel', () => {
    expect(fr(123_456, 'words')).toBe('123 456');
    expect(fr(1_500_000, 'words')).toBe('1,5 million');
    expect(fr(12_345_678_901, 'words')).toBe('12,35 milliards');
    expect(fr(999_999_999, 'words')).toBe('1 milliard');
    expect(formatNumber(2_500_000_000, 'en', 'words')).toBe('2.5 billion');
    expect(fr(1e40, 'words')).toBe('1,00e40');
  });
});
