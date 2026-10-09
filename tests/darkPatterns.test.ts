import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { CHAPTERS, TERMS_FIRST, TRAPS, examplePage, foilTrap, isTrapFoiled, trapAt } from '../src/systems/darkPatterns';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';

describe('les dark patterns par l’exemple', () => {
  it('a un piège sur l’exemple de chacun des cinq premiers chapitres, à droite, et nulle part ailleurs', () => {
    const traps = [];
    for (let page = 1; page <= PAGES_PER_BOOK; page++) {
      const trap = trapAt(page);
      if (trap === undefined) continue;
      expect(page).toBe(examplePage(trap));
      expect(page % 2).toBe(1);
      traps.push(trap);
    }
    expect(traps).toEqual([0, 1, 2, 3, 4]);
    expect(TERMS_FIRST).toBeLessThan(PAGES_PER_BOOK);
  });

  it('donne le sceau secret au cinquième piège déjoué, pas avant, même en plusieurs fois', () => {
    const state = createInitialState('fr', 0, 12345);
    for (const trap of [3, 0, 3, 1, 4]) foilTrap(state, trap);
    expect(state.darkPatternsFoiled).toHaveLength(4);
    expect('escaped' in state.seals).toBe(false);
    foilTrap(state, 2);
    expect(isTrapFoiled(state, 2)).toBe(true);
    expect(state.darkPatternsFoiled).toHaveLength(TRAPS);
    expect('escaped' in state.seals).toBe(true);
  });

  it('a ses textes de même forme dans les deux langues', () => {
    const [a, b] = [fr.darkPatterns, en.darkPatterns];
    expect(a.pages.chapters).toHaveLength(CHAPTERS);
    expect(b.pages.chapters).toHaveLength(CHAPTERS);
    expect(b.pages.examples.urls).toHaveLength(CHAPTERS);
    expect(a.pages.examples.urls).toHaveLength(CHAPTERS);
    expect(b.pages.prefaceText).toHaveLength(a.pages.prefaceText.length);
    expect(b.traps.cookies.partners).toHaveLength(a.traps.cookies.partners.length);
    expect(b.traps.unsubscribe.reasons).toHaveLength(a.traps.unsubscribe.reasons.length);
    expect(b.traps.premium.plans.map((plan) => plan.perks.length)).toEqual(a.traps.premium.plans.map((plan) => plan.perks.length));
  });
});
