import { hashText, seeded } from '../../../core/random';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER } from '../draw';
import { ARTICLES, CONTENTS_PAGE, DISCOURS, DROP, type EncyclopediaLayout, type PlacedLine } from './encyclopediaLayout';
import { CANON, FELL } from './encyclopediaFonts';
import { engravedInitial, headpiece, vignette } from './encyclopediaOrnaments';
import { canonFont, oldRoman, runFont, spaceWidth, wordWidth } from './encyclopediaText';
import type { Paper } from '../../book/pageRender';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages de l'Encyclopédie, d'après .ai/maquette-encyclopedie.html (y : lignes de base) : la page de titre de
 * 1751 en rouge et noir, la table des articles, l'ouverture du Discours préliminaire (bandeau gravé, lettrine), ses pages à titre courant
 * et folio en chiffres romains ; les articles sur deux colonnes (les trois lettres et le numéro de chaque colonne
 * en tête, un filet entre elles) ; le papier vergé.
 */
export const PAPER: Paper = ['#f2ead4', '#e9ddc0', '#e0d0ac'];
export const INK = '#1d1813';
const RUBRIC = '#a3261b';
const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;

const print = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color = INK,
  align: CanvasTextAlign = 'center',
  spacing = 0,
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Le papier vergé de la maquette : les vergeures, les pontuseaux, le grain, des rousseurs (les mêmes pour une page). */
export const laidPaper = (context: CanvasRenderingContext2D, page: number): void => {
  context.fillStyle = 'rgba(120,95,50,0.035)';
  for (let y = 0; y < HEIGHT; y += 4) context.fillRect(0, y, WIDTH, 1);
  context.fillStyle = 'rgba(120,95,50,0.05)';
  for (let x = 30; x < WIDTH; x += 92) context.fillRect(x, 0, 1.5, HEIGHT);
  const random = seeded(hashText(`encyclopedia:paper:${page}`));
  for (let speck = 0; speck < (WIDTH * HEIGHT) / 120; speck++) {
    context.fillStyle = `rgba(110,80,30,${random() * 0.07})`;
    context.fillRect(random() * WIDTH, random() * HEIGHT, 1.5, 1.5);
  }
  for (let spot = 0; spot < 16; spot++) {
    context.fillStyle = `rgba(150,100,40,${0.05 + random() * 0.08})`;
    context.beginPath();
    context.arc(random() * WIDTH, random() * HEIGHT, 1 + random() * 3.5, 0, Math.PI * 2);
    context.fill();
  }
};

/** Les sortes de lignes de la page de titre : [police, taille, espacement, rouge]. */
const TITLE_FONTS: Record<string, [string, number, number, boolean]> = {
  title: [CANON, 44, 3, true],
  or: [CANON, 13, 2, false],
  dictionary: [CANON, 25, 1.5, false],
  sciences: [CANON, 21, 2, true],
  arts: [FELL, 16, 2, false],
  society: [FELL, 13, 1.5, true],
  editors: [FELL, 12, 0, false],
  motto: [`italic ${FELL}`, 12.5, 0, false],
  volume: [CANON, 17, 3, true],
  city: [CANON, 20, 4, true],
  booksellers: [FELL, 12.5, 0.5, false],
  year: [CANON, 16, 3, true],
  privilege: [FELL, 11, 1.5, false],
};

/** La page de titre du tome I (Paris, 1751), en rouge et noir, sa vignette au soleil. */
export const encyclopediaTitlePage = (context: CanvasRenderingContext2D): void => {
  for (const [y, kind, text] of messages().rareBooks.encyclopedia.titlePage as [number, string, string][]) {
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - Number(text), y, 2 * Number(text), 1.3);
    } else if (kind === 'vignette') vignette(context, PAGE_CENTER, y, INK);
    else {
      const [family, size, spacing, red] = TITLE_FONTS[kind];
      const [style, name] = family.startsWith('italic ') ? ['italic ', family.slice(7)] : ['', family];
      print(context, text, PAGE_CENTER, y, `${style}${size}px ${name}`, red ? RUBRIC : INK, 'center', spacing);
    }
  }
};

/** Une ligne de texte : ses mots dans leurs styles, étalés sur `justify` si elle est justifiée. */
const paintLine = (context: CanvasRenderingContext2D, { words, x, y, justify }: PlacedLine, size: number): void => {
  const widths = words.map((word) => wordWidth(context, word, size));
  const space = spaceWidth(context, size);
  const gap = justify && words.length > 1 ? (justify - widths.reduce((sum, width) => sum + width, 0)) / (words.length - 1) : space;
  let at = x;
  for (const [index, word] of words.entries()) {
    let run = at;
    for (const piece of word) {
      const font = runFont(piece, size);
      print(context, piece.text, run, y, font, INK, 'left');
      context.font = font;
      run += context.measureText(piece.text).width;
    }
    at += widths[index] + gap;
  }
};

/** L'ouverture du Discours : le bandeau gravé, le titre, un filet. */
const discoursHead = (context: CanvasRenderingContext2D): void => {
  const [title, editors] = messages().rareBooks.encyclopedia.discours.title as string[];
  headpiece(context, 64, 96, WIDTH - 96, INK, PAPER[0]);
  print(context, title, PAGE_CENTER, 182, canonFont(26), INK, 'center', 3);
  print(context, editors, PAGE_CENTER, 212, canonFont(16), INK, 'center', 3);
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 50, 236, 100, 1);
};

/** L'ouverture des articles : le bandeau gravé, le titre de l'ouvrage, un filet. */
const articlesHead = (context: CanvasRenderingContext2D): void => {
  const [title, dictionary, sciences] = messages().rareBooks.encyclopedia.dictionary as string[];
  headpiece(context, 64, 96, WIDTH - 96, INK, PAPER[0]);
  print(context, title, PAGE_CENTER, 170, canonFont(30), INK, 'center', 4);
  print(context, dictionary, PAGE_CENTER, 194, `14px ${FELL}`, INK, 'center', 2);
  print(context, sciences, PAGE_CENTER, 214, `14px ${FELL}`, INK, 'center', 2);
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 40, 226, 80, 1);
};

/** Le haut d'une page du Discours : son titre courant au milieu, le folio en chiffres romains dans le coin extérieur. */
const discoursRunning = (context: CanvasRenderingContext2D, page: number, folio: number): void => {
  const outer = page % 2 === 0;
  print(context, messages().rareBooks.encyclopedia.discours.running, PAGE_CENTER, 62, `15px ${FELL}`, INK, 'center', 3);
  print(context, oldRoman(folio), outer ? DISCOURS.left : DISCOURS.right, 62, `15px ${FELL}`, INK, outer ? 'left' : 'right');
  context.fillStyle = INK;
  context.fillRect(DISCOURS.left, 72, DISCOURS.right - DISCOURS.left, 1.2);
};

/** Le haut d'une page d'articles : le numéro des deux colonnes aux bords, leurs trois lettres au-dessus d'elles, un filet. */
const articlesRunning = (context: CanvasRenderingContext2D, folio: number, guides: string[]): void => {
  const [left, right] = [ARTICLES.columns[0][0], ARTICLES.columns[1][1]];
  print(context, String(folio), left, 62, `15px ${FELL}`, INK, 'left');
  print(context, String(folio + 1), right, 62, `15px ${FELL}`, INK, 'right');
  for (const [column, [x0, x1]] of ARTICLES.columns.entries())
    if (guides[column]) print(context, guides[column], (x0 + x1) / 2, 62, `15px ${FELL}`, INK, 'center', 3);
  context.fillStyle = INK;
  context.fillRect(left, 72, right - left, 1.2);
};

/** La table : le Discours et les articles, des points de conduite, et en face sa page ou sa colonne. */
const CONTENTS = { top: 170, step: 18 };
const contentsPage = (context: CanvasRenderingContext2D, layout: EncyclopediaLayout): void => {
  print(context, messages().rareBooks.encyclopedia.contents, PAGE_CENTER, 110, canonFont(22), INK, 'center', 3);
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 40, 128, 80, 1);
  for (const [row, { title, at }] of layout.entries.entries()) {
    const y = CONTENTS.top + row * CONTENTS.step;
    const font = row === 0 ? `italic 14px ${FELL}` : `14px ${FELL}`;
    print(context, title, DISCOURS.left, y, font, INK, 'left', row === 0 ? 0 : 1);
    context.font = font;
    context.letterSpacing = row === 0 ? '0px' : '1px';
    const width = context.measureText(title).width;
    context.letterSpacing = '0px';
    print(context, at, DISCOURS.right, y, `14px ${FELL}`, INK, 'right');
    context.fillStyle = '#a89878';
    for (let dot = DISCOURS.left + width + 10; dot < DISCOURS.right - 30; dot += 8) context.fillRect(dot, y - 3, 1.5, 1.5);
  }
};

/** Une page du livre après la page de titre ; false : rien n'y est imprimé. */
export const paintEncyclopediaPage = (context: CanvasRenderingContext2D, page: number, layout: EncyclopediaLayout): boolean => {
  if (page === CONTENTS_PAGE) {
    contentsPage(context, layout);
    return true;
  }
  const content = layout.pages.get(page);
  if (!content) return false;
  const discours = content.part === 'discours';
  if (discours) {
    if (content.opening) discoursHead(context);
    else discoursRunning(context, page, content.folio);
    if (content.dropCap) {
      const { letter, x, y } = content.dropCap;
      engravedInitial(context, letter, x, y, DROP.size, CANON, INK, PAPER[0]);
    }
  } else {
    if (content.opening) articlesHead(context);
    else articlesRunning(context, content.folio, content.guides);
    // Le filet entre les deux colonnes.
    const top = (content.opening ? ARTICLES.opening : ARTICLES.first) - 14;
    context.fillStyle = INK;
    context.fillRect(PAGE_CENTER - 0.4, top, 0.8, HEIGHT - 54 - top);
  }
  const size = discours ? DISCOURS.size : ARTICLES.size;
  for (const line of content.lines) paintLine(context, line, size);
  return true;
};

/** Les lignes de la table : un clic mène au Discours ou à l'article. */
export const encyclopediaLinks = (page: number, layout: EncyclopediaLayout | null): PageLink[] => {
  if (!layout || page !== CONTENTS_PAGE) return [];
  return layout.entries.map(({ page: target }, row) => ({
    y: CONTENTS.top + row * CONTENTS.step - 14,
    height: CONTENTS.step,
    target,
  }));
};
