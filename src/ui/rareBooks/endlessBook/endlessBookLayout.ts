import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { sliced } from '../classic/classicLayout';
import { GARAMOND } from './endlessBookCover';
import type { PageLink } from '../rareBookArt';

/**
 * La mise en page du livre-jeu, reprise de .ai/maquette-livre-sans-fin.html : les cent paragraphes à la suite, à
 * partir de la page 4 ; chacun son numéro centré, son texte justifié, ses choix en retrait (le numéro en gras : la
 * ligne est cliquable). Un paragraphe trop long continue sur la page suivante. Après le 100, la seule fin, le livre
 * ne s'arrête pas : des paragraphes de charabia de Babel, trois par page, jusqu'à la 410e (endlessBookPages.ts).
 */

/** Un morceau du texte : `p` un alinéa, `fig` un nombre-indice, `line` une ligne centrée, `end` « Votre aventure
 * s'arrête ici. », `choice` un choix (« {} » : le numéro, vers le paragraphe donné), `fin` la seule fin. */
export type Part = ['p' | 'fig' | 'line' | 'end' | 'fin', string] | ['choice', string, number];

export interface Paragraph {
  n: number;
  parts: Part[];
}

/** Le texte du livre, public/texts/endlessBook.<langue>.json (fait par .ai/textes-livre-sans-fin-vers-json.py). */
export interface EndlessText {
  paragraphs: Paragraph[];
}

/** Un mot posé, dans son style. */
export interface Word {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Collé au mot d'avant, sans espace (la ponctuation après un numéro). */
  glued?: boolean;
}

/** Une ligne posée sur sa page (y : ligne de base, comme sur la maquette). */
export interface PlacedLine {
  kind: 'number' | 'text' | 'fig' | 'line' | 'end' | 'fin';
  words: Word[];
  x: number;
  y: number;
  /** Justifiée : la largeur sur laquelle étaler ses mots. */
  justify?: number;
}

export interface EndlessPage {
  lines: PlacedLine[];
  /** Les paragraphes qui y sont, même en partie (le titre courant), et ceux qui y commencent. */
  paragraphs: number[];
  starts: number[];
  links: PageLink[];
}

/** Un lien de choix : du paragraphe `from` vers le paragraphe `to`. */
export interface Choice {
  from: number;
  to: number;
}

export interface EndlessLayout {
  pages: Map<number, EndlessPage>;
  /** Le paragraphe derrière chaque lien (pour les sceaux). */
  choices: Map<PageLink, Choice>;
  /** La page où commence chaque paragraphe. */
  starts: Map<number, number>;
  /** La première page de charabia, après la seule fin. */
  babelFirst: number;
}

/** Les mesures de la maquette (page 640 × 800). */
const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
export const PAD = 66;
export const LINE = 35;
export const SIZE = 26;
const INDENT = 22;
/** La première ligne de base d'une page, la dernière permise. */
export const TOP = 100;
const BOTTOM = HEIGHT - 70;
/** Le numéro du paragraphe, puis son texte à 40 dessous ; 30 entre deux paragraphes. */
export const NUMBER_GAP = 40;
export const PARAGRAPH_GAP = 30;
const FIG_SIZE = 64;
/** La page de titre, son verso, la règle ; le 1 commence page 4. */
export const RULES_PAGE = 3;
export const FIRST_PAGE = 4;

export const wordFont = (word: Word, size = SIZE): string =>
  `${word.italic ? 'italic ' : ''}${word.bold ? 700 : 400} ${size}px ${GARAMOND}`;

/**
 * Les mots de `text` : *italique*, et « {} » remplacé par le numéro `number`, en gras. Une ponctuation collée au
 * numéro (« au 47. ») garde le style du texte.
 */
export const parseWords = (text: string, number?: number): Word[] => {
  const words: Word[] = [];
  let italic = false;
  for (const raw of text.split(' ').filter(Boolean)) {
    let token = raw;
    const opens = token.startsWith('*');
    if (opens) token = token.slice(1);
    const closes = token.endsWith('*') || /\*[.,;:!?»]*$/.test(token);
    if (opens) italic = true;
    const style = italic;
    if (closes) {
      token = token.replace(/\*([.,;:!?»]*)$/, '$1');
      italic = false;
    }
    const slot = token.indexOf('{}');
    if (slot >= 0 && number !== undefined) {
      if (slot > 0) words.push({ text: token.slice(0, slot), italic: style });
      words.push({ text: String(number), bold: true });
      // Ce qui suit le numéro (« . », « , ») : collé à lui, dans le style du texte.
      const after = token.slice(slot + 2);
      if (after) words.push({ text: after, italic: style, glued: true });
    } else words.push({ text: token, italic: style });
  }
  return words;
};

/** La largeur d'une suite de mots, espaces comprises. */
export const measureWords = (context: CanvasRenderingContext2D, words: Word[], size = SIZE): number => {
  context.font = `${size}px ${GARAMOND}`;
  const space = context.measureText(' ').width;
  return words.reduce((total, word, i) => {
    context.font = wordFont(word, size);
    return total + context.measureText(word.text).width + (i > 0 && !word.glued ? space : 0);
  }, 0);
};

/** Les mots en lignes d'au plus `width` de large. */
export const wrapWords = (context: CanvasRenderingContext2D, words: Word[], width: number): Word[][] => {
  const lines: Word[][] = [];
  let line: Word[] = [];
  for (const word of words) {
    const tried = [...line, word];
    if (line.length && !word.glued && measureWords(context, tried) > width) {
      // Le numéro d'un choix ne commence jamais une ligne : « rendez-vous au » passe avec lui.
      const keep = word.bold && line.length > 1 ? line.splice(-1) : [];
      lines.push(line);
      line = [...keep, word];
    } else line = tried;
  }
  return line.length ? [...lines, line] : lines;
};

function* layoutSteps(context: CanvasRenderingContext2D, text: EndlessText): Generator<void, EndlessLayout> {
  const pages = new Map<number, EndlessPage>();
  const choices = new Map<PageLink, Choice>();
  const starts = new Map<number, number>();
  const pending: { link: PageLink; to: number }[] = [];
  let page = FIRST_PAGE;
  let y = TOP;
  const sheet = (): EndlessPage => {
    let current = pages.get(page);
    if (!current) {
      current = { lines: [], paragraphs: [], starts: [], links: [] };
      pages.set(page, current);
    }
    return current;
  };
  /** Assez de place pour `height` sous la ligne courante ? Sinon, la page suivante. */
  const room = (height: number): void => {
    if (y + height > BOTTOM) {
      page++;
      y = TOP;
    }
  };
  const mark = (n: number): void => {
    const current = sheet();
    if (!current.paragraphs.includes(n)) current.paragraphs.push(n);
  };
  const place = (n: number, line: Omit<PlacedLine, 'y'>): number => {
    room(0);
    mark(n);
    sheet().lines.push({ ...line, y });
    const at = page;
    y += LINE;
    return at;
  };
  const width = WIDTH - 2 * PAD;
  for (const { n, parts } of text.paragraphs) {
    yield;
    // Le numéro reste avec au moins deux lignes de son texte.
    room(NUMBER_GAP + LINE);
    starts.set(n, page);
    mark(n);
    sheet().starts.push(n);
    sheet().lines.push({ kind: 'number', words: [{ text: String(n) }], x: WIDTH / 2, y });
    y += NUMBER_GAP;
    for (const part of parts) {
      const [kind, content] = part;
      if (kind === 'p') {
        const lines = wrapWords(context, parseWords(content), width);
        lines.forEach((words, row) => place(n, { kind: 'text', words, x: PAD, ...(row < lines.length - 1 ? { justify: width } : {}) }));
        y += 6;
      } else if (kind === 'choice') {
        const lines = wrapWords(context, parseWords(content, part[2]), width - INDENT);
        // Le choix tient sur sa page : sa bande cliquable ne se coupe pas.
        room((lines.length - 1) * LINE);
        const top = y - SIZE;
        const at = lines.map((words) => place(n, { kind: 'text', words, x: PAD + INDENT }))[0];
        const link: PageLink = { y: top, height: lines.length * LINE, target: 0 };
        pages.get(at)!.links.push(link);
        choices.set(link, { from: n, to: part[2] });
        pending.push({ link, to: part[2] });
        y += 2;
      } else if (kind === 'end') {
        y += 6;
        place(n, { kind: 'end', words: [{ text: content, italic: true }], x: WIDTH / 2 });
      } else if (kind === 'line') {
        y += 10;
        place(n, { kind: 'line', words: [{ text: content, italic: true }], x: WIDTH / 2 });
        y += 10;
      } else if (kind === 'fig') {
        // Un nombre gravé, en grand : de la place au-dessus et au-dessous.
        room(FIG_SIZE + 2 * LINE);
        y += FIG_SIZE - LINE + 10;
        place(n, { kind: 'fig', words: [{ text: content }], x: WIDTH / 2 });
        y += 20;
      } else {
        room(2 * LINE);
        y += 10;
        place(n, { kind: 'fin', words: [{ text: content }], x: WIDTH / 2 });
      }
    }
    y += PARAGRAPH_GAP;
  }
  for (const { link, to } of pending) link.target = starts.get(to) ?? FIRST_PAGE;
  return { pages, choices, starts, babelFirst: Math.min(page + 1, PAGES_PER_BOOK + 1) };
}

/** Met en page tout le livre, par petits morceaux entre deux images. */
export const layoutEndless = (context: CanvasRenderingContext2D, text: EndlessText): Promise<EndlessLayout> =>
  sliced(layoutSteps(context, text));
