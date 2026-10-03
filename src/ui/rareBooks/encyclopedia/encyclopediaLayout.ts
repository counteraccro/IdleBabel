import { PAGES_PER_BOOK } from '../../../systems/books';
import { sliced } from '../classic/classicLayout';
import { oldRoman, parseWords, spaceWidth, wordWidth, type Word } from './encyclopediaText';
import type { ClassicText } from '../classic/classicText';

/**
 * La mise en page de l'Encyclopédie, comme le tome I de 1751 (d'après .ai/maquette-encyclopedie.html ; y : lignes
 * de base) : la page de titre, la table des articles (là où mène le signet, comme dans les autres classiques),
 * puis le Discours préliminaire sur toute la largeur, sa lettrine, ses pages en chiffres romains ; puis les
 * articles sur deux colonnes, l'un à la suite de l'autre, les colonnes numérotées. Le premier chapitre du texte
 * est le Discours, les autres sont les articles.
 */

/** Le Discours : la largeur de la page. */
export const DISCOURS = { size: 16.5, line: 21, left: 64, right: 576, first: 100, opening: 286, bottom: 730, indent: 20, verse: 40 };
/** La lettrine du Discours, sur quatre lignes, et sa place (le haut de la lettrine sous la 1re ligne de base). */
export const DROP = { lines: 4, size: 80, gap: 10, above: 16 };
/** Les articles : deux colonnes, un filet entre elles. */
export const ARTICLES = {
  size: 14.5,
  line: 18.5,
  columns: [
    [54, 307],
    [333, 586],
  ] as const,
  first: 96,
  opening: 250,
  bottom: 738,
  indent: 12,
  verse: 20,
  /** La place en plus avant un article. */
  gap: 6,
};
/** La table des articles (après la page de titre et son verso), puis le Discours, sur une page de droite. */
export const CONTENTS_PAGE = 3;
export const DISCOURS_PAGE = 5;

/** Une ligne posée : ses mots, où commence la ligne, sa ligne de base ; `justify` : la largeur où étaler ses mots. */
export interface PlacedLine {
  words: Word[];
  x: number;
  y: number;
  justify?: number;
}

export interface EncyclopediaPage {
  part: 'discours' | 'articles';
  /** La première page du Discours, ou celle des articles (le haut est orné). */
  opening: boolean;
  lines: PlacedLine[];
  /** La lettrine du Discours : sa lettre et le haut-gauche de son carré. */
  dropCap?: { letter: string; x: number; y: number };
  /** Le folio : la page du Discours en chiffres romains, ou le numéro de la première colonne des articles. */
  folio: number;
  /** Les trois premières lettres de l'article du haut de la page, et du dernier de la page (« ALP », « BAB »). */
  guides: string[];
}

/** Une entrée de la table : le Discours ou un article, sa page, et ce qu'on lit en face (« j », « 17 »). */
export interface Entry {
  title: string;
  page: number;
  at: string;
}

export interface EncyclopediaLayout {
  pages: Map<number, EncyclopediaPage>;
  entries: Entry[];
}

/**
 * Un mot plus large que `room` (une longue formule de COMBINAISON) coupé en morceaux qui tiennent, après un
 * signe (×, +, =…) : ils se suivront comme des mots.
 */
const breakLong = (context: CanvasRenderingContext2D, word: Word, size: number, room: number): Word[] => {
  if (wordWidth(context, word, size) <= room) return [word];
  const chunks = word.flatMap((run) => run.text.split(/(?<=[×=+−,;])/).map((text) => ({ ...run, text })));
  const pieces: Word[] = [];
  let piece: Word = [];
  for (const chunk of chunks) {
    if (piece.length && wordWidth(context, [...piece, chunk], size) > room) {
      pieces.push(piece);
      piece = [];
    }
    piece.push(chunk);
  }
  return piece.length ? [...pieces, piece] : pieces;
};

/** Les mots en lignes, la i-ième d'au plus `width(i)` de large. */
const wrapWords = (context: CanvasRenderingContext2D, words: Word[], size: number, width: (line: number) => number): Word[][] => {
  const space = spaceWidth(context, size);
  const lines: Word[][] = [];
  let line: Word[] = [];
  let used = 0;
  for (const word of words.flatMap((word) => breakLong(context, word, size, Math.min(width(0), width(1))))) {
    const measure = wordWidth(context, word, size);
    if (line.length && used + space + measure > width(lines.length)) {
      lines.push(line);
      line = [word];
      used = measure;
    } else {
      used += (line.length ? space : 0) + measure;
      line.push(word);
    }
  }
  return line.length ? [...lines, line] : lines;
};

/** Les trois premières lettres d'un article, en capitales (« BABYLONE ou BABEL » → « BAB »). */
export const guideOf = (title: string): string => title.slice(0, 3).toUpperCase();

/** La mise en page, un paragraphe à la fois : elle s'arrête (yield) après chacun. */
function* layoutSteps(context: CanvasRenderingContext2D, text: ClassicText): Generator<void, EncyclopediaLayout> {
  const pages = new Map<number, EncyclopediaPage>();
  const entries: Entry[] = [];
  const [discours, ...articles] = text.chapters;

  // Le Discours : la page de titre, son verso, puis le Discours ; la lettrine à l'ouverture.
  let page = DISCOURS_PAGE;
  let current: EncyclopediaPage = { part: 'discours', opening: true, lines: [], folio: 1, guides: [] };
  pages.set(page, current);
  let y = DISCOURS.opening;
  entries.push({ title: discours.title, page, at: oldRoman(1) });
  const turnDiscours = (): void => {
    page++;
    current = { part: 'discours', opening: false, lines: [], folio: page - DISCOURS_PAGE + 1, guides: [] };
    pages.set(page, current);
    y = DISCOURS.first;
  };
  const placeDiscours = (line: Omit<PlacedLine, 'y'>): void => {
    if (y > DISCOURS.bottom) turnDiscours();
    current.lines.push({ ...line, y });
    y += DISCOURS.line;
  };
  for (const [index, para] of discours.paras.entries()) {
    yield;
    if (para.includes('\n')) {
      // Des vers : un par ligne, en retrait.
      for (const verse of para.split('\n'))
        for (const [row, words] of wrapWords(
          context,
          parseWords(verse),
          DISCOURS.size,
          (n) => DISCOURS.right - DISCOURS.left - DISCOURS.verse - (n ? 20 : 0),
        ).entries())
          placeDiscours({ words, x: DISCOURS.left + DISCOURS.verse + (row ? 20 : 0) });
      continue;
    }
    let words = parseWords(para);
    const first = words[0]?.[0]?.text ?? '';
    if (index === 0 && /^\p{L}/u.test(first)) {
      // La lettrine : la première lettre sort du texte ; les quatre premières lignes s'écartent d'elle.
      current.dropCap = { letter: first[0], x: DISCOURS.left, y: y - DROP.above };
      words = [[{ ...words[0][0], text: first.slice(1) }, ...words[0].slice(1)], ...words.slice(1)];
      const room = (n: number): number => DISCOURS.right - DISCOURS.left - (n < DROP.lines ? DROP.size + DROP.gap : 0);
      const lines = wrapWords(context, words, DISCOURS.size, room);
      for (const [row, line] of lines.entries())
        placeDiscours({
          words: line,
          x: DISCOURS.left + (row < DROP.lines ? DROP.size + DROP.gap : 0),
          ...(row < lines.length - 1 ? { justify: room(row) } : {}),
        });
      if (lines.length < DROP.lines) y += (DROP.lines - lines.length) * DISCOURS.line;
      continue;
    }
    const room = (n: number): number => DISCOURS.right - DISCOURS.left - (n ? 0 : DISCOURS.indent);
    const lines = wrapWords(context, words, DISCOURS.size, room);
    for (const [row, line] of lines.entries())
      placeDiscours({
        words: line,
        x: DISCOURS.left + (row ? 0 : DISCOURS.indent),
        ...(row < lines.length - 1 ? { justify: room(row) } : {}),
      });
  }

  // Les articles : sur une page de droite, deux colonnes, les colonnes numérotées depuis la première.
  page += page % 2 === 0 ? 1 : 2;
  const articlesPage = page;
  let column = 0;
  let title = '';
  /** Rien n'est encore posé dans la colonne. */
  let fresh = true;
  current = { part: 'articles', opening: true, lines: [], folio: 1, guides: [] };
  pages.set(page, current);
  y = ARTICLES.opening;
  /** Va à la colonne suivante ; false : le livre est plein. */
  const turnColumn = (): boolean => {
    fresh = true;
    if (column === 0) {
      column = 1;
      y = current.opening ? ARTICLES.opening : ARTICLES.first;
      return true;
    }
    if (page >= PAGES_PER_BOOK) return false;
    page++;
    column = 0;
    current = { part: 'articles', opening: false, lines: [], folio: 2 * (page - articlesPage) + 1, guides: [] };
    pages.set(page, current);
    y = ARTICLES.first;
    return true;
  };
  const placeArticle = (line: Omit<PlacedLine, 'y'>): boolean => {
    if (y > ARTICLES.bottom && !turnColumn()) return false;
    // À gauche, l'article du haut de la page ; à droite, le dernier qui y commence (comme dans un dictionnaire).
    if (column === 0) current.guides[0] ??= guideOf(title);
    else current.guides[1] = guideOf(title);
    current.lines.push({ ...line, x: line.x + ARTICLES.columns[column][0], y });
    y += ARTICLES.line;
    fresh = false;
    return true;
  };
  const width = ARTICLES.columns[0][1] - ARTICLES.columns[0][0];
  /** Pose un paragraphe ; false : le livre est plein. */
  const placePara = (para: string): boolean => {
    if (para.includes('\n')) {
      for (const verse of para.split('\n'))
        for (const [row, words] of wrapWords(
          context,
          parseWords(verse),
          ARTICLES.size,
          (n) => width - ARTICLES.verse - (n ? 12 : 0),
        ).entries())
          if (!placeArticle({ words, x: ARTICLES.verse + (row ? 12 : 0) })) return false;
      return true;
    }
    const room = (n: number): number => width - (n ? 0 : ARTICLES.indent);
    const lines = wrapWords(context, parseWords(para), ARTICLES.size, room);
    return lines.every((line, row) =>
      placeArticle({ words: line, x: row ? 0 : ARTICLES.indent, ...(row < lines.length - 1 ? { justify: room(row) } : {}) }),
    );
  };
  articles: for (const article of articles) {
    // Un peu de place avant l'article, sauf en haut d'une colonne.
    if (!fresh) y += ARTICLES.gap;
    if (y > ARTICLES.bottom && !turnColumn()) break;
    title = article.title;
    entries.push({ title, page, at: String(current.folio + column) });
    for (const para of article.paras) {
      yield;
      if (!placePara(para)) break articles;
    }
  }
  return { pages, entries };
}

/** Met en page tout le livre, par petits morceaux entre deux images. */
export const layoutEncyclopedia = (context: CanvasRenderingContext2D, text: ClassicText): Promise<EncyclopediaLayout> =>
  sliced(layoutSteps(context, text));
