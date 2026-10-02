import { createLeafPage, type LeafPage } from '../strangeBook/pages';
import { folio, heading, textWidth, type Item, type TextItem } from '../strangeBook/pageItems';
import { tellFinalBook, type Told } from '../../systems/finalBook';
import type { GameState } from '../../core/state';

/** Bloc de texte (repère de la texture, 640 × 800) : marges, corps, interlignes. */
const LEFT = 72;
const WIDTH = 496;
const SIZE = 19;
const LINE = 28;
const NOTE_SIZE = 16;
const NOTE_LINE = 22;
const GAP = 14;
/** Haut du texte : sous le titre d'un chapitre, ou en haut d'une page qui continue ; bas : au-dessus du folio. */
const CHAPTER_TOP = 180;
const PAGE_TOP = 70;
const BOTTOM = 700;

/** L'élément d'une ligne : un moment raconté, un moment venu du débogage (pâli), une note de débogage (au crayon). */
const lineItem = (told: Told, text: string, y: number): TextItem =>
  told.note
    ? { kind: 'text', text, x: LEFT, y, size: NOTE_SIZE, align: 'left', face: 'hand', faded: true }
    : { kind: 'text', text, x: LEFT, y, size: SIZE, align: 'left', italic: told.debug, faded: told.debug };

/** Coupe un paragraphe en lignes qui tiennent dans la largeur du bloc. */
const wrap = (told: Told): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of told.text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && textWidth(lineItem(told, candidate, 0)) > WIDTH) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
};

/** Un chapitre mis en pages : son titre sur la première, puis ses paragraphes, page après page. */
const chapterPages = (title: string, number: number, paragraphs: Told[]): Item[][] => {
  const pages: Item[][] = [heading(title, number)];
  let y = CHAPTER_TOP;
  for (const told of paragraphs) {
    const step = told.note ? NOTE_LINE : LINE;
    for (const text of wrap(told)) {
      if (y + step > BOTTOM) {
        pages.push([]);
        y = PAGE_TOP;
      }
      pages[pages.length - 1].push(lineItem(told, text, y));
      y += step;
    }
    y += GAP;
  }
  return pages;
};

/** Un texte centré, coupé en lignes, à partir de `top`. */
const centered = (text: string, top: number): Item[] =>
  wrap({ text }).map((line, index) => ({
    kind: 'text',
    text: line,
    x: 320,
    y: top + index * LINE,
    size: SIZE,
    align: 'center',
    italic: true,
  }));

/**
 * Les pages du livre de la fin : sa page de titre et les vies d'avant, un chapitre par Âge, puis la dernière
 * phrase ; au-delà, les pages blanches. Lu dans la langue du jeu ; les notes de débogage, en français, au crayon.
 */
export const createFinalBookPages = (state: GameState, goTo: (page: number) => void): LeafPage[] => {
  const book = tellFinalBook(state);
  const layouts: Item[][] = [
    [
      {
        kind: 'text',
        text: book.title.toLocaleUpperCase(),
        x: 320,
        y: 280,
        size: 30,
        align: 'center',
        spacing: 6,
        face: 'title',
        initial: true,
      },
      { kind: 'rule', y: 340, width: 260 },
      ...centered(book.before, 400),
    ],
    ...book.chapters.flatMap((chapter, index) => chapterPages(chapter.title, index + 1, chapter.paragraphs)),
    centered(book.end, 360),
  ];
  return layouts.map((items, index) => createLeafPage(() => [...items, folio(index + 1)], goTo));
};
