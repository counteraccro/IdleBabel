import { messages } from '../../../i18n';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, write } from '../draw';
import { DISPLAY, INK, ROSE, SANS } from './orianaCover';
import { alsoPage, colophonPage, copyrightPage, dedicationPage, epigraphPage, thanksPage, titlePage } from './orianaExtras';
import { journalPage } from './orianaJournal';
import {
  BOTTOM,
  GREY,
  LEFT,
  NOTE,
  RIGHT,
  folio,
  noteLines,
  noteTop,
  pageFrame,
  pageNote,
  storyLines,
  writeNote,
  writeProse,
  writeStory,
  type StoryLine,
} from './orianaProse';
import { TRAVEL_PAGES, travelPage } from './orianaTravel';
import type { PageLink } from '../rareBookArt';

const { width: WIDTH } = PAGE_TEXTURE;

/** Les pages de la biographie, comme dans une vraie : le début des parties, puis la fin du livre. */
const COPYRIGHT_PAGE = 2;
const DEDICATION_PAGE = 3;
const EPIGRAPH_PAGE = 5;
export const CONTENTS_PAGE = 7;
/** La page où commence chaque chapitre (une page de droite), dans l'ordre de rareBooks.json ; le 8e est le plus court. */
const CHAPTERS = [9, 37, 67, 97, 127, 177, 213, 245, 259, 339];
/** Le carnet de voyage, sur papier kraft, au milieu du chapitre « Le tour du monde ». */
const TRAVEL_FROM = 148;
/** La note qui mange la page (« suite p. 312 »), au chapitre « L'Amérique ». */
const LONG_NOTE_PAGE = 311;
/** L'annexe : le journal de bord en blocs, après l'épilogue. */
const JOURNAL_FROM = 343;
const JOURNAL_TO = 392;
const THANKS_PAGE = 395;
/** « De la même autrice » : l'avant-dernière page, juste avant l'achevé d'imprimer. */
const ALSO_PAGE = PAGES_PER_BOOK - 1;

/** Une page du carnet de voyage (papier kraft). */
export const isTravelPage = (page: number): boolean => page >= TRAVEL_FROM && page < TRAVEL_FROM + TRAVEL_PAGES;

/** Les lignes du sommaire : les chapitres, le carnet, l'annexe, les remerciements (un clic mène à la page). */
const CONTENTS_TOP = 180;
const CONTENTS_STEP = 40;
const contentsRows = (): { label: string; title: string; page: number }[] => {
  const { chapters, travelTitle, journalTitle, thanksTitle } = messages().rareBooks.oriana;
  return [
    ...chapters.map(({ label, title }, index) => ({ label, title, page: CHAPTERS[index] })),
    { label: '', title: travelTitle, page: TRAVEL_FROM },
    { label: '', title: journalTitle, page: JOURNAL_FROM },
    { label: '', title: thanksTitle, page: THANKS_PAGE },
  ].sort((a, b) => a.page - b.page);
};

const contentsPage = (context: CanvasRenderingContext2D): void => {
  write(context, messages().rareBooks.oriana.contents, PAGE_CENTER, 90, { font: `italic 36px ${DISPLAY}`, color: INK });
  const [left, right] = [80, WIDTH - 80];
  contentsRows().forEach(({ label, title, page }, index) => {
    const y = CONTENTS_TOP + index * CONTENTS_STEP;
    if (label) write(context, label.toUpperCase(), left, y - 13, { font: `500 9px ${SANS}`, color: GREY, align: 'left', spacing: 2 });
    write(context, title, left, y, { font: `19px ${DISPLAY}`, color: INK, align: 'left' });
    write(context, String(page), right, y + 3, { font: `300 17px ${SANS}`, color: INK, align: 'right' });
  });
};

/** Haut du texte sur la page d'ouverture d'un chapitre, et sur les autres pages. */
const OPENING_TOP = 320;
const TEXT_TOP = 80;

/** Trois blocs enchaînés, en rose : l'ornement des débuts de chapitre. */
const ornament = (context: CanvasRenderingContext2D, y: number): void => {
  const [size, gap] = [12, 10];
  const left = PAGE_CENTER - (3 * size + 2 * gap) / 2;
  context.strokeStyle = ROSE;
  context.lineWidth = 1.5;
  for (let index = 0; index < 3; index++) {
    const x = left + index * (size + gap);
    context.strokeRect(x, y, size, size);
    if (index < 2) {
      context.beginPath();
      context.moveTo(x + size, y + size / 2);
      context.lineTo(x + size + gap, y + size / 2);
      context.stroke();
    }
  }
};

/** La note du chapitre, en bas de sa page d'ouverture (son appel est dans le premier paragraphe). */
const chapterNote = (context: CanvasRenderingContext2D, chapter: number): string[] =>
  noteLines(context, `¹ ${messages().rareBooks.oriana.chapters[chapter].note}`);

/** L'épilogue : son vrai texte seulement, pas de lorem ipsum après. */
const isEpilogue = (chapter: number): boolean => chapter === CHAPTERS.length - 1;

/** Le début d'un chapitre : son numéro, son titre, l'ornement, son vrai texte (la suite page suivante), sa note. */
const chapterPage = (context: CanvasRenderingContext2D, chapter: number, page: number): void => {
  const { label, title, opening } = messages().rareBooks.oriana.chapters[chapter];
  if (label) write(context, label.toUpperCase(), PAGE_CENTER, 140, { font: `500 13px ${SANS}`, color: GREY, spacing: 4 });
  write(context, title, PAGE_CENTER, 170, { font: `42px ${DISPLAY}`, color: INK });
  ornament(context, 250);
  const note = chapterNote(context, chapter);
  const bottom = noteTop(note.length);
  const lines = storyLines(context, opening);
  const { y, count } = writeStory(context, lines, OPENING_TOP, bottom);
  if (count === lines.length && !isEpilogue(chapter)) writeProse(context, page, y, bottom, false);
  writeNote(context, note);
  folio(context, page);
};

/** Une page dans un chapitre : juste après l'ouverture, la fin du vrai texte ; puis le lorem ipsum et sa note. */
const chapterTextPage = (context: CanvasRenderingContext2D, chapter: number, page: number): void => {
  const { title, opening } = messages().rareBooks.oriana.chapters[chapter];
  let rest: StoryLine[] = [];
  if (page === CHAPTERS[chapter] + 1) {
    const lines = storyLines(context, opening);
    rest = lines.slice(writeStory(context, lines, OPENING_TOP, noteTop(chapterNote(context, chapter).length), false).count);
  }
  if (isEpilogue(chapter) && rest.length === 0) return;
  const note = isEpilogue(chapter) ? [] : pageNote(context, page);
  const bottom = noteTop(note.length);
  pageFrame(context, page, title);
  const { y } = writeStory(context, rest, TEXT_TOP, bottom);
  if (!isEpilogue(chapter)) writeProse(context, page, y, bottom, note.length > 0);
  writeNote(context, note);
};

/**
 * La page où la note mange tout : une ligne du biographe, puis sa note, à la plus grande taille qui remplit la
 * page, et qui continue page suivante.
 */
const longNotePage = (context: CanvasRenderingContext2D, page: number, title: string): void => {
  const { longLine, longNote, longNoteMore } = messages().rareBooks.oriana;
  pageFrame(context, page, title);
  writeStory(context, storyLines(context, [longLine]), TEXT_TOP);
  const top = TEXT_TOP + 70;
  context.fillStyle = '#555555';
  context.fillRect(LEFT, top - 14, 150, 1);
  for (let size = 19; size >= 12; size -= 0.5) {
    const lead = Math.round(size * 1.45);
    const font = NOTE.replace(/^[\d.]+px/, `${size}px`);
    const lines = noteLines(context, `¹ ${longNote} ${longNoteMore}`, false, font);
    if (top + lines.length * lead > BOTTOM && size > 12) continue;
    lines.forEach((line, index) => write(context, line, LEFT, top + index * lead, { font, color: '#333333', align: 'left' }));
    return;
  }
};

/** La page qui suit : la fin de la note en haut, signée, un filet, puis le récit reprend. */
const longNoteEndPage = (context: CanvasRenderingContext2D, page: number, title: string): void => {
  pageFrame(context, page, title);
  const lines = noteLines(context, messages().rareBooks.oriana.longNoteRest);
  lines.forEach((line, index) => write(context, line, LEFT, TEXT_TOP + index * 20, { font: NOTE, color: '#333333', align: 'left' }));
  const y = TEXT_TOP + lines.length * 20 + 16;
  context.fillStyle = '#555555';
  context.fillRect(LEFT, y, RIGHT - LEFT, 1);
  writeProse(context, page, y + 24, BOTTOM, false);
};

/** Le chapitre où se trouve la page `page` (-1 : avant le premier). */
const chapterOf = (page: number): number => CHAPTERS.filter((start) => start <= page).length - 1;

/** Ce qui est imprimé sur la page `page` ; les pages qui restent sont blanches. */
export const paintOrianaPage = (context: CanvasRenderingContext2D, page: number): void => {
  context.textBaseline = 'alphabetic';
  const chapter = chapterOf(page);
  const title = chapter >= 0 ? messages().rareBooks.oriana.chapters[chapter].title : '';
  if (page === 1) titlePage(context);
  else if (page === COPYRIGHT_PAGE) copyrightPage(context);
  else if (page === DEDICATION_PAGE) dedicationPage(context);
  else if (page === EPIGRAPH_PAGE) epigraphPage(context);
  else if (page === CONTENTS_PAGE) contentsPage(context);
  else if (isTravelPage(page)) travelPage(context, page - TRAVEL_FROM);
  else if (page === LONG_NOTE_PAGE) longNotePage(context, page, title);
  else if (page === LONG_NOTE_PAGE + 1) longNoteEndPage(context, page, title);
  else if (page >= JOURNAL_FROM && page <= JOURNAL_TO) journalPage(context, page - JOURNAL_FROM, page, page === JOURNAL_TO);
  else if (page === THANKS_PAGE) thanksPage(context);
  else if (page === ALSO_PAGE) alsoPage(context);
  else if (page === PAGES_PER_BOOK) colophonPage(context);
  else if (page > JOURNAL_TO) return;
  else if (CHAPTERS[chapter] === page) chapterPage(context, chapter, page);
  else if (chapter >= 0) chapterTextPage(context, chapter, page);
};

/** Les lignes du sommaire : un clic mène à leur page. */
export const orianaLinks = (page: number): PageLink[] =>
  page === CONTENTS_PAGE
    ? contentsRows().map(({ page: target }, index) => ({
        y: CONTENTS_TOP + index * CONTENTS_STEP - 18,
        height: CONTENTS_STEP,
        target,
      }))
    : [];
