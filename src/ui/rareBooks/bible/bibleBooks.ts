import { PAGES_PER_BOOK } from '../../../systems/books';

/**
 * Le plan de la Bible : ses 66 livres (leurs noms sont dans i18n, rareBooks.bible.books, dans le même
 * ordre), leur vrai nombre de chapitres, et les pages de chacun. Le texte, lui, n'est jamais cité : du lorem
 * ipsum (choix de l'auteur, par respect).
 */

/** Le nombre de chapitres de chaque livre : les 39 de l'Ancien Testament, puis les 27 du Nouveau. */
const CHAPTERS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2,
  14, 4,
  // Nouveau Testament.
  28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
];
export const OLD_TESTAMENT_BOOKS = 39;

/** Page de titre (1), son verso, la table des matières (3 à 5), son verso. */
export const CONTENTS_PAGE = 3;
export const CONTENTS_PAGES = 3;
/** La page « Ancien Testament », puis celle du Nouveau, chacune avant son premier livre. */
export const OLD_TESTAMENT_PAGE = 7;

/** Une page de texte : son livre, les chapitres qui y sont (de `from` à `to`), et si le livre y commence. */
export interface BiblePage {
  book: number;
  from: number;
  to: number;
  opening: boolean;
}

export interface BiblePlan {
  /** Les pages de texte, par numéro de page. */
  pages: Map<number, BiblePage>;
  /** La page où commence chaque livre. */
  starts: number[];
  newTestamentPage: number;
}

/** Répartit `total` pages entre les livres au prorata de leurs chapitres (au moins une chacun). */
const share = (books: number[], total: number): number[] => {
  const chapters = books.reduce((sum, count) => sum + count, 0);
  const exact = books.map((count) => Math.max(1, (count * total) / chapters));
  const pages = exact.map(Math.floor);
  // Les pages qui restent vont aux plus grands restes.
  let left = total - pages.reduce((sum, count) => sum + count, 0);
  const order = exact.map((value, index) => [value - Math.floor(value), index]).sort((a, b) => b[0] - a[0]);
  for (const [, index] of order) {
    if (left <= 0) break;
    pages[index]++;
    left--;
  }
  return pages;
};

const buildPlan = (): BiblePlan => {
  const pages = new Map<number, BiblePage>();
  const starts: number[] = [];
  // Pages de texte : tout le livre sauf le début (jusqu'à la page « Ancien Testament ») et la page « Nouveau Testament ».
  const textPages = PAGES_PER_BOOK - OLD_TESTAMENT_PAGE - 1;
  const perBook = share(CHAPTERS, textPages);
  let page = OLD_TESTAMENT_PAGE + 1;
  let newTestamentPage = 0;
  CHAPTERS.forEach((count, book) => {
    if (book === OLD_TESTAMENT_BOOKS) newTestamentPage = page++;
    starts.push(page);
    // Les chapitres du livre, répartis sur ses pages (chacune en a au moins un).
    for (let sheet = 0; sheet < perBook[book]; sheet++)
      pages.set(page++, {
        book,
        from: Math.floor((sheet * count) / perBook[book]) + 1,
        to: Math.max(Math.floor((sheet * count) / perBook[book]) + 1, Math.floor(((sheet + 1) * count) / perBook[book])),
        opening: sheet === 0,
      });
  });
  return { pages, starts, newTestamentPage };
};

export const BIBLE_PLAN = buildPlan();
