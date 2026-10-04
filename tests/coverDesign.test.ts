import { describe, expect, it } from 'vitest';
import { isStrangeBook } from '../src/systems/strangeBook';
import { FRAME_COUNT, MODERN_LAYOUT_COUNT, ORNAMENT_COUNT, coverDesign, toRoman } from '../src/systems/coverDesign';
import { DETAIL_ORNAMENTS } from '../src/systems/coverDetails';

describe('couvertures', () => {
  it('donne toujours la même couverture au même livre', () => {
    expect(coverDesign(42)).toEqual(coverDesign(42));
    expect(coverDesign(42)).not.toEqual(coverDesign(43));
  });

  it('écrit les titres avec les lettres de Babel', () => {
    for (let i = 0; i < 200; i++) {
      if (isStrangeBook(i)) continue;
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
    // Un sur douze, plus les autobiographies et les bandes dessinées (un sur trente chacune).
    expect(modern).toBeGreaterThan(110);
    expect(modern).toBeLessThan(260);
  });

  it('donne aux livres modernes un auteur, un résumé et un code-barres', () => {
    for (let i = 0; i < 100; i++) {
      if (isStrangeBook(i)) continue;
      const { author, layout, blurb, barcode } = coverDesign(i);
      expect(author.length).toBeGreaterThanOrEqual(1);
      expect(layout).toBeLessThan(MODERN_LAYOUT_COUNT);
      expect(blurb).toMatch(/^[abcdefghijlmnopqrstuvxz ]+$/);
      expect(barcode).toMatch(/^\d{13}$/);
    }
  });

  it('écrit la cote en chiffres romains', () => {
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(17)).toBe('XVII');
    expect(toRoman(29)).toBe('XXIX');
    expect(toRoman(32)).toBe('XXXII');
  });

  it('donne aux livres ordinaires des détails de reliure, toujours les mêmes', () => {
    expect(coverDesign(42).details).toEqual(coverDesign(42).details);
    for (let i = 0; i < 500; i++) {
      const { details, strange } = coverDesign(i);
      if (strange) {
        expect(details).toBeUndefined();
        continue;
      }
      expect(details).toBeDefined();
      expect(details!.ornament).toBeLessThan(DETAIL_ORNAMENTS);
      expect([4, 5]).toContain(details!.nerfs);
      expect(details!.album).toBeGreaterThanOrEqual(1);
      expect(details!.album).toBeLessThanOrEqual(12);
    }
  });

  it('montre parfois une autobiographie ou une bande dessinée, toujours moderne, jamais le premier livre', () => {
    const designs = Array.from({ length: 3000 }, (_, i) => coverDesign(i));
    const kinds = designs.filter((design) => design.details && design.details.kind !== 'none');
    expect(kinds.length).toBeGreaterThan(120);
    expect(kinds.length).toBeLessThan(300);
    for (const design of kinds) expect(design.modern).toBe(true);
    expect(designs[0].details!.kind).toBe('none');
    expect(kinds.some((design) => design.details!.kind === 'comic')).toBe(true);
    expect(kinds.some((design) => design.details!.kind === 'autobiography')).toBe(true);
  });
});
