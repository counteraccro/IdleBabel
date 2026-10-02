import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, write } from '../draw';
import { loremText } from '../lorem';
import { CASLON, INK, writeTop } from './bibleCover';
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

/** La grille de la maquette validée (.ai/maquette-bible.html, page courante). */
const COLUMNS = [56, WIDTH / 2 + 14];
const COLUMN_WIDTH = 246;
const FONT = `13px ${CASLON}`;
const VERSE_FONT = `bold 9px ${CASLON}`;
const LINE = 17.2;
const TOP = 92;
const BOTTOM = HEIGHT - 70;
/** Le début d'un chapitre : son grand numéro, à côté de ses trois premières lignes (en retrait). */
const CHAPTER_FONT = `bold 42px ${CASLON}`;
const CHAPTER_INDENT = 40;
const CHAPTER_LINES = 6;

/**
 * Une page de texte : titre courant, deux colonnes séparées d'un filet ; le nom du livre en tête de colonne
 * s'il commence ici ; chaque chapitre s'ouvre sur son grand numéro, puis des versets numérotés.
 */
const textPage = (context: CanvasRenderingContext2D, page: number): void => {
  const content = BIBLE_PLAN.pages.get(page)!;
  const name = messages().rareBooks.bible.books[content.book].toUpperCase();
  const range = content.from === content.to ? `${content.from}` : `${content.from}. ${content.to}`;
  writeTop(context, `${name}, ${range}.`, PAGE_CENTER, 52, { font: `13px ${CASLON}`, color: GREY, spacing: 2 });
  context.fillStyle = INK;
  context.fillRect(COLUMNS[0], 62, WIDTH - 2 * COLUMNS[0], 1);
  context.fillRect(WIDTH / 2, 72, 1, HEIGHT - 140);
  writeTop(context, String(page), PAGE_CENTER, HEIGHT - 40, { font: `13px ${CASLON}`, color: GREY });

  const random = seeded(hashText(`bible:${page}`));
  const chapters = content.to - content.from + 1;
  // Les deux colonnes à la suite ; chaque chapitre s'ouvre à sa part de la hauteur totale.
  const total = 2 * (BOTTOM - TOP);
  let chapter = content.from;
  let verse = 0;
  for (const [column, left] of COLUMNS.entries()) {
    let y = TOP;
    if (column === 0 && content.opening) {
      // Le livre commence : son nom en capitales entre deux filets courts, en tête de colonne.
      context.fillStyle = INK;
      context.fillRect(left + 60, y + 4, COLUMN_WIDTH - 120, 1);
      writeTop(context, name, left + COLUMN_WIDTH / 2, y + 16, { font: `bold 20px ${CASLON}`, color: INK, spacing: 3 });
      context.fillRect(left + 60, y + 46, COLUMN_WIDTH - 120, 1);
      y += 62;
    }
    while (y < BOTTOM) {
      const done = column * (BOTTOM - TOP) + (y - TOP);
      const due = chapter - content.from < chapters && done >= ((chapter - content.from) * total) / chapters;
      if (due && y < BOTTOM - CHAPTER_LINES * LINE) {
        // Un chapitre commence : le grand numéro, à côté de ses trois premières lignes.
        y += 6;
        writeTop(context, String(chapter), left + 2, y, { font: CHAPTER_FONT, color: INK, align: 'left' });
        context.font = FONT;
        const words = loremText(400, random).split(' ');
        for (let row = 0; row < CHAPTER_LINES; row++) {
          const x = left + (row < 3 ? CHAPTER_INDENT : 0);
          let line = words.shift()!;
          while (words.length && context.measureText(`${line} ${words[0]}`).width <= left + COLUMN_WIDTH - x) line += ` ${words.shift()}`;
          writeTop(context, line, x, y + row * LINE, { font: FONT, color: INK, align: 'left' });
        }
        y += CHAPTER_LINES * LINE + 4;
        chapter++;
        verse = 3;
        continue;
      }
      // Un verset : son petit numéro gras, puis son texte.
      const number = String(++verse);
      writeTop(context, number, left, y - 3, { font: VERSE_FONT, color: INK, align: 'left' });
      context.font = VERSE_FONT;
      const gap = context.measureText(number).width + 4;
      context.font = FONT;
      const words = loremText(70 + random() * 170, random).split(' ');
      let first = true;
      while (words.length && y < BOTTOM) {
        const x = left + (first ? gap : 0);
        let line = words.shift()!;
        while (words.length && context.measureText(`${line} ${words[0]}`).width <= left + COLUMN_WIDTH - x) line += ` ${words.shift()}`;
        writeTop(context, line, x, y, { font: FONT, color: INK, align: 'left' });
        y += LINE;
        first = false;
      }
    }
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
