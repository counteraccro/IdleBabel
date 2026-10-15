import { describe, expect, it } from 'vitest';
import { PLATES } from '../src/data/seals';
import { LINE_BOTTOM, LINE_TOP, plateLines } from '../src/ui/strangeBook/plateLines';

/** Le haut du folio (pageItems.ts) : la liste des planches ne descend jamais jusque-là (remarque de l'auteur, 12/10). */
const FOLIO_TOP = 730;

describe('la page des sceaux du Grand Livre', () => {
  it('garde la liste de toutes les planches au-dessus du folio, même avec des planches de plus', () => {
    // Jusqu'à 14 lignes, comme avant la planche des mods (15/10) : elle a pris l'une des trois places de marge.
    for (const count of [PLATES.length, PLATES.length + 1, PLATES.length + 2]) {
      const { step, size } = plateLines(count);
      const last = LINE_TOP + (count - 1) * step;
      expect(last).toBeLessThanOrEqual(LINE_BOTTOM + 1e-9);
      expect(last + size).toBeLessThan(FOLIO_TOP);
      // Assez grand pour se lire, et une ligne ne touche pas la suivante.
      expect(size).toBeGreaterThanOrEqual(16);
      expect(size).toBeLessThan(step);
    }
  });
});
