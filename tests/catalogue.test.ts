import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { REGISTER_PAGE, catalogueRares, firstOn, raresOn, rowsOn, spotCatalogue } from '../src/systems/catalogue';
import { rareBookAt, takeBook } from '../src/systems/rareBooks';

/** Une partie qui a trouvé le Catalogue au livre `found`, en prenant tous les livres d'avant. */
const foundAt = (found: number) => {
  const state = createInitialState('fr', 0, 12345);
  for (let index = 0; index < found; index++) takeBook(state, index);
  state.rareBooks.catalogue = found;
  return state;
};

describe('le Catalogue des catalogues', () => {
  it('recense les livres à la suite, sans en sauter ni en répéter', () => {
    const found = 1482;
    expect(firstOn(found, REGISTER_PAGE)).toBe(found);
    for (let page = REGISTER_PAGE; page < PAGES_PER_BOOK; page++)
      expect(firstOn(found, page) + rowsOn(page)).toBe(firstOn(found, page + 1));
  });

  it('ne ment pas : les livres rares qu’il annonce sont ceux que le jeu donnera', () => {
    const state = foundAt(3000);
    const predicted = catalogueRares(state);
    expect(predicted.size).toBeGreaterThan(2);
    const last = firstOn(3000, PAGES_PER_BOOK) + rowsOn(PAGES_PER_BOOK);
    const taken = new Map<number, string>();
    for (let index = 3001; index < last; index++) {
      const id = rareBookAt(state, index);
      if (id && !(id in state.rareBooks)) taken.set(index, id);
      takeBook(state, index);
    }
    expect([...taken]).toEqual([...predicted]);
    // Relu plus tard, après avoir trouvé ces livres : la même liste.
    expect([...catalogueRares(state)]).toEqual([...predicted]);
  });

  it('un livre rare lu à sa place, puis pris en main : le sceau secret', () => {
    const state = foundAt(3000);
    const [index, id] = [...catalogueRares(state)][0];
    let page = REGISTER_PAGE;
    while (!raresOn(state, page).includes(id)) page++;
    spotCatalogue(state, page);
    expect(state.catalogueSpotted).toContain(id);
    for (let i = 3001; i < index; i++) takeBook(state, i);
    expect('trueCatalogue' in state.seals).toBe(false);
    takeBook(state, index);
    expect('trueCatalogue' in state.seals).toBe(true);
  });

  it('sans l’avoir lu, pas de sceau', () => {
    const state = foundAt(3000);
    const [index] = [...catalogueRares(state)][0];
    for (let i = 3001; i <= index; i++) takeBook(state, i);
    expect('trueCatalogue' in state.seals).toBe(false);
  });
});
