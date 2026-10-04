import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { RARE_CHANCE, RARITY_GROWTH, nextRareChance, rareBookAt, takeBook } from '../src/systems/rareBooks';
import { STRANGE_BOOK_INDEX } from '../src/systems/strangeBook';
import { partHasNews } from '../src/systems/decipher';

const BOOKS = 200_000;

describe('livres rares', () => {
  it('tombent à peu près une fois sur 200, jamais avant le livre étrange', () => {
    const state = createInitialState('fr');
    let rare = 0;
    for (let index = 0; index < BOOKS; index++) if (rareBookAt(state, index)) rare++;
    expect(rare / BOOKS).toBeGreaterThan(RARE_CHANCE * 0.8);
    expect(rare / BOOKS).toBeLessThan(RARE_CHANCE * 1.2);
    for (let index = 0; index <= STRANGE_BOOK_INDEX; index++) expect(rareBookAt(state, index)).toBeUndefined();
  });

  it('sont uniques : chacun trouvé une seule fois, puis plus aucun', () => {
    const state = createInitialState('fr');
    const found: string[] = [];
    for (let index = 0; index < BOOKS * 5 && found.length < RARE_BOOKS.length; index++) {
      const before = Object.keys(state.rareBooks).length;
      const id = takeBook(state, index);
      if (id && Object.keys(state.rareBooks).length > before) found.push(id);
    }
    expect(new Set(found).size).toBe(found.length);
    expect(found.length).toBe(RARE_BOOKS.length);
    for (let index = BOOKS * 5; index < BOOKS * 5 + 10_000; index++) expect(rareBookAt(state, index)).toBeUndefined();
  });

  it('un livre où un rare a été trouvé le garde', () => {
    const state = createInitialState('fr');
    let index = STRANGE_BOOK_INDEX + 1;
    while (!rareBookAt(state, index)) index++;
    const id = takeBook(state, index);
    expect(state.rareBooks[id!]).toBe(index);
    expect(rareBookAt(state, index)).toBe(id);
  });
});

describe('livres rares de plus en plus rares', () => {
  it('chaque livre rare trouvé rend le suivant 1,25 fois plus rare', () => {
    expect(nextRareChance(0)).toBeCloseTo(RARE_CHANCE);
    expect(nextRareChance(1)).toBeCloseTo(RARE_CHANCE / RARITY_GROWTH);
    expect(1 / nextRareChance(RARE_BOOKS.length - 1)).toBeGreaterThan(25_000);
    const state = createInitialState('fr');
    for (const book of RARE_BOOKS.slice(0, 10)) state.rareBooks[book.id] = 0;
    let rare = 0;
    for (let index = 3; index < BOOKS * 5; index++) if (rareBookAt(state, index)) rare++;
    const expected = nextRareChance(10) * BOOKS * 5;
    expect(rare).toBeGreaterThan(expected * 0.8);
    expect(rare).toBeLessThan(expected * 1.2);
  });
});

describe('chapitre « Raretés » du Grand Livre', () => {
  it('pas de nouveauté tant qu’aucun livre rare n’est trouvé, puis une étoile', () => {
    const state = createInitialState('fr');
    state.lifetimeKnowledge = 1_000;
    expect(partHasNews(state, 'rareBooks')).toBe(false);
    state.rareBooks[RARE_BOOKS[0].id] = 10;
    expect(partHasNews(state, 'rareBooks')).toBe(true);
  });
});
