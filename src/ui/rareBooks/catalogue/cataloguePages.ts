import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { coverDesign } from '../../../systems/coverDesign';
import {
  LAST_ROWS,
  REGISTER_PAGE,
  RUSSELL_AFTER,
  RUSSELL_PAGE,
  RUSSELL_ROWS,
  catalogueIndex,
  catalogueRares,
  firstOn,
  rowsOn,
} from '../../../systems/catalogue';
import { FELL, FELL_SC, GARA, INK, RUBRIC, fleuron, pencil, rng, rule, text, width, type Context } from './catalogueDraw';
import type { GameState } from '../../../core/state';

/**
 * Les pages du Catalogue des catalogues (maquette .ai/maquette-catalogue-pages.html) : un registre imprimé,
 * papier ivoire, encre noire, rubriques rouges. Page 1 : le titre, qui se contient ; 2 : l'avertissement ;
 * 3 à 410 : les livres qui suivent celui où on l'a trouvé, un par ligne, comme sur leur couverture
 * (systems/catalogue.ts). Un lecteur venu avant a laissé des notes au crayon.
 */

const { width: W, height: H } = PAGE_TEXTURE;
const text_ = () => messages().rareBooks.catalogue;

/** Papier ivoire, plus sombre vers le pli. */
const paper = (context: Context, seed: number, spineOnLeft: boolean): void => {
  const g = context.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.85);
  g.addColorStop(0, '#f2ecdb');
  g.addColorStop(1, '#ddd2b6');
  context.fillStyle = g;
  context.fillRect(0, 0, W, H);
  const random = rng(seed);
  for (let i = 0; i < 900; i++) {
    context.fillStyle = `rgba(120,95,55,${0.03 + random() * 0.05})`;
    context.fillRect(random() * W, random() * H, 1, 1);
  }
  const fold = context.createLinearGradient(spineOnLeft ? 0 : W, 0, spineOnLeft ? 60 : W - 60, 0);
  fold.addColorStop(0, 'rgba(90,70,40,0.22)');
  fold.addColorStop(1, 'rgba(90,70,40,0)');
  context.fillStyle = fold;
  context.fillRect(spineOnLeft ? 0 : W - 60, 0, 60, H);
};

/** Un losange entre deux filets (celui des pages). */
const ornament = (context: Context, x: number, y: number, color = INK): void => {
  fleuron(context, x, y, color);
  context.fillRect(x - 56, y - 0.6, 42, 1.2);
  context.fillRect(x + 14, y - 0.6, 42, 1.2);
};

// ---------- Page 1 · le titre, qui se contient ----------
const FRAME = { x: 170, y: 268, w: 300, h: 375 };
const DEPTH = 7;

const titlePage = (context: Context, depth = 0): void => {
  const t = text_().titlePage;
  paper(context, 7, true);
  rule(context, 60, W - 60, 60, 2);
  rule(context, 60, W - 60, 66, 0.8);
  rule(context, 60, W - 60, H - 66, 0.8);
  rule(context, 60, W - 60, H - 60, 2);
  text(context, t.library, W / 2, 112, `500 18px ${GARA}`, INK, 'center', 6);
  text(context, t.title, W / 2, 182, `600 50px ${GARA}`, INK, 'center', 5);
  text(context, t.subtitle, W / 2, 228, `italic 500 34px ${GARA}`, RUBRIC);
  if (depth < DEPTH) {
    context.save();
    context.beginPath();
    context.rect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    context.clip();
    context.translate(FRAME.x, FRAME.y);
    context.scale(FRAME.w / W, FRAME.h / H);
    titlePage(context, depth + 1);
    context.restore();
  } else {
    context.fillStyle = INK;
    context.fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
  }
  context.strokeStyle = INK;
  context.lineWidth = 2.5;
  context.strokeRect(FRAME.x - 6, FRAME.y - 6, FRAME.w + 12, FRAME.h + 12);
  context.lineWidth = 0.8;
  context.strokeRect(FRAME.x - 11, FRAME.y - 11, FRAME.w + 22, FRAME.h + 22);
  text(context, t.edition, W / 2, 700, `italic 500 24px ${GARA}`);
  // Le point d'interrogation au crayon, juste après « Édition fidèle ».
  if (depth === 0) pencil(context, text_().pencil.edition, W / 2 + width(context, t.edition, `italic 500 24px ${GARA}`) / 2 + 12, 702, 34, 0.1);
};

// ---------- Page 2 · l'avertissement ----------
const noticePage = (context: Context): void => {
  const notice = text_().notice;
  paper(context, 8, false);
  text(context, notice.heading, W / 2 - 10, 170, `500 22px ${FELL_SC}`, RUBRIC, 'center', 4);
  ornament(context, W / 2 - 10, 200);
  let y = 268;
  for (const lines of notice.paragraphs) {
    for (const line of lines) {
      text(context, line, W / 2 - 10, y, `italic 24px ${FELL}`);
      y += 38;
    }
    y += 16;
  }
};

// ---------- Le registre ----------
/** Les colonnes, depuis le bord intérieur du bloc de texte. */
const COLS = { no: 64, title: 78, wall: 450, shelf: 490, vol: 532 };
const ROW = 27;
const TOP = 152;
const ROMAN = `19px ${FELL}`;
const ITALIC = `italic 19px ${FELL}`;
const NUMS = `17px ${FELL}`;
/** Le titre s'arrête avant les points de conduite et la cote. */
const TITLE_END = COLS.wall - 40;

type Words = [word: string, sensible: boolean][];
type Mark = { wall: number; shelf: number; volume: number };

const frame = (spineOnLeft: boolean): number => (spineOnLeft ? 66 : 42);
const group = (state: GameState, n: number): string => new Intl.NumberFormat(state.locale).format(n);
const pickFrom = <T>(list: readonly T[], pick: number): T => list[Math.floor(pick * list.length)];

/** Le titre du livre n° `index`, comme sur sa couverture : les mots sensés à part (en romain). */
const bookTitle = (index: number, rare: string | undefined): Words => {
  if (rare) return [[(messages().rareBooks as Record<string, { name: string }>)[rare]?.name ?? rare, true]];
  const design = coverDesign(index);
  const { words, titles } = messages().covers;
  const { kind, slot, pick } = design.sense;
  if (kind === 'title') return [[pickFrom(titles, pick).join(' '), true]];
  return design.title.map((word, i) => (kind === 'word' && i === slot ? [pickFrom(words, pick), true] : [word, false]));
};

const head = (context: Context, state: GameState, x: number, spineOnLeft: boolean, page: number): void => {
  const right = x + COLS.vol;
  const first = firstOn(catalogueIndex(state), page);
  const range = text_().range.replace('{from}', group(state, first)).replace('{to}', group(state, first + rowsOn(page) - 1));
  if (spineOnLeft) text(context, range, right, 70, `italic 19px ${FELL}`, INK, 'right');
  else text(context, text_().runningHead, x, 70, `17px ${FELL_SC}`, INK, 'left', 2);
  rule(context, x, right, 82, 0.8);
  folio(context, x, spineOnLeft, page);
};

const folio = (context: Context, x: number, spineOnLeft: boolean, page: number): void =>
  text(context, String(page), spineOnLeft ? x + COLS.vol : x, H - 52, `19px ${FELL}`, INK, spineOnLeft ? 'right' : 'left');

const columns = (context: Context, x: number, y: number): void => {
  const font = `13px ${FELL_SC}`;
  const c = text_().columns;
  text(context, c.no, x + COLS.no, y, font, RUBRIC, 'right', 1);
  text(context, c.title, x + COLS.title, y, font, RUBRIC, 'left', 1);
  text(context, c.wall, x + COLS.wall, y, font, RUBRIC, 'right', 1);
  text(context, c.shelf, x + COLS.shelf, y, font, RUBRIC, 'right', 1);
  text(context, c.volume, x + COLS.vol, y, font, RUBRIC, 'right', 1);
  rule(context, x, x + COLS.vol, y + 9, 1.4, RUBRIC);
  rule(context, x, x + COLS.vol, y + 13, 0.6, RUBRIC);
};

/** Une ligne : numéro, titre, points de conduite, cote. Rend le bout du titre. */
const entry = (context: Context, state: GameState, x: number, y: number, n: number | null, words: Words, mark: Mark | null, color = INK): number => {
  if (n !== null) text(context, `${group(state, n)}.`, x + COLS.no, y, NUMS, color, 'right');
  let cx = x + COLS.title;
  for (const [i, [word, sensible]] of words.entries()) {
    const font = sensible ? ROMAN : ITALIC;
    let piece = (i ? ' ' : '') + word;
    // Un titre trop long (jamais vu, mais une langue peut l'allonger) : coupé, avec des points.
    if (cx + width(context, piece, font) > x + TITLE_END) {
      while (piece.length > 1 && cx + width(context, `${piece}…`, font) > x + TITLE_END) piece = piece.slice(0, -1);
      piece = `${piece.trimEnd()}…`;
      text(context, piece, cx, y, font, color, 'left');
      cx += width(context, piece, font);
      break;
    }
    text(context, piece, cx, y, font, color, 'left');
    cx += width(context, piece, font);
  }
  if (mark) {
    context.fillStyle = color;
    for (let px = cx + 10; px < x + COLS.wall - 22; px += 9) context.fillRect(px, y - 4, 1.6, 1.6);
    text(context, String(mark.wall), x + COLS.wall, y, NUMS, color, 'right');
    text(context, String(mark.shelf), x + COLS.shelf, y, NUMS, color, 'right');
    text(context, String(mark.volume), x + COLS.vol, y, NUMS, color, 'right');
  }
  return cx;
};

const book = (context: Context, state: GameState, x: number, y: number, index: number, rares: Map<number, string>): number =>
  entry(context, state, x, y, index, bookTitle(index, rares.get(index)), coverDesign(index).shelfMark);

/** Les livres `from` à `to` (non compris) de la page, sur les lignes `row`… */
const books = (context: Context, state: GameState, x: number, page: number, from: number, to: number, row: number, top = TOP): void => {
  const rares = catalogueRares(state);
  const first = firstOn(catalogueIndex(state), page);
  for (let i = from; i < to; i++) book(context, state, x, top + (row + i - from) * ROW, first + i, rares);
};

const firstPage = (context: Context, state: GameState): void => {
  paper(context, REGISTER_PAGE, true);
  const x = frame(true);
  const found = catalogueIndex(state);
  text(context, text_().register, W / 2 + 12, 112, `500 22px ${FELL_SC}`, RUBRIC, 'center', 5);
  ornament(context, W / 2 + 12, 136, RUBRIC);
  folio(context, x, true, REGISTER_PAGE);
  columns(context, x, TOP + 6);
  // La première ligne : lui-même, avec la cote du livre où il a été trouvé.
  entry(context, state, x, TOP + 44, found, [[messages().rareBooks.catalogue.name, true]], coverDesign(found).shelfMark, RUBRIC);
  books(context, state, x, REGISTER_PAGE, 1, rowsOn(REGISTER_PAGE), 0, TOP + 44 + ROW);
  pencil(context, text_().pencil.first, x + 40, H - 46, 26, -0.03);
};

/** Le crayon d'une page du registre : une page sur douze, « faux » ; une sur six, une ou deux coches. */
const pencilMarks = (context: Context, x: number, page: number): void => {
  const random = rng(page * 4099 + 1);
  const roll = random();
  if (roll < 1 / 12) pencil(context, text_().pencil.wrong, x + COLS.vol + 8, TOP + Math.floor(random() * 20) * ROW + 4, 22, -0.25);
  else if (roll < 1 / 4)
    for (let i = 0; i < 1 + Math.floor(random() * 2); i++) pencil(context, '✓', x + COLS.vol + 10, TOP + Math.floor(random() * 20) * ROW + 2, 24);
};

const registerPage = (context: Context, state: GameState, page: number, spineOnLeft: boolean): void => {
  paper(context, page, spineOnLeft);
  const x = frame(spineOnLeft);
  head(context, state, x, spineOnLeft, page);
  columns(context, x, TOP - 38);
  books(context, state, x, page, 0, rowsOn(page), 0);
  pencilMarks(context, x, page);
};

const russellPage = (context: Context, state: GameState, spineOnLeft: boolean): void => {
  const page = RUSSELL_PAGE;
  const x = frame(spineOnLeft);
  const [line1, line2] = text_().russell;
  paper(context, page, spineOnLeft);
  head(context, state, x, spineOnLeft, page);
  columns(context, x, TOP - 38);
  books(context, state, x, page, 0, RUSSELL_AFTER, 0);
  // Entre deux livres, sans numéro : imprimée, barrée, réimprimée, barrée, réimprimée.
  const y = TOP + RUSSELL_AFTER * ROW;
  for (let k = 0; k < 3; k++) {
    const yy = y + k * 2 * ROW;
    text(context, line1, x + COLS.title, yy, ROMAN, INK, 'left');
    const end = entry(context, state, x, yy + ROW, null, [[line2, true]], null);
    if (k < 2) {
      rule(context, x + COLS.title - 2, x + COLS.title + width(context, line1, ROMAN) + 2, yy - 6, 1.6);
      rule(context, x + COLS.title - 2, end + 2, yy + ROW - 6, 1.6);
    }
  }
  const [ask, answer] = text_().pencil.russell;
  pencil(context, ask, x + 110, y + 6 * ROW + 6, 26, -0.03);
  pencil(context, answer, x + 150, y + 7 * ROW + 16, 26, -0.03);
  books(context, state, x, page, RUSSELL_AFTER, rowsOn(page), RUSSELL_AFTER + RUSSELL_ROWS);
};

const lastPage = (context: Context, state: GameState, spineOnLeft: boolean): void => {
  const page = PAGES_PER_BOOK;
  const x = frame(spineOnLeft);
  const end = text_().end;
  paper(context, page, spineOnLeft);
  head(context, state, x, spineOnLeft, page);
  columns(context, x, TOP - 38);
  books(context, state, x, page, 0, LAST_ROWS, 0);
  // La fin du registre, puis sa propre entrée, qui renvoie au début.
  const y = TOP + LAST_ROWS * ROW;
  const mid = x + COLS.vol / 2;
  ornament(context, mid, y + 18);
  text(context, end.title, mid, y + 74, `italic 26px ${FELL}`, RUBRIC);
  text(context, end.see, mid, y + 108, `22px ${FELL}`, RUBRIC);
  pencil(context, text_().pencil.last, mid + 40, y + 160, 30, -0.06);
  text(context, end.close, mid, H - 120, `16px ${FELL_SC}`, INK, 'center', 4);
};

/** Dessine la page `page` (1 : le titre, page de droite). */
export const paintCataloguePage = (context: Context, page: number, spineOnLeft: boolean, state: GameState): void => {
  if (page === 1) titlePage(context);
  else if (page === 2) noticePage(context);
  else if (page === REGISTER_PAGE) firstPage(context, state);
  else if (page === RUSSELL_PAGE) russellPage(context, state, spineOnLeft);
  else if (page === PAGES_PER_BOOK) lastPage(context, state, spineOnLeft);
  else registerPage(context, state, page, spineOnLeft);
};
