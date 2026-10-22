import { describe, expect, it } from 'vitest';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { SEALS } from '../src/data/seals';
import { drawRareBook } from '../src/systems/rareBooks';

describe('Gare aux pages', () => {
  it('huit planches, avec autant de récitatifs et de mots d’écran en français qu’en anglais', () => {
    expect(fr.comicNotice.plates).toHaveLength(8);
    expect(en.comicNotice.plates).toHaveLength(8);
    fr.comicNotice.plates.forEach((plate, i) => {
      expect(en.comicNotice.plates[i].captions).toHaveLength(plate.captions.length);
      expect(en.comicNotice.plates[i].words).toHaveLength(plate.words.length);
    });
  });

  it('a son sceau, et sort presque toujours parmi les trois premiers livres rares', () => {
    expect(SEALS.some((seal) => seal.id === 'rare-comicNotice')).toBe(true);
    let early = 0;
    const tries = 2000;
    for (let t = 0; t < tries; t++) {
      const found = new Set<string>();
      for (let n = 0; n < 3; n++) {
        // Une chance énorme : un livre rare à coup sûr, tiré parmi ceux qui restent (un autre numéro de livre à chaque fois).
        const id = drawRareBook(1000 + t * 3 + n, (book) => found.has(book), 100);
        if (id) found.add(id);
      }
      if (found.has('comicNotice')) early++;
    }
    expect(RARE_BOOKS.find((book) => book.id === 'comicNotice')?.weight).toBeGreaterThan(1);
    expect(early / tries).toBeGreaterThan(0.75);
  });
});
