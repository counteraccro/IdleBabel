import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, write } from '../draw';
import { loremText } from '../lorem';
import { CASLON, INK } from './bibleCover';
import { BIBLE_PLAN, CONTENTS_PAGE, CONTENTS_PAGES, OLD_TESTAMENT_BOOKS, OLD_TESTAMENT_PAGE } from './bibleBooks';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages de la Bible : la table des livres (cliquable), les pages des deux Testaments, puis le texte
 * sur deux colonnes, comme dans une Bible de famille : le vrai nom du livre en tête et en titre courant, les
 * vrais numéros de chapitre, des numéros de versets ; et pour le texte, du lorem ipsum.
 */

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
const GREY = '#6c6256';

// ---------- Table des livres ----------

const CONTENTS_TOP = 150;
const CONTENTS_STEP = 25;
const CONTENTS_ROWS = 23;

/** Les lignes de la table : le nom d'un Testament (vers sa page), puis ses livres (vers leur première page). */
const contentsRows = (): { label: string; target: number; testament: boolean }[] => {
  const { books, testaments } = messages().rareBooks.bible;
  const row = (book: number) => ({ label: books[book], target: BIBLE_PLAN.starts[book], testament: false });
  return [
    { label: testaments[0], target: OLD_TESTAMENT_PAGE, testament: true },
    ...books.slice(0, OLD_TESTAMENT_BOOKS).map((_, book) => row(book)),
    { label: testaments[1], target: BIBLE_PLAN.newTestamentPage, testament: true },
    ...books.slice(OLD_TESTAMENT_BOOKS).map((_, book) => row(OLD_TESTAMENT_BOOKS + book)),
  ];
};

const contentsPage = (context: CanvasRenderingContext2D, page: number): void => {
  const sheet = page - CONTENTS_PAGE;
  if (sheet === 0) {
    write(context, messages().rareBooks.bible.contents.toUpperCase(), PAGE_CENTER, 70, {
      font: `bold 19px ${CASLON}`,
      color: INK,
      spacing: 4,
    });
    context.fillStyle = INK;
    context.fillRect(PAGE_CENTER - 30, 108, 60, 1);
  }
  const [left, right] = [110, WIDTH - 110];
  contentsRows()
    .slice(sheet * CONTENTS_ROWS, (sheet + 1) * CONTENTS_ROWS)
    .forEach(({ label, target, testament }, row) => {
      const y = CONTENTS_TOP + row * CONTENTS_STEP;
      if (testament) {
        write(context, label, PAGE_CENTER, y, { font: `bold 14px ${CASLON}`, color: INK, spacing: 3 });
        return;
      }
      const font = `15px ${CASLON}`;
      write(context, label, left, y, { font, color: INK, align: 'left' });
      write(context, String(target), right, y, { font, color: INK, align: 'right' });
      context.font = font;
      const [from, to] = [left + context.measureText(label).width + 10, right - context.measureText(String(target)).width - 10];
      context.fillStyle = '#a89878';
      for (let x = from; x < to; x += 8) context.fillRect(x, y + 12, 1.5, 1.5);
    });
};

/** Un clic sur une ligne de la table mène à son livre (ou à son Testament). */
export const bibleLinks = (page: number): PageLink[] => {
  if (page < CONTENTS_PAGE || page >= CONTENTS_PAGE + CONTENTS_PAGES) return [];
  const sheet = page - CONTENTS_PAGE;
  return contentsRows()
    .slice(sheet * CONTENTS_ROWS, (sheet + 1) * CONTENTS_ROWS)
    .map(({ target }, row) => ({ y: CONTENTS_TOP + row * CONTENTS_STEP - 6, height: CONTENTS_STEP, target }));
};

// ---------- Les deux Testaments ----------

const testamentPage = (context: CanvasRenderingContext2D, testament: number): void => {
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 70, 330, 140, 1);
  context.font = `bold 30px ${CASLON}`;
  const name = messages().rareBooks.bible.testaments[testament];
  const size = Math.min(30, (30 * 480) / context.measureText(name).width);
  write(context, name, PAGE_CENTER, 352, { font: `bold ${size}px ${CASLON}`, color: INK, spacing: 4 });
  context.fillRect(PAGE_CENTER - 70, 410, 140, 1);
};

// ---------- Le texte ----------

const COLUMNS = [56, WIDTH / 2 + 14];
const COLUMN_WIDTH = WIDTH / 2 - 70;
const FONT = `13px ${CASLON}`;
const VERSE_FONT = `bold 8px ${CASLON}`;
const LINE = 17.2;
const BOTTOM = HEIGHT - 76;

/** Une page de texte : titre courant, tête du livre s'il y commence, deux colonnes de versets numérotés. */
const textPage = (context: CanvasRenderingContext2D, page: number): void => {
  const content = BIBLE_PLAN.pages.get(page)!;
  const name = messages().rareBooks.bible.books[content.book].toUpperCase();
  const range = content.from === content.to ? `${content.from}` : `${content.from}. ${content.to}`;
  write(context, `${name}, ${range}.`, PAGE_CENTER, 40, { font: `13px ${CASLON}`, color: GREY, spacing: 2 });
  context.fillStyle = INK;
  context.fillRect(COLUMNS[0], 62, WIDTH - 2 * COLUMNS[0], 1);
  let top = 80;
  if (content.opening) {
    // Le livre commence : son nom en capitales, entre deux filets, sur toute la largeur.
    context.fillRect(PAGE_CENTER - 90, 82, 180, 1);
    write(context, name, PAGE_CENTER, 92, { font: `bold 22px ${CASLON}`, color: INK, spacing: 3 });
    context.fillRect(PAGE_CENTER - 90, 128, 180, 1);
    top = 150;
  }
  context.fillRect(WIDTH / 2, top, 1, BOTTOM - top);
  write(context, String(page), PAGE_CENTER, HEIGHT - 52, { font: `13px ${CASLON}`, color: GREY });

  // Le fil du texte : les lignes des deux colonnes à la suite ; chaque chapitre s'ouvre à sa part du fil.
  const perColumn = Math.floor((BOTTOM - top) / LINE);
  const rows = 2 * perColumn;
  const chapters = content.to - content.from + 1;
  const openings = new Map(Array.from({ length: chapters }, (_, index) => [Math.floor((index * rows) / chapters), content.from + index]));
  const random = seeded(hashText(`bible:${page}`));
  let words: string[] = [];
  let verse = 0;
  let indent = 0;
  let indentRows = 0;
  for (let row = 0; row < rows; row++) {
    const x = COLUMNS[Math.floor(row / perColumn)];
    const y = top + (row % perColumn) * LINE;
    const chapter = openings.get(row);
    if (chapter !== undefined) {
      // Le grand numéro du chapitre, sur deux lignes ; son premier verset vient à côté, sans numéro.
      write(context, String(chapter), x, y - 4, { font: `bold 34px ${CASLON}`, color: INK, align: 'left' });
      context.font = `bold 34px ${CASLON}`;
      indent = context.measureText(String(chapter)).width + 8;
      indentRows = 2;
      verse = 1;
      words = loremText(80 + random() * 200, random).split(' ');
    }
    let left = x + (indentRows > 0 ? indent : 0);
    indentRows--;
    if (!words.length) {
      // Un nouveau verset : son petit numéro, puis son texte.
      verse++;
      write(context, String(verse), left, y - 2, { font: VERSE_FONT, color: INK, align: 'left' });
      context.font = VERSE_FONT;
      left += context.measureText(String(verse)).width + 3;
      words = loremText(60 + random() * 180, random).split(' ');
    }
    // Autant de mots que la ligne en contient.
    context.font = FONT;
    let line = words.shift()!;
    while (words.length && context.measureText(`${line} ${words[0]}`).width <= x + COLUMN_WIDTH - left) line += ` ${words.shift()}`;
    write(context, line, left, y, { font: FONT, color: INK, align: 'left' });
  }
};

/** Dessine la page `page` (sauf la page de titre) ; false : elle reste blanche. */
export const paintBiblePage = (context: CanvasRenderingContext2D, page: number): boolean => {
  if (page >= CONTENTS_PAGE && page < CONTENTS_PAGE + CONTENTS_PAGES) contentsPage(context, page);
  else if (page === OLD_TESTAMENT_PAGE) testamentPage(context, 0);
  else if (page === BIBLE_PLAN.newTestamentPage) testamentPage(context, 1);
  else if (BIBLE_PLAN.pages.has(page)) textPage(context, page);
  else return false;
  return true;
};
