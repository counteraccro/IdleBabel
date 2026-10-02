import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import type { ClassicText } from './classicText';

/**
 * La mise en page d'un classique : tout son texte, réparti sur les 410 pages comme dans un vrai livre
 * (chaque chapitre s'ouvre sur une page de droite si le style le veut, lettrine, strophes en retrait). Ce
 * qui dépasse la 410e page est coupé ; ce qui reste après la fin du texte est blanc.
 */

export interface ClassicStyle {
  /** Police du texte, sa taille et son interligne. */
  body: string;
  size: number;
  line: number;
  ink: string;
  /** Couleur et police de la lettrine. */
  accent: string;
  dropCap: string;
  /** Police des titres de chapitre. */
  heading: string;
  /** Chaque chapitre commence sur une page de droite (une page blanche avant si besoin). */
  chaptersOnRight: boolean;
}

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
export const LEFT = 64;
export const RIGHT = WIDTH - 64;
const TOP = 88;
const BOTTOM = HEIGHT - 82;
/** Haut du texte sous le titre d'un chapitre. */
export const OPENING_TOP = 300;
/** La page de titre, puis la table des matières à partir de la page 3. */
export const CONTENTS_PAGE = 3;
export const CONTENTS_ROWS = 14;
const INDENT = 26;
const VERSE_INDENT = 48;

/** Une ligne posée sur sa page (y : haut de la ligne). */
export interface PlacedLine {
  text: string;
  x: number;
  y: number;
  center?: boolean;
}

export interface ClassicPage {
  chapter: number;
  opening: boolean;
  lines: PlacedLine[];
  /** La lettrine de l'ouverture du chapitre, et sa place. */
  dropCap?: { letter: string; x: number; y: number; size: number };
}

export interface ClassicLayout {
  pages: Map<number, ClassicPage>;
  /** La page où s'ouvre chaque chapitre (les chapitres coupés par la fin du livre n'en ont pas). */
  starts: number[];
  contentsPages: number;
}

/** Les mots de `text` en lignes, la i-ième d'au plus `width(i)` de large. */
const wrapVarying = (context: CanvasRenderingContext2D, text: string, width: (line: number) => number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width(lines.length)) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  return line ? [...lines, line] : lines;
};

/** Une ligne seule et courte, en capitales (« FIN. », « THE END ») : centrée. */
const isCentered = (para: string): boolean => para.length < 30 && !para.includes('\n') && para === para.toUpperCase();

export const layoutClassic = (context: CanvasRenderingContext2D, text: ClassicText, style: ClassicStyle): ClassicLayout => {
  const font = `${style.size}px ${style.body}`;
  const pages = new Map<number, ClassicPage>();
  const starts: number[] = [];
  const contentsPages = Math.ceil(text.chapters.length / CONTENTS_ROWS);
  let page = CONTENTS_PAGE + contentsPages;
  let y = TOP;
  let current: ClassicPage | null = null;
  /** Va à la page suivante ; false : le livre est plein. */
  const turn = (chapter: number, opening = false): boolean => {
    if (current) page++;
    if (page > PAGES_PER_BOOK) return false;
    current = { chapter, opening, lines: [] };
    pages.set(page, current);
    y = opening ? OPENING_TOP : TOP;
    return true;
  };
  const place = (chapter: number, line: string, x: number, center = false): boolean => {
    if (y + style.line > BOTTOM && !turn(chapter)) return false;
    current!.lines.push({ text: line, x, y, center });
    y += style.line;
    return true;
  };
  for (const [chapter, { paras }] of text.chapters.entries()) {
    if (current) page++;
    if (style.chaptersOnRight && page % 2 === 0) page++;
    current = null;
    if (page > PAGES_PER_BOOK) break;
    turn(chapter, true);
    starts.push(page);
    for (const [index, para] of paras.entries()) {
      context.font = font;
      if (para.includes('\n')) {
        // Une strophe : un vers par ligne, en retrait (un vers trop long continue un peu plus loin).
        y += style.line / 2;
        for (const verse of para.split('\n'))
          for (const [row, line] of wrapVarying(context, verse, (n) => RIGHT - LEFT - VERSE_INDENT - (n ? 24 : 0)).entries())
            if (!place(chapter, line, LEFT + VERSE_INDENT + (row ? 24 : 0))) return { pages, starts, contentsPages };
        y += style.line / 2;
        continue;
      }
      if (isCentered(para)) {
        y += style.line;
        if (!place(chapter, para, WIDTH / 2, true)) return { pages, starts, contentsPages };
        continue;
      }
      // Le premier paragraphe du chapitre : une lettrine sur deux lignes, si le texte commence par une lettre.
      const letter = index === 0 && /^\p{L}/u.test(para) ? para[0] : '';
      if (letter) {
        const size = style.line * 2.3;
        context.font = `${size}px ${style.dropCap}`;
        const drop = context.measureText(letter).width + 8;
        context.font = font;
        current!.dropCap = { letter, x: LEFT, y, size };
        const lines = wrapVarying(context, para.slice(1), (n) => RIGHT - LEFT - (n < 2 ? drop : 0));
        for (const [row, line] of lines.entries())
          if (!place(chapter, line, LEFT + (row < 2 ? drop : 0))) return { pages, starts, contentsPages };
        continue;
      }
      for (const [row, line] of wrapVarying(context, para, (n) => RIGHT - LEFT - (n ? 0 : INDENT)).entries())
        if (!place(chapter, line, LEFT + (row ? 0 : INDENT))) return { pages, starts, contentsPages };
    }
  }
  return { pages, starts, contentsPages };
};
