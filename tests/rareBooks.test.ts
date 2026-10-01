import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { RARE_CHANCE, rareBookAt, takeBook } from '../src/systems/rareBooks';
import { STRANGE_BOOK_INDEX } from '../src/systems/strangeBook';

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
