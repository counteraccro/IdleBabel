import { messages } from '../../i18n';
import { PAGES_PER_BOOK } from '../../systems/books';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { GARAMOND } from './blankPageCover';
import { PAGE_CENTER, write } from './draw';
import type { PageLink } from './rareBookArt';

const INK = '#3a3833';
const DOTS = 'rgba(58, 56, 51, 0.5)';
const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;

/**
 * Le numéro imprimé de chaque chapitre, dans l'ordre de rareBooks.json. Le livre a 410 pages comme tous
 * ceux de Babel : on triche, une feuille compte pour une page, et le chapitre n commence au recto de la
 * feuille n (la page de droite `2n - 1`).
 */
const CHAPTERS = [7, 23, 89, 157, 211, 299, 401, 405];
const pageOf = (printed: number): number => 2 * printed - 1;
/** Le chapitre dont une note de bas de page n'est appelée par rien, et ne dit rien. */
const FOOTNOTE_CHAPTER = 3;
/** La toute dernière page, au dos de la dernière feuille : l'errata et l'achevé d'imprimer. */
export const LAST_PAGE = 2 * PAGES_PER_BOOK;

/** Le folio, en bas de la page. */
const folio = (context: CanvasRenderingContext2D, printed: number): void =>
  write(context, String(printed), PAGE_CENTER, HEIGHT - 66, { font: `18px ${GARAMOND}`, color: INK });

/** Le sommaire, page 3 ; ses lignes. */
const CONTENTS_PAGE = 3;
const CONTENTS_TOP = 200;
const CONTENTS_STEP = 50;

/** Page de titre : l'auteur, le titre, un filet, le sous-titre. */
export const titlePage = (context: CanvasRenderingContext2D): void => {
  const { author, title, subtitle } = messages().rareBooks.blankPage;
  write(context, author.toUpperCase(), PAGE_CENTER, 160, { font: `20px ${GARAMOND}`, color: INK, spacing: 5 });
  write(context, title, PAGE_CENTER, 230, { font: `600 50px ${GARAMOND}`, color: INK, spacing: 4 });
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 40, 310, 80, 1.5);
  write(context, subtitle, PAGE_CENTER, 330, { font: `italic 30px ${GARAMOND}`, color: INK });
};

/** Le sommaire : chaque chapitre, des points de conduite, sa page. */
const contentsPage = (context: CanvasRenderingContext2D): void => {
  const { contents, chapters } = messages().rareBooks.blankPage;
  write(context, contents, PAGE_CENTER, 92, { font: `30px ${GARAMOND}`, color: INK, spacing: 4 });
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 30, 145, 60, 1);
  const [left, right] = [70, WIDTH - 70];
  chapters.forEach(({ entry }, index) => {
    const y = CONTENTS_TOP + index * CONTENTS_STEP;
    const page = String(CHAPTERS[index]);
    const style = { font: `22px ${GARAMOND}`, color: INK };
    write(context, entry, left, y, { ...style, align: 'left' });
    write(context, page, right, y, { ...style, align: 'right' });
    context.font = style.font;
    const from = left + context.measureText(entry).width + 10;
    const to = right - context.measureText(page).width - 10;
    context.fillStyle = DOTS;
    for (let dot = from; dot < to; dot += 8) context.fillRect(dot, y + 17, 1.4, 1.4);
  });
};

/** Le début d'un chapitre : son numéro, son titre, un filet… et rien. */
const chapterPage = (context: CanvasRenderingContext2D, chapter: number): void => {
  const { label, title } = messages().rareBooks.blankPage.chapters[chapter];
  if (label) write(context, label.toUpperCase(), PAGE_CENTER, 132, { font: `18px ${GARAMOND}`, color: INK, spacing: 6 });
  write(context, title, PAGE_CENTER, 176, { font: `italic 36px ${GARAMOND}`, color: INK });
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 25, 240, 50, 1);
  if (chapter === FOOTNOTE_CHAPTER) {
    // L'appel de note, seul en début de texte ; la note, seule en bas de page.
    write(context, '¹', 76, 300, { font: `22px ${GARAMOND}`, color: INK, align: 'left' });
    context.fillRect(70, HEIGHT - 150, 120, 1);
    write(context, '1.', 70, HEIGHT - 135, { font: `16px ${GARAMOND}`, color: INK, align: 'left' });
  }
  folio(context, CHAPTERS[chapter]);
};

/** La dernière page : l'errata en haut, l'achevé d'imprimer en bas. */
const lastPage = (context: CanvasRenderingContext2D): void => {
  const { errataTitle, errata, colophon } = messages().rareBooks.blankPage;
  write(context, errataTitle.toUpperCase(), PAGE_CENTER, 140, { font: `18px ${GARAMOND}`, color: INK, spacing: 6 });
  write(context, errata, PAGE_CENTER, 186, { font: `italic 19px ${GARAMOND}`, color: INK });
  colophon.forEach((line, index) => write(context, line, PAGE_CENTER, 500 + index * 30, { font: `18px ${GARAMOND}`, color: INK }));
};

/** Ce qui est imprimé sur la page `page` ; partout ailleurs, rien. */
export const paintBlankPage = (context: CanvasRenderingContext2D, page: number): void => {
  if (page === 1) titlePage(context);
  else if (page === CONTENTS_PAGE) contentsPage(context);
  else if (page === LAST_PAGE) lastPage(context);
  else {
    const chapter = CHAPTERS.map(pageOf).indexOf(page);
    if (chapter >= 0) chapterPage(context, chapter);
  }
};

/** Les lignes du sommaire : un clic mène au chapitre. */
export const blankPageLinks = (page: number): PageLink[] =>
  page === CONTENTS_PAGE
    ? CHAPTERS.map((printed, index) => ({
        y: CONTENTS_TOP + index * CONTENTS_STEP - 12,
        height: CONTENTS_STEP - 4,
        target: pageOf(printed),
      }))
    : [];
