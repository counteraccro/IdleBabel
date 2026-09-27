import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { coverDesign } from '../src/systems/coverDesign';
import { PAGES_PER_BOOK, turnBookPage } from '../src/systems/books';
import { STRANGE_BOOK_INDEX, randomDigitText, strangeBookFound } from '../src/systems/strangeBook';
import { countFragment, meaningfulCovers, trackPlay } from '../src/systems/stats';

describe('livre étrange', () => {
  it("a un titre en symboles de Babel sans sens caché, et sa page de titre n'a que des chiffres", () => {
    const design = coverDesign(STRANGE_BOOK_INDEX);
    expect(design.title.length).toBeGreaterThanOrEqual(1);
    for (const word of design.title) expect(word).toMatch(/^[abcdefghijlmnopqrstuvxz]+$/);
    expect(design.modern).toBe(false);
    expect(design.sense.kind).toBe('none');
    expect(design.blurb).toMatch(/^[\d .]+$/);
  });

  it('ne remplit ses pages que de chiffres', () => {
    expect(randomDigitText(300)).toMatch(/^[\d .]+$/);
    expect(randomDigitText(300).length).toBeGreaterThanOrEqual(299); // espace final retiré
  });

  it('est trouvé en le prenant en main, et inscrit une seule fois dans l’historique', () => {
    const state = createInitialState('fr');
    for (let i = 0; i < PAGES_PER_BOOK * STRANGE_BOOK_INDEX - 1; i++) turnBookPage(state);
    expect(strangeBookFound(state)).toBe(false);
    turnBookPage(state);
    expect(strangeBookFound(state)).toBe(true);
    for (let i = 0; i < PAGES_PER_BOOK; i++) turnBookPage(state);
    expect(state.history.filter((e) => e.type === 'strangeBook')).toHaveLength(1);
  });
});

describe('statistiques', () => {
  it('compte le temps de jeu sans les mises en veille', () => {
    const state = createInitialState('fr');
    trackPlay(state, 0.1);
    trackPlay(state, 3600);
    expect(state.stats.playSeconds).toBeCloseTo(0.1);
  });

  it('garde le record de production', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 3;
    trackPlay(state, 0.1);
    state.tools.diagonal = 0;
    trackPlay(state, 0.1);
    expect(state.stats.bestPagesPerSecond).toBeCloseTo(0.3);
  });

  it('compte les phrases sensées sans les modifier', () => {
    const state = createInitialState('fr');
    expect(countFragment(state, undefined)).toBeUndefined();
    expect(countFragment(state, 'une phrase')).toBe('une phrase');
    expect(state.stats.fragments).toBe(1);
  });

  it('compte les couvertures porteuses de sens au fil des livres, et repart de zéro si le livre recule', () => {
    const state = createInitialState('fr');
    state.booksFinished = 200;
    const many = meaningfulCovers(state);
    const expected = Array.from({ length: 201 }, (_, i) => coverDesign(i).sense.kind !== 'none').filter(Boolean).length;
    expect(many).toBe(expected);
    state.booksFinished = 0;
    expect(meaningfulCovers(state)).toBe(coverDesign(0).sense.kind !== 'none' ? 1 : 0);
  });
});
