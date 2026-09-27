import { afterEach, describe, expect, it } from 'vitest';
import { coverDesign } from '../src/systems/coverDesign';
import { coverTitle, forceTitles } from '../src/systems/coverTitle';
import { LOCALES } from '../src/i18n/locales';

const { words, titles } = LOCALES.fr.covers;
const books = Array.from({ length: 600 }, (_, i) => coverDesign(i));

describe('titres sensés', () => {
  afterEach(() => forceTitles(undefined));

  it('glisse parfois un vrai mot, parfois un titre entier, le plus souvent du charabia', () => {
    const count = (kind: string) => books.filter((design) => design.sense.kind === kind).length;
    expect(count('word')).toBeGreaterThan(60);
    expect(count('title')).toBeGreaterThan(40);
    expect(count('none')).toBeGreaterThan(300);
  });

  it('remplace un seul mot du titre par un vrai mot', () => {
    for (const design of books.filter((book) => book.sense.kind === 'word')) {
      const shown = coverTitle(design);
      expect(shown).toHaveLength(design.title.length);
      expect(shown.filter((word, index) => word !== design.title[index])).toHaveLength(1);
      expect(words).toContain(shown[design.sense.slot]);
    }
  });

  it('prend un titre entier dans la liste', () => {
    for (const design of books.filter((book) => book.sense.kind === 'title')) {
      expect(titles).toContainEqual(coverTitle(design));
    }
  });

  it('obéit au mode débogage', () => {
    forceTitles('none');
    const design = books.find((book) => book.sense.kind === 'title')!;
    expect(coverTitle(design)).toEqual(design.title);
  });
});
