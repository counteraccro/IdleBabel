import { describe, expect, it } from 'vitest';
import { Y_PAGE, xParagraphs } from '../src/ui/rareBooks/bigX/bigXPages';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';

describe('Le grand livre du X', () => {
  it("n'écrit la langue X qu'avec des x (aucun y par hasard)", () => {
    for (let seed = 1; seed <= 500; seed++) for (const paragraph of xParagraphs(seed, 6)) expect(paragraph).toMatch(/^[xX ,.:?]+$/);
  });

  it('donne toujours les mêmes pages', () => {
    expect(xParagraphs(Y_PAGE, 6)).toEqual(xParagraphs(Y_PAGE, 6));
  });

  it('met la page du y en pleine langue X, pas sur une ouverture de chapitre ni la page qui la suit', () => {
    const openings = Array.from({ length: 12 }, (_, i) => 5 + i * 34);
    expect(openings.some((page) => Y_PAGE === page || Y_PAGE === page + 1)).toBe(false);
  });

  it('finit la dernière page sur la fin du chapitre XII', () => {
    for (const { bigX } of [fr, en]) expect(bigX.chapters[11].text.endsWith(bigX.ending)).toBe(true);
  });
});
