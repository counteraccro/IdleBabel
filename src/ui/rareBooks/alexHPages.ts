import { messages } from '../../i18n';
import { hashText, seeded } from '../../core/random';
import { PAGES_PER_BOOK } from '../../systems/books';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { PAGE_CENTER, write } from './draw';
import { INK, ITALIC, MODERN, MONO } from './alexHCover';
import { alsoPage, colophonPage, indexPage, photoPage, thanksPage } from './alexHExtras';
import { pageFrame, writeProse } from './alexHProse';
import { pullRequestPage } from './alexHPullRequest';
import type { PageLink } from './rareBookArt';

const { width: WIDTH } = PAGE_TEXTURE;
const GREY = '#6b6b6b';

/** Les pages de la biographie, comme dans une vraie : le début des parties, puis la fin du livre. */
const COPYRIGHT_PAGE = 2;
const DEDICATION_PAGE = 3;
const EPIGRAPH_PAGE = 5;
const CONTENTS_PAGE = 7;
/** La page où commence chaque chapitre (une page de droite), dans l'ordre de rareBooks.json. */
const CHAPTERS = [9, 19, 59, 101, 143, 209, 251, 293, 335];
/** Fin du récit : l'épilogue est court, le reste attend les remerciements. */
const STORY_END = 361;
/** Le cahier photo, sur papier glacé, au milieu du chapitre « La review ». */
const PHOTOS_FROM = 177;
const PHOTO_COUNT = 8;
/** La PR, dans le chapitre « La review ». */
const PULL_REQUEST_PAGE = 150;
const THANKS_PAGE = 393;
const INDEX_PAGE = 395;
const ALSO_PAGE = 397;

/** Une page du cahier photo (papier glacé). */
export const isPhotoPage = (page: number): boolean => page >= PHOTOS_FROM && page < PHOTOS_FROM + PHOTO_COUNT;

/** La page de titre, sobre : le nom, le titre, le genre. */
const titlePage = (context: CanvasRenderingContext2D): void => {
  const { cover, kind } = messages().rareBooks.alexH;
  write(context, 'ALEXH', PAGE_CENTER, 250, { font: `900 72px ${MODERN}`, color: INK, spacing: -2 });
  write(context, cover[1], PAGE_CENTER, 350, { font: `300 30px ${MODERN}`, color: INK });
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 40, 420, 80, 2);
  write(context, kind, PAGE_CENTER, 460, { font: `italic 500 24px ${ITALIC}`, color: '#333333' });
};

/** Les mentions légales, en petit, en bas à gauche. */
const copyrightPage = (context: CanvasRenderingContext2D): void =>
  messages().rareBooks.alexH.copyright.forEach((line, index) =>
    write(context, line, 70, 470 + index * 22, { font: `13px ${MODERN}`, color: GREY, align: 'left' }),
  );

const dedicationPage = (context: CanvasRenderingContext2D): void =>
  messages().rareBooks.alexH.dedication.forEach((line, index) =>
    write(context, line, PAGE_CENTER, 240 + index * 34, { font: `italic 500 24px ${ITALIC}`, color: INK }),
  );

const epigraphPage = (context: CanvasRenderingContext2D): void => {
  const { epigraph, epigraphSource } = messages().rareBooks.alexH;
  write(context, epigraph, PAGE_CENTER, 250, { font: `italic 500 26px ${ITALIC}`, color: INK });
  write(context, `— ${epigraphSource}`, PAGE_CENTER, 300, { font: `14px ${MODERN}`, color: GREY });
};

/** Les lignes du sommaire : les chapitres, puis les remerciements et l'index (un clic mène à la page). */
const CONTENTS_TOP = 190;
const CONTENTS_STEP = 44;
const contentsRows = (): { label: string; title: string; page: number }[] => {
  const { chapters, thanksTitle, indexTitle } = messages().rareBooks.alexH;
  return [
    ...chapters.map(({ label, title }, index) => ({ label, title, page: CHAPTERS[index] })),
    { label: '', title: thanksTitle, page: THANKS_PAGE },
    { label: '', title: indexTitle, page: INDEX_PAGE },
  ];
};

const contentsPage = (context: CanvasRenderingContext2D): void => {
  write(context, messages().rareBooks.alexH.contents.toUpperCase(), PAGE_CENTER, 100, {
    font: `900 26px ${MODERN}`,
    color: INK,
    spacing: 4,
  });
  const [left, right] = [80, WIDTH - 80];
  contentsRows().forEach(({ label, title, page }, index) => {
    const y = CONTENTS_TOP + index * CONTENTS_STEP;
    if (label) write(context, label.toUpperCase(), left, y - 14, { font: `500 10px ${MODERN}`, color: GREY, align: 'left', spacing: 2 });
    write(context, title, left, y, { font: `500 19px ${MODERN}`, color: INK, align: 'left' });
    write(context, String(page), right, y, { font: `300 19px ${MODERN}`, color: INK, align: 'right' });
  });
};

/** Le début d'un chapitre : son numéro, son titre, un commit en gris, puis le récit plus bas. */
const chapterPage = (context: CanvasRenderingContext2D, chapter: number, page: number): void => {
  const { label, title } = messages().rareBooks.alexH.chapters[chapter];
  if (label) write(context, label.toUpperCase(), PAGE_CENTER, 150, { font: `500 14px ${MODERN}`, color: GREY, spacing: 4 });
  write(context, title, PAGE_CENTER, 180, { font: `900 38px ${MODERN}`, color: INK, spacing: -1 });
  const hash = Math.floor(seeded(hashText(`alexH:chapter:${chapter}`))() * 0xfffffff)
    .toString(16)
    .padStart(7, '0');
  write(context, `commit ${hash}`, PAGE_CENTER, 246, { font: `13px ${MONO}`, color: GREY });
  writeProse(context, page, 320);
  write(context, String(page), PAGE_CENTER, PAGE_TEXTURE.height - 58, { font: `13px ${MODERN}`, color: GREY });
};

/** Le chapitre où se trouve la page `page` (-1 : avant le prologue). */
const chapterOf = (page: number): number => CHAPTERS.filter((start) => start <= page).length - 1;

/** Ce qui est imprimé sur la page `page` ; les pages qui restent sont blanches. */
export const paintAlexHPage = (context: CanvasRenderingContext2D, page: number): void => {
  context.textBaseline = 'alphabetic';
  const chapter = chapterOf(page);
  if (page === 1) titlePage(context);
  else if (page === COPYRIGHT_PAGE) copyrightPage(context);
  else if (page === DEDICATION_PAGE) dedicationPage(context);
  else if (page === EPIGRAPH_PAGE) epigraphPage(context);
  else if (page === CONTENTS_PAGE) contentsPage(context);
  else if (isPhotoPage(page)) photoPage(context, page - PHOTOS_FROM);
  else if (page === PULL_REQUEST_PAGE) pullRequestPage(context);
  else if (page === THANKS_PAGE) thanksPage(context);
  else if (page === INDEX_PAGE) indexPage(context);
  else if (page === ALSO_PAGE) alsoPage(context);
  else if (page === PAGES_PER_BOOK) colophonPage(context);
  else if (CHAPTERS[chapter] === page) chapterPage(context, chapter, page);
  else if (chapter >= 0 && page < STORY_END) {
    pageFrame(context, page, messages().rareBooks.alexH.chapters[chapter].title);
    writeProse(context, page, 80);
  }
};

/** Les lignes du sommaire : un clic mène à leur page. */
export const alexHLinks = (page: number): PageLink[] =>
  page === CONTENTS_PAGE
    ? contentsRows().map(({ page: target }, index) => ({
        y: CONTENTS_TOP + index * CONTENTS_STEP - 18,
        height: CONTENTS_STEP,
        target,
      }))
    : [];
