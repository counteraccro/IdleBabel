import { PAGES_PER_BOOK } from '../../../systems/books';

/**
 * Quelle blague sur quelle page des Jokes de Papa (maquette .ai/maquette-jokes-papa-pages.html) : il n'y en a
 * qu'environ 90, pour 407 pages de blagues. Les premières sont toutes différentes, dans un ordre mêlé ; puis
 * elles reviennent, tirées parmi les « préférées de papa », un groupe qui rétrécit jusqu'à une seule, la
 * première de la liste (la chaise) ; la dernière page porte toujours la blague qui cite des numéros de page.
 * Le même hasard fixe que la maquette : les mêmes pages pour tout le monde (pas la graine de la partie).
 */

export const FIRST_JOKE_PAGE = 4;
export const LAST_PAGE = PAGES_PER_BOOK;

/** Hasard reproductible (Park-Miller), comme la maquette. */
const parkMiller = (seed: number) => (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** La blague (son rang dans la liste) de chaque page, de FIRST_JOKE_PAGE à LAST_PAGE ; `last` : celle de la fin. */
export const jokeOrder = (count: number, last: number): Map<number, number> => {
  const random = parkMiller(410);
  const pool = [...Array(count).keys()].filter((joke) => joke !== last);
  for (let index = pool.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pool[index], pool[other]] = [pool[other], pool[index]];
  }
  // La chaise (la première de la liste) : la préférée, celle qui reste à la fin.
  const favourites = [0, ...pool.filter((joke) => joke !== 0)];
  const pages = new Map<number, number>();
  pool.forEach((joke, index) => pages.set(FIRST_JOKE_PAGE + index, joke));
  const repeatsFrom = FIRST_JOKE_PAGE + pool.length;
  for (let page = repeatsFrom; page < LAST_PAGE; page++) {
    const left = 1 - (page - repeatsFrom) / (LAST_PAGE - 1 - repeatsFrom);
    const size = Math.max(1, Math.round(favourites.length * left * left));
    let joke: number;
    do joke = favourites[Math.floor(random() * size)];
    while (size > 1 && joke === pages.get(page - 1));
    pages.set(page, joke);
  }
  pages.set(LAST_PAGE, last);
  return pages;
};

/** Les premières pages (`count`) où la blague `joke` est imprimée. */
export const pagesOf = (pages: Map<number, number>, joke: number, count: number): number[] =>
  [...pages]
    .filter(([, printed]) => printed === joke)
    .map(([page]) => page)
    .sort((a, b) => a - b)
    .slice(0, count);
