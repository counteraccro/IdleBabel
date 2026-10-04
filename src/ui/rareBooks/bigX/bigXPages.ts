import '@fontsource/cormorant-garamond/500.css';
import { messages } from '../../../i18n';
import { GARA, rng, text, type Context } from '../sand/sandDraw';
import { INK, PLAY, RED } from './bigXCover';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages du grand livre du X (maquette .ai/maquette-grand-livre-x-pages.html) : un beau livre d'aujourd'hui,
 * titre, mentions, préface, sommaire, puis douze chapitres. Chacun s'ouvre sur une histoire vraie du X qui
 * passe en x, et la suite est en langue X : du lorem ipsum dont chaque lettre est devenue un x. Page 205, un
 * seul y (le sceau secret). Mesures de la maquette (pages 640 × 800, celles des textures).
 */

const [W, H] = [640, 800];
const FADED = 'rgba(28,26,23,0.55)';
/** La colonne de texte. */
const COL = { x: 78, w: W - 156, top: 108, bottom: 712 };
const BODY = `500 22px ${GARA}`;
const LINE = 32;
const INDENT = 26;

export const CONTENTS_PAGE = 4;
/** La page du y. */
export const Y_PAGE = 205;
const LAST_PAGE = 410;
const FIRST_CHAPTER = 5;
const CHAPTER_PAGES = 34;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const chapterPage = (index: number): number => FIRST_CHAPTER + index * CHAPTER_PAGES;
const chapterOf = (page: number): number => Math.min(ROMAN.length - 1, Math.floor((page - FIRST_CHAPTER) / CHAPTER_PAGES));

const texts = () => messages().rareBooks.bigX;

export const loadBigXPageFonts = (): Promise<unknown> =>
  Promise.all([BODY, `600 24px ${GARA}`, `italic 500 34px ${GARA}`, `900 72px ${PLAY}`].map((font) => document.fonts.load(font)));

// ---------- La langue X ----------

const LOREM =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(
    ' ',
  );

/** Du lorem ipsum, phrases et paragraphes (toujours les mêmes pour `seed`), chaque lettre devenue x. */
export const xParagraphs = (seed: number, count: number): string[] => {
  const random = rng(seed);
  const paragraphs: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentences: string[] = [];
    for (let s = 0, n = 3 + Math.floor(random() * 4); s < n; s++) {
      const words: string[] = [];
      for (let w = 0, m = 6 + Math.floor(random() * 12); w < m; w++) {
        let word = LOREM[Math.floor(random() * LOREM.length)];
        if (w === 0) word = word[0].toUpperCase() + word.slice(1);
        if (w > 2 && w < m - 2 && random() < 0.1) word += ',';
        words.push(word);
      }
      sentences.push(words.join(' ') + (random() < 0.08 ? ' ?' : random() < 0.15 ? ' :' : '.'));
    }
    paragraphs.push(sentences.join(' ').replace(/ :$/, '.').replace(/[a-z]/g, 'x').replace(/[A-Z]/g, 'X'));
  }
  return paragraphs;
};

// ---------- Mise en page ----------

interface Line {
  words: string[];
  inset: number;
  width: number;
  last: boolean;
}
interface Placed {
  word: string;
  x: number;
  y: number;
  width: number;
}

/** Lignes justifiées d'une suite de paragraphes ; `first` : la place de la lettrine sur les premières lignes. */
const layout = (context: Context, paragraphs: string[], first?: { lines: number; width: number }): Line[] => {
  context.save();
  context.font = BODY;
  context.letterSpacing = '0px';
  const lines: Line[] = [];
  paragraphs.forEach((paragraph, p) => {
    let line: string[] = [];
    let index = 0;
    const inset = (): number => (index === 0 && p > 0 ? INDENT : 0) + (first && p === 0 && index < first.lines ? first.width : 0);
    const push = (last: boolean): void => {
      lines.push({ words: line, inset: inset(), width: COL.w - inset(), last });
      line = [];
      index++;
    };
    for (const word of paragraph.split(' ')) {
      if (line.length && context.measureText([...line, word].join(' ')).width > COL.w - inset()) push(false);
      line.push(word);
    }
    push(true);
  });
  context.restore();
  return lines;
};

/** Où tombe chaque mot des lignes, justifiées sauf la dernière de chaque paragraphe, de `y` à `maxY`. */
const place = (context: Context, lines: Line[], y: number, maxY: number): Placed[] => {
  context.save();
  context.font = BODY;
  context.letterSpacing = '0px';
  const placed: Placed[] = [];
  for (const line of lines) {
    if (y > maxY) break;
    const widths = line.words.map((word) => context.measureText(word).width);
    const natural = widths.reduce((a, b) => a + b, 0);
    const gap = line.last || line.words.length < 2 ? context.measureText(' ').width : (line.width - natural) / (line.words.length - 1);
    let x = COL.x + line.inset;
    line.words.forEach((word, i) => {
      placed.push({ word, x, y, width: widths[i] });
      x += widths[i] + gap;
    });
    y += LINE;
  }
  context.restore();
  return placed;
};

const write = (context: Context, placed: Placed[]): void => {
  context.save();
  context.font = BODY;
  context.letterSpacing = '0px';
  context.fillStyle = INK;
  context.textBaseline = 'alphabetic';
  for (const { word, x, y } of placed) context.fillText(word, x, y);
  context.restore();
};

/** Combien de lignes tiennent sur une page de texte à partir de `y`. */
const linesFrom = (y: number): number => Math.floor((COL.bottom - y) / LINE) + 1;

const folio = (context: Context, page: number): void => text(context, String(page), W / 2, 752, `500 17px ${GARA}`, INK, 'center', 1);

/** Titre courant (le livre à gauche, le chapitre à droite) et folio. */
const frame = (context: Context, page: number): void => {
  const label = page % 2 === 0 ? texts().runningHead : texts().chapters[chapterOf(page)].title.toUpperCase();
  text(context, label, W / 2, 68, `600 13px ${GARA}`, FADED, 'center', 4);
  folio(context, page);
};

// ---------- Les pages ----------

const titlePage = (context: Context): void => {
  const t = texts();
  text(context, t.coverTitle, W / 2, 190, `600 24px ${GARA}`, INK, 'center', 8);
  context.fillStyle = INK;
  context.fillRect(W / 2 - 32, 210, 64, 1.2);
  text(context, 'X', W / 2, 520, `900 330px ${PLAY}`, INK);
  text(context, t.subtitle, W / 2, 580, `italic 500 28px ${GARA}`, RED, 'center', 1);
  text(context, t.mark, W / 2, 712, `600 13px ${GARA}`, FADED, 'center', 5);
};

const legalPage = (context: Context): void =>
  texts().legal.forEach((line, i) => text(context, line, W / 2, 470 + i * 22, `500 15px ${GARA}`, FADED, 'center', i === 0 ? 3 : 0.5));

const prefacePage = (context: Context): void => {
  const { title, text: body } = texts().preface;
  text(context, title, W / 2, 200, `italic 500 40px ${GARA}`, INK);
  context.fillStyle = RED;
  context.fillRect(W / 2 - 24, 228, 48, 1.5);
  const lines = layout(context, [body]);
  write(context, place(context, lines, 300, COL.bottom));
  text(context, 'X', W - COL.x, 300 + lines.length * LINE + 24, `900 30px ${PLAY}`, INK, 'right');
  folio(context, 3);
};

/** Les lignes du sommaire : la préface, puis les chapitres. */
const contentsRows = (): { number: string; title: string; target: number; y: number }[] => {
  const t = texts();
  return [
    { number: '', title: t.preface.title, target: 3 },
    ...t.chapters.map((c, i) => ({ number: ROMAN[i], title: c.title, target: chapterPage(i) })),
  ].map((row, i) => ({ ...row, y: 272 + i * 34 + (i > 0 ? 14 : 0) }));
};

const contentsPage = (context: Context): void => {
  text(context, texts().contents, W / 2, 190, `600 24px ${GARA}`, INK, 'center', 8);
  context.fillStyle = RED;
  context.fillRect(W / 2 - 24, 210, 48, 1.5);
  contentsRows().forEach(({ number, title, target, y }, i) => {
    const font = `${i === 0 ? 'italic ' : ''}500 22px ${GARA}`;
    text(context, number, COL.x + 44, y, `600 18px ${GARA}`, RED, 'right', 1);
    text(context, title, COL.x + 60, y, font, INK, 'left');
    context.save();
    context.letterSpacing = '0px';
    // Les points de conduite : la maquette mesurait le titre en romain, même la préface en italique.
    context.font = `500 22px ${GARA}`;
    const titleWidth = context.measureText(title).width;
    context.font = `500 20px ${GARA}`;
    const pageWidth = context.measureText(String(target)).width;
    context.restore();
    context.fillStyle = 'rgba(28,26,23,0.4)';
    for (let x = COL.x + 60 + titleWidth + 12; x < W - COL.x - pageWidth - 12; x += 9) context.fillRect(x, y - 2, 1.6, 1.6);
    text(context, String(target), W - COL.x, y, `500 20px ${GARA}`, INK, 'right');
  });
};

/** Une ligne du sommaire mène à son chapitre. */
export const bigXLinks = (page: number): PageLink[] =>
  page === CONTENTS_PAGE ? contentsRows().map(({ y, target }) => ({ y: y - 26, height: 34, target })) : [];

const OPENING_TOP = 372;
const DROP = `900 92px ${PLAY}`;

/** Le texte d'un chapitre, de son ouverture à la page suivante : l'histoire, puis la langue X. */
const chapterFlow = (context: Context, chapter: number): Line[] => {
  const story = texts().chapters[chapter].text;
  context.save();
  context.font = DROP;
  context.letterSpacing = '0px';
  const dropWidth = context.measureText(story[0]).width + 10;
  context.restore();
  return layout(context, [story.slice(1), ...xParagraphs((chapter + 1) * 10 + 1, 8)], { lines: 3, width: dropWidth });
};

/** L'ouverture d'un chapitre (toujours à droite) : numéro, titre, lettrine rouge, l'histoire qui passe en x. */
const openingPage = (context: Context, page: number, chapter: number): void => {
  const t = texts();
  text(context, t.chapter, W / 2, 150, `600 14px ${GARA}`, RED, 'center', 6);
  text(context, ROMAN[chapter], W / 2, 232, `900 72px ${PLAY}`, INK);
  text(context, t.chapters[chapter].title, W / 2, 284, `italic 500 34px ${GARA}`, INK);
  context.fillStyle = RED;
  context.fillRect(W / 2 - 24, 308, 48, 1.5);
  text(context, t.chapters[chapter].text[0], COL.x, OPENING_TOP + LINE * 2 - 2, DROP, RED, 'left');
  write(context, place(context, chapterFlow(context, chapter), OPENING_TOP, COL.bottom));
  folio(context, page);
};

/** La page après l'ouverture : la suite exacte du chapitre (la fin de l'histoire, si elle déborde). */
const sequelPage = (context: Context, page: number, chapter: number): void => {
  frame(context, page);
  const lines = chapterFlow(context, chapter).slice(linesFrom(OPENING_TOP));
  write(context, place(context, lines, COL.top + 22, COL.bottom));
};

/** Une page en langue X, qui reprend au milieu d'un paragraphe. */
const xLines = (context: Context, paragraphs: string[]): Line[] => {
  paragraphs[0] = paragraphs[0].replace(/^X/, 'x');
  const lines = layout(context, paragraphs);
  lines[0].inset = 0;
  return lines;
};

const xPage = (context: Context, page: number): void => {
  frame(context, page);
  const placed = place(context, xLines(context, xParagraphs(page, 6)), COL.top + 22, COL.bottom);
  if (page === Y_PAGE) {
    // Le seul y du livre : la quatrième lettre d'un long mot, vers le haut de la page.
    const target = placed.filter((p) => /^x{6,}[,.]?$/.test(p.word))[Math.floor(placed.length * 0.02)] ?? placed[90];
    target.word = `${target.word.slice(0, 3)}y${target.word.slice(4)}`;
  }
  write(context, placed);
};

/** La dernière page : la fin du chapitre XII, un petit X, l'achevé d'imprimer en langue X. */
const lastPage = (context: Context): void => {
  const t = texts();
  frame(context, LAST_PAGE);
  const paragraphs = xParagraphs(LAST_PAGE, 1);
  const placed = place(context, xLines(context, [...paragraphs, t.ending]), COL.top + 22, COL.bottom);
  write(context, placed);
  text(context, 'X', W / 2, Math.min(placed[placed.length - 1].y + 90, 590), `900 40px ${PLAY}`, INK);
  t.colophon.forEach((line, i) => text(context, line, W / 2, 640 + i * 22, `italic 500 15px ${GARA}`, FADED));
};

/** Dessine la page `page` (1 : la page de titre) sur un papier déjà posé. */
export const paintBigXPage = (context: Context, page: number): void => {
  if (page === 1) titlePage(context);
  else if (page === 2) legalPage(context);
  else if (page === 3) prefacePage(context);
  else if (page === CONTENTS_PAGE) contentsPage(context);
  else if (page === LAST_PAGE) lastPage(context);
  else {
    const chapter = chapterOf(page);
    const opening = chapterPage(chapter);
    if (page === opening) openingPage(context, page, chapter);
    else if (page === opening + 1) sequelPage(context, page, chapter);
    else xPage(context, page);
  }
};
