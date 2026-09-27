import { describe, expect, it } from 'vitest';
import { FRAME_COUNT, ORNAMENT_COUNT, coverDesign, toRoman } from '../src/systems/coverDesign';

describe('couvertures', () => {
  it('donne toujours la même couverture au même livre', () => {
    expect(coverDesign(42)).toEqual(coverDesign(42));
    expect(coverDesign(42)).not.toEqual(coverDesign(43));
  });

  it("écrit les titres avec les lettres de Babel", () => {
    for (let i = 0; i < 200; i++) {
      const { title } = coverDesign(i);
      expect(title.length).toBeGreaterThanOrEqual(1);
      expect(title.length).toBeLessThanOrEqual(3);
      for (const word of title) expect(word).toMatch(/^[abcdefghijlmnopqrstuvxz]{3,8}$/);
    }
  });

  it('reste dans les limites de la Bibliothèque (4 murs, 5 étagères, 32 volumes)', () => {
    for (let i = 0; i < 500; i++) {
      const { shelfMark, frame, ornament, wear } = coverDesign(i);
      expect(shelfMark.wall).toBeGreaterThanOrEqual(1);
      expect(shelfMark.wall).toBeLessThanOrEqual(4);
      expect(shelfMark.shelf).toBeGreaterThanOrEqual(1);
      expect(shelfMark.shelf).toBeLessThanOrEqual(5);
      expect(shelfMark.volume).toBeGreaterThanOrEqual(1);
      expect(shelfMark.volume).toBeLessThanOrEqual(32);
      expect(frame).toBeLessThan(FRAME_COUNT);
      expect(ornament).toBeLessThan(ORNAMENT_COUNT);
      expect(wear).toBeGreaterThanOrEqual(0);
      expect(wear).toBeLessThanOrEqual(1);
    }
  });

  it('montre de temps en temps un livre moderne, mais rarement', () => {
    const modern = Array.from({ length: 1200 }, (_, i) => coverDesign(i).modern).filter(Boolean).length;
    expect(modern).toBeGreaterThan(40);
    expect(modern).toBeLessThan(180);
  });

  it('écrit la cote en chiffres romains', () => {
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(17)).toBe('XVII');
    expect(toRoman(29)).toBe('XXIX');
    expect(toRoman(32)).toBe('XXXII');
  });
});
