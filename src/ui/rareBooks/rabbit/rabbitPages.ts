import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { CHAPTERS, CHAPTER_FIRST, CHAPTER_PAGES, INDEX_FIRST, chapterStart, platePage } from '../../../systems/rabbit';
import { FAINT, FELL, FELL_SC, INK, SOFT, fleuron, random, text } from './rabbitDraw';
import { paintPlate, romanNumeral } from './rabbitPlates';

/**
 * Les pages du « Lapin de garenne » (maquette .ai/maquette-lapin-pages.html) : papier crème, texte en IM Fell English,
 * justifié. Titre, mentions, avertissement de l'auteur (p. 3-4), table des matières (le signet), liste des planches ;
 * douze chapitres de 32 pages (l'ouverture à droite, avec sa lettrine, sa planche en face, puis le texte) ; la table
 * alphabétique jusqu'à la p. 409 ; Fin, p. 410. Mesures de la maquette (page 640 × 800, celle de la texture).
 */

const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;
const LEFT = 70;
const TEXT_WIDTH = W - 2 * LEFT;
const LINE = 27;
const BODY = `19px ${FELL}`;
/** La couleur de la lettrine. */
const DROP_INK = '#6b2a1a';

/** La page de la table des matières, où est glissé le signet. */
export const CONTENTS_PAGE = 5;

const texts = () => messages().rareBooks.rabbit;

/** Le grain du papier (le dégradé et l'ombre du pli sont ceux de preparePageTexture). */
const grain = (context: CanvasRenderingContext2D): void => {
  const next = random(3);
  for (let dot = 0; dot < 260; dot++) {
    context.fillStyle = `rgba(120,90,50,${0.05 * next()})`;
    context.fillRect(next() * W, next() * H, 2, 2);
  }
};

/** Un filet centré en (x, y), de `width` de long. */
const rule = (context: CanvasRenderingContext2D, x: number, y: number, width: number, color = INK): void => {
  context.fillStyle = color;
  context.fillRect(x - width / 2, y, width, 1);
};

const folio = (context: CanvasRenderingContext2D, page: number): void => text(context, String(page), W / 2, H - 42, `15px ${FELL}`, SOFT);

/** Lignes de `label` ; `width(n)` : la largeur de la ligne n (plus courte à côté de la lettrine). */
const wrap = (context: CanvasRenderingContext2D, label: string, width: (line: number) => number): string[] => {
  context.font = BODY;
  const out: string[] = [];
  let line = '';
  for (const word of label.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width(out.length)) {
      out.push(line);
      line = word;
    } else line = tried;
  }
  return line ? [...out, line] : out;
};

/** Une ligne justifiée (la dernière d'un paragraphe : au fer à gauche). */
const justified = (context: CanvasRenderingContext2D, line: string, x: number, y: number, width: number, last: boolean): void => {
  if (last) return text(context, line, x, y, BODY, INK, 'left');
  context.save();
  context.font = BODY;
  context.fillStyle = INK;
  context.textBaseline = 'alphabetic';
  const words = line.split(' ');
  const total = words.reduce((sum, word) => sum + context.measureText(word).width, 0);
  const gap = (width - total) / Math.max(1, words.length - 1);
  let cx = x;
  for (const word of words) {
    context.fillText(word, cx, y);
    cx += context.measureText(word).width + gap;
  }
  context.restore();
};

/**
 * Des paragraphes à la suite, chacun avec son alinéa, jusqu'à `bottom` ; `drop` : le premier commence à côté d'une
 * lettrine (ses trois premières lignes en retrait). Renvoie la ligne de base suivante.
 */
const flow = (context: CanvasRenderingContext2D, paragraphs: string[], y: number, bottom: number, drop = 0): number => {
  let baseline = y;
  for (const [index, paragraph] of paragraphs.entries()) {
    const inset = index === 0 ? drop : 0;
    const lines = wrap(context, (inset ? '' : ' ') + paragraph, (line) => TEXT_WIDTH - (inset && line < 3 ? inset : 0));
    for (const [line, row] of lines.entries()) {
      if (baseline > bottom) return baseline;
      const indent = inset && line < 3 ? inset : 0;
      justified(context, row, LEFT + indent, baseline, TEXT_WIDTH - indent, line === lines.length - 1);
      baseline += LINE;
    }
  }
  return baseline;
};

/** Le chapitre de la page `page` (dans les chapitres). */
const chapterOf = (page: number): number => Math.floor((page - CHAPTER_FIRST) / CHAPTER_PAGES);

const titlePage = (context: CanvasRenderingContext2D): void => {
  const book = texts();
  book.title.forEach((line, index) => text(context, line, W / 2, 170 + index * 64, `56px ${FELL_SC}`, INK, 'center', 4));
  rule(context, W / 2, 262, 140);
  text(context, book.sub, W / 2, 310, `italic 26px ${FELL}`, INK);
  text(context, book.by, W / 2, 380, `16px ${FELL_SC}`, SOFT, 'center', 4);
  text(context, book.author, W / 2, 416, `28px ${FELL_SC}`, INK, 'center', 4);
  text(context, book.role, W / 2, 446, `italic 18px ${FELL}`, SOFT);
  text(context, book.platesLine, W / 2, 520, `italic 18px ${FELL}`, INK);
  fleuron(context, W / 2, 590, 1.4, INK);
  text(context, book.mark, W / 2, 690, `16px ${FELL_SC}`, INK, 'center', 4);
  text(context, book.year, W / 2, 720, `16px ${FELL_SC}`, SOFT, 'center', 3);
};

const legalPage = (context: CanvasRenderingContext2D): void => {
  texts().pages.legal.forEach((line, index) => text(context, line, W / 2, 470 + index * 22, `italic 15px ${FELL}`, SOFT));
  folio(context, 2);
};

/** L'avertissement de l'auteur : son début page 3, sous le titre ; sa fin page 4, et ses initiales. */
const noticePage = (context: CanvasRenderingContext2D, page: number): void => {
  const pages = texts().pages;
  let y = 120;
  if (page === 3) {
    text(context, pages.noticeTitle, W / 2, 140, `22px ${FELL_SC}`, INK, 'center', 4);
    rule(context, W / 2, 160, 60);
    y = 220;
  }
  y = flow(context, page === 3 ? pages.notice : pages.noticeMore, y, 720);
  if (page === 4) text(context, pages.noticeBy, W - LEFT, y + 20, `italic 19px ${FELL}`, INK, 'right');
  folio(context, page);
};

/** La table des matières : avertissement, planches, les douze chapitres (numéro romain), la table alphabétique. */
export const CONTENTS_TOP = 190;
export const CONTENTS_ROW = 36;
/** Les pages des lignes de la table des matières, dans l'ordre. */
export const contentsTargets = (): number[] => [
  3,
  PLATES_PAGE,
  ...Array.from({ length: CHAPTERS }, (_, chapter) => chapterStart(chapter)),
  INDEX_FIRST,
];

const contentsPage = (context: CanvasRenderingContext2D): void => {
  const pages = texts().pages;
  text(context, pages.contents, W / 2, 110, `22px ${FELL_SC}`, INK, 'center', 4);
  rule(context, W / 2, 130, 60);
  const names = [pages.contentsNotice, pages.contentsPlates, ...pages.chapters.map((chapter) => chapter.name), pages.contentsIndex];
  const targets = contentsTargets();
  names.forEach((name, row) => {
    const y = CONTENTS_TOP + row * CONTENTS_ROW;
    const chapter = row - 2;
    if (chapter >= 0 && chapter < CHAPTERS) text(context, `${romanNumeral(chapter)}.`, LEFT + 34, y, `17px ${FELL}`, INK, 'right');
    text(context, name, LEFT + 46, y, `18px ${FELL}`, INK, 'left');
    context.font = `18px ${FELL}`;
    context.fillStyle = FAINT;
    for (let dot = LEFT + 56 + context.measureText(name).width; dot < W - LEFT - 40; dot += 8) context.fillRect(dot, y - 4, 1.5, 1.5);
    text(context, String(targets[row]), W - LEFT, y, `17px ${FELL}`, INK, 'right');
  });
  folio(context, CONTENTS_PAGE);
};

/** La liste des planches : chaque ligne mène à sa planche. */
export const PLATES_PAGE = 6;
export const PLATES_TOP = 200;
export const PLATES_ROW = 38;

const platesListPage = (context: CanvasRenderingContext2D): void => {
  const pages = texts().pages;
  text(context, pages.platesList, W / 2, 110, `22px ${FELL_SC}`, INK, 'center', 4);
  rule(context, W / 2, 130, 60);
  pages.plates.forEach((name, chapter) => {
    const y = PLATES_TOP + chapter * PLATES_ROW;
    text(context, `${romanNumeral(chapter)}.`, LEFT + 40, y, `17px ${FELL}`, INK, 'right');
    text(context, name, LEFT + 54, y, `italic 18px ${FELL}`, INK, 'left');
    text(context, `p. ${platePage(chapter)}`, W - LEFT, y, `16px ${FELL}`, SOFT, 'right');
  });
  folio(context, PLATES_PAGE);
};

/** L'ouverture d'un chapitre : son numéro, son titre, un fleuron, la lettrine, son texte puis la suite. */
const openerPage = (context: CanvasRenderingContext2D, chapter: number): void => {
  const pages = texts().pages;
  const { name, text: body } = pages.chapters[chapter];
  text(context, `${pages.chapter} ${pages.ordinals[chapter]}.`, W / 2, 170, `17px ${FELL_SC}`, SOFT, 'center', 4);
  text(context, `${name.toUpperCase()}.`, W / 2, 214, `24px ${FELL_SC}`, INK, 'center', 2);
  fleuron(context, W / 2, 248, 1, INK);
  const top = 320;
  text(context, body.charAt(0), LEFT - 4, top + 2 * LINE - 2, `92px ${FELL}`, DROP_INK, 'left');
  const more = [0, 3, 5].map((shift) => pages.pool[(chapter + shift) % pages.pool.length]);
  flow(context, [body.slice(1), ...more], top, 730, 64);
  folio(context, chapterStart(chapter));
};

/** Une page du texte : le titre courant, puis des paragraphes tirés de la page (jamais deux fois de suite le même). */
const bodyPage = (context: CanvasRenderingContext2D, page: number): void => {
  const pages = texts().pages;
  const pool = pages.pool;
  text(
    context,
    page % 2 ? pages.chapters[chapterOf(page)].name.toUpperCase() : pages.running,
    W / 2,
    56,
    `14px ${FELL_SC}`,
    SOFT,
    'center',
    2,
  );
  rule(context, W / 2, 68, TEXT_WIDTH, FAINT);
  const next = random(page * 7919 + 1);
  const paragraphs: string[] = [];
  for (let k = 0, last = -1; k < 10; k++) {
    let pick = Math.floor(next() * (pool.length - 1));
    if (pick >= last) pick++;
    if (last < 0) pick = Math.floor(next() * pool.length);
    paragraphs.push(pool[pick]);
    last = pick;
  }
  // La page commence au milieu d'un paragraphe : on saute ses premiers mots, sans alinéa.
  const words = paragraphs[0].split(' ');
  const lines = wrap(context, words.slice(Math.floor(next() * words.length * 0.6)).join(' '), () => TEXT_WIDTH);
  let y = 112;
  lines.forEach((line, index) => {
    justified(context, line, LEFT, y, TEXT_WIDTH, index === lines.length - 1);
    y += LINE;
  });
  flow(context, paragraphs.slice(1), y, 730);
  folio(context, page);
};

/** La table alphabétique : sa première page en entier, puis ses entrées qui reviennent, en deux colonnes. */
const indexPage = (context: CanvasRenderingContext2D, page: number): void => {
  const pages = texts().pages;
  let y = 112;
  if (page === INDEX_FIRST) {
    text(context, pages.index, W / 2, 130, `22px ${FELL_SC}`, INK, 'center', 4);
    rule(context, W / 2, 150, 60);
    y = 210;
  }
  const next = random(page * 31);
  const entries = pages.indexEntries as [string, number][];
  const list = page === INDEX_FIRST ? entries : Array.from({ length: 22 }, () => entries[Math.floor(next() * entries.length)]);
  const column = (TEXT_WIDTH - 30) / 2;
  const half = Math.ceil(list.length / 2);
  list.forEach(([name, target], index) => {
    const second = index >= half;
    const x = LEFT + (second ? column + 30 : 0);
    const line = y + (second ? index - half : index) * 24;
    if (line > 730) return;
    text(context, name, x, line, `15px ${FELL}`, INK, 'left');
    if (target) text(context, String(target), x + column, line, `15px ${FELL}`, SOFT, 'right');
  });
  folio(context, page);
};

const lastPage = (context: CanvasRenderingContext2D): void => {
  const pages = texts().pages;
  text(context, pages.end, W / 2, 360, `30px ${FELL_SC}`, INK, 'center', 8);
  fleuron(context, W / 2, 400, 1.6, INK);
  text(context, pages.endSmall, W / 2, 700, `italic 15px ${FELL}`, SOFT);
};

/** Dessine la page `page` ; `home` : le lapin est rentré dans ses planches. */
export const paintRabbitPage = (context: CanvasRenderingContext2D, page: number, home: boolean): void => {
  context.textBaseline = 'alphabetic';
  grain(context);
  if (page === 1) return titlePage(context);
  if (page === 2) return legalPage(context);
  if (page === 3 || page === 4) return noticePage(context, page);
  if (page === CONTENTS_PAGE) return contentsPage(context);
  if (page === PLATES_PAGE) return platesListPage(context);
  if (page < INDEX_FIRST) {
    const chapter = chapterOf(page);
    const step = (page - CHAPTER_FIRST) % CHAPTER_PAGES;
    if (step === 0) return openerPage(context, chapter);
    if (step === 1) return paintPlate(context, chapter, home);
    return bodyPage(context, page);
  }
  if (page < PAGES_PER_BOOK) return indexPage(context, page);
  if (page === PAGES_PER_BOOK) lastPage(context);
};
