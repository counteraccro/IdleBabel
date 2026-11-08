import { describe, expect, it } from 'vitest';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import { VERSION } from '../src/data/version';

/** Les notes de version, dans le livre des crédits (08/11 : celles de l'Alpha 3.5 étaient tombées dans le livre d'Oriana). */
describe('les notes de version', () => {
  it('les premières notes des crédits sont celles de la version du jeu, dans les deux langues', () => {
    for (const book of [fr, en]) expect(book.credits.pages.notes[0].title).toBe(VERSION);
  });

  it('les notes d’Oriana ne sont que des phrases', () => {
    for (const book of [fr, en]) for (const note of book.oriana.notes) expect(typeof note).toBe('string');
  });
});
