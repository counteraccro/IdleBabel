import { describe, expect, it } from 'vitest';
import { PLATES } from '../src/data/seals';
import { LINE_BOTTOM, LINE_STEP, LINE_TOP, MORE_TOP, plateListPages } from '../src/ui/strangeBook/plateLines';

/** Le haut du folio (pageItems.ts) : la liste des planches ne descend jamais jusque-là (remarque de l'auteur, 12/10). */
const FOLIO_TOP = 730;

describe('la page des sceaux du Grand Livre', () => {
  it('garde chaque page de la liste des planches au-dessus du folio, sans la tasser : une page de suite au besoin', () => {
    for (let count = 1; count <= PLATES.length + 20; count++) {
      const pages = plateListPages(count);
      expect(pages.reduce((total, lines) => total + lines, 0)).toBe(count);
      pages.forEach((lines, part) => {
        const last = (part === 0 ? LINE_TOP : MORE_TOP) + (lines - 1) * LINE_STEP;
        expect(last).toBeLessThanOrEqual(LINE_BOTTOM);
        expect(last + 22).toBeLessThan(FOLIO_TOP);
      });
    }
  });

  it('huit planches sur l’introduction, la suite sur la page d’en face', () => {
    expect(plateListPages(8)).toEqual([8]);
    expect(plateListPages(PLATES.length)).toEqual([8, PLATES.length - 8]);
  });
});
