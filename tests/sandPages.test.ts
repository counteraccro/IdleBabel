import { describe, expect, it } from 'vitest';
import { LAST_FOLIO, drawLots } from '../src/ui/rareBooks/sand/sandPages';
import { rng } from '../src/ui/rareBooks/sand/sandDraw';

describe('Livre de sable : les numéros de page', () => {
  const lots = Array.from({ length: 20000 }, (_, i) => drawLots(rng(1 + ((i * 104729) % 2147483645))));

  it('tire la page 410 une fois sur dix environ', () => {
    const rate = lots.filter((page) => page.folio === LAST_FOLIO).length / lots.length;
    expect(rate).toBeGreaterThan(0.08);
    expect(rate).toBeLessThan(0.12);
  });

  it('ne tombe jamais sur 410 par hasard, et ses numéros vont de 1 à 12 chiffres', () => {
    const others = lots.map((page) => page.folio.replace(/ /g, '')).filter((folio) => folio !== LAST_FOLIO);
    for (const folio of others) expect(folio).toMatch(/^[1-9]\d{0,11}$/);
    expect(new Set(others.map((folio) => folio.length)).size).toBe(12);
  });

  it('met une gravure sur une page de temps en temps', () => {
    const plates = lots.filter((page) => page.plate).length;
    expect(plates).toBeGreaterThan(0);
    expect(plates / lots.length).toBeLessThan(0.03);
  });
});
