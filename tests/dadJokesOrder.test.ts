import { describe, expect, it } from 'vitest';
import { FIRST_JOKE_PAGE, LAST_PAGE, jokeOrder, pagesOf } from '../src/ui/rareBooks/dadJokes/dadJokesOrder';

describe('Jokes de Papa : une blague par page', () => {
  const pages = jokeOrder(90, 88);

  it('remplit chaque page de blague, de la page 4 à la page 410', () => {
    for (let page = FIRST_JOKE_PAGE; page <= LAST_PAGE; page++) expect(pages.has(page)).toBe(true);
    expect(pages.size).toBe(LAST_PAGE - FIRST_JOKE_PAGE + 1);
  });

  it('donne d’abord toutes les blagues une fois, sauf celle de la fin', () => {
    const first = [...Array(89).keys()].map((index) => pages.get(FIRST_JOKE_PAGE + index));
    expect(new Set(first).size).toBe(89);
    expect(first).not.toContain(88);
  });

  it('finit par la préférée, répétée, puis la blague de la fin', () => {
    expect(pages.get(LAST_PAGE)).toBe(88);
    expect(pages.get(LAST_PAGE - 1)).toBe(0);
    expect(pages.get(LAST_PAGE - 2)).toBe(0);
  });

  it('sait où la chaise est imprimée, dans l’ordre', () => {
    const chair = pagesOf(pages, 0, 3);
    expect(chair).toHaveLength(3);
    expect([...chair].sort((a, b) => a - b)).toEqual(chair);
    for (const page of chair) expect(pages.get(page)).toBe(0);
  });

  it('est le même à chaque fois', () => {
    expect([...jokeOrder(90, 88)]).toEqual([...pages]);
  });
});
