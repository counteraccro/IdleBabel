import { messages } from '../../../i18n';
import { seeded } from '../../../core/random';
import { randomBabelText } from '../../../systems/babelText';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { CINZEL, GARAMOND, print } from './endlessBookCover';
import {
  LINE,
  NUMBER_GAP,
  PAD,
  PARAGRAPH_GAP,
  SIZE,
  TOP,
  parseWords,
  wordFont,
  wrapWords,
  type EndlessLayout,
  type PlacedLine,
  type Word,
} from './endlessBookLayout';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages du livre-jeu (maquette .ai/maquette-livre-sans-fin.html) : la page de titre, son verso, « Comment lire
 * ce livre », les paragraphes, et après la seule fin le charabia de Babel, trois paragraphes par page jusqu'à la
 * 410e, dont les choix mènent toujours à un autre paragraphe de charabia.
 */

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
const CENTER = WIDTH / 2;
const INK = '#2e241a';
const DARK = '#1a120c';
const BROWN = '#4a3a2c';
const SOFT = '#6a5a48';
/** Trois paragraphes de charabia par page, de trois lignes chacun. */
const BABEL_PER_PAGE = 3;
const BABEL_LINES = 3;
const BABEL_STEP = NUMBER_GAP + (BABEL_LINES + 1) * LINE + PARAGRAPH_GAP;

const text = () => messages().rareBooks.endlessBook.pages;

/** Une ligne de mots, étalée sur `justify` si elle est justifiée. */
const drawWords = (context: CanvasRenderingContext2D, words: Word[], x: number, y: number, justify?: number): void => {
  context.font = `${SIZE}px ${GARAMOND}`;
  const space = context.measureText(' ').width;
  const widths = words.map((word) => {
    context.font = wordFont(word);
    return context.measureText(word.text).width;
  });
  const gaps = words.filter((word, i) => i > 0 && !word.glued).length;
  const spread = justify && gaps ? (justify - widths.reduce((a, b) => a + b, 0)) / gaps : space;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  let at = x;
  words.forEach((word, i) => {
    if (i > 0 && !word.glued) at += spread;
    context.font = wordFont(word);
    context.fillStyle = word.bold ? DARK : INK;
    context.fillText(word.text, at, y);
    at += widths[i];
  });
};

const drawLine = (context: CanvasRenderingContext2D, line: PlacedLine): void => {
  const word = line.words[0].text;
  if (line.kind === 'number') print(context, word, line.x, line.y, `700 30px ${CINZEL}`, DARK);
  else if (line.kind === 'end') print(context, word, line.x, line.y, `italic ${SIZE}px ${GARAMOND}`, INK);
  else if (line.kind === 'line') print(context, word, line.x, line.y, `italic 24px ${GARAMOND}`, BROWN);
  else if (line.kind === 'fin') print(context, word, line.x, line.y + 10, `700 34px ${CINZEL}`, DARK, 'center', 8);
  else if (line.kind === 'fig') {
    // Gravé : un liseré clair sous le chiffre sombre.
    print(context, word, line.x, line.y + 1.5, `700 64px ${CINZEL}`, 'rgba(255,250,235,0.8)', 'center', 4);
    print(context, word, line.x, line.y, `700 64px ${CINZEL}`, DARK, 'center', 4);
  } else drawWords(context, line.words, line.x, line.y, line.justify);
};

/** En haut, les numéros des paragraphes de la page (dans le coin extérieur) ; en bas, le numéro de page. */
const frame = (context: CanvasRenderingContext2D, page: number, paragraphs: number[]): void => {
  if (paragraphs.length) {
    const [first, last] = [Math.min(...paragraphs), Math.max(...paragraphs)];
    const left = page % 2 === 0;
    print(
      context,
      first === last ? String(first) : `${first}-${last}`,
      left ? PAD : WIDTH - PAD,
      46,
      `700 18px ${CINZEL}`,
      SOFT,
      left ? 'left' : 'right',
      2,
    );
  }
  print(context, String(page), CENTER, HEIGHT - 34, `16px ${GARAMOND}`, SOFT);
};

export const paintTitlePage = (context: CanvasRenderingContext2D): void => {
  const { author, genre, collection } = text();
  const { title, tail } = messages().rareBooks.endlessBook;
  print(context, author, CENTER, 190, `400 22px ${CINZEL}`, BROWN, 'center', 4);
  for (const [row, word] of title.entries()) {
    context.font = `700 56px ${CINZEL}`;
    const size = Math.min(56, (56 * 500) / context.measureText(word).width);
    print(context, word, CENTER, [300, 368][row], `700 ${size}px ${CINZEL}`, DARK);
  }
  print(context, tail, CENTER + 80, 414, `italic 30px ${GARAMOND}`, '#7a2a1c');
  context.fillStyle = '#8a7a66';
  context.fillRect(CENTER - 60, 470, 120, 1);
  print(context, genre, CENTER, 512, `italic 22px ${GARAMOND}`, BROWN);
  print(context, collection, CENTER, 700, `20px ${GARAMOND}`, BROWN);
};

/** Le verso de la page de titre : les mentions, en petit, en bas. */
export const paintLegalPage = (context: CanvasRenderingContext2D): void => {
  text().legal.forEach((line, row) => print(context, line, CENTER, 520 + row * 24, `italic 16px ${GARAMOND}`, SOFT));
};

/** « Comment lire ce livre » : la règle, et l'avertissement à ceux qui feuillettent (le 66). */
export const paintRulesPage = (context: CanvasRenderingContext2D): void => {
  const { rulesTitle, rules, warning } = text();
  print(context, rulesTitle, CENTER, 130, `700 26px ${CINZEL}`, DARK, 'center', 2);
  const width = WIDTH - 2 * PAD;
  let y = 200;
  for (const rule of rules) {
    const lines = wrapWords(context, parseWords(rule, 1), width);
    lines.forEach((words, row) => drawWords(context, words, PAD, y + row * LINE, row < lines.length - 1 ? width : undefined));
    y += lines.length * LINE + 16;
  }
  y += 20;
  for (const [row, words] of wrapWords(
    context,
    parseWords(warning).map((word) => ({ ...word, italic: true })),
    width,
  ).entries())
    drawWords(context, words, PAD, y + row * LINE);
  frame(context, 3, []);
};

/** Le n-ième paragraphe de charabia, sa page et sa place. */
const babelNumber = (layout: EndlessLayout, page: number, slot: number): number => 101 + BABEL_PER_PAGE * (page - layout.babelFirst) + slot;
const babelCount = (layout: EndlessLayout): number => BABEL_PER_PAGE * (PAGES_PER_BOOK + 1 - layout.babelFirst);
const babelPage = (layout: EndlessLayout, n: number): number => layout.babelFirst + Math.floor((n - 101) / BABEL_PER_PAGE);
/** Où mène le choix du paragraphe de charabia `n` : un autre, au hasard (toujours le même). */
const babelTarget = (layout: EndlessLayout, n: number): number => 101 + Math.floor(seeded(n * 7919)() * babelCount(layout));
const babelChoiceY = (slot: number): number => TOP + slot * BABEL_STEP + NUMBER_GAP + BABEL_LINES * LINE;

const paintBabelPage = (context: CanvasRenderingContext2D, page: number, layout: EndlessLayout): void => {
  const width = WIDTH - 2 * PAD;
  const numbers: number[] = [];
  for (let slot = 0; slot < BABEL_PER_PAGE; slot++) {
    const n = babelNumber(layout, page, slot);
    numbers.push(n);
    const top = TOP + slot * BABEL_STEP;
    print(context, String(n), CENTER, top, `700 30px ${CINZEL}`, DARK);
    const random = seeded(n);
    const words = randomBabelText(260, random)
      .split(' ')
      .filter(Boolean)
      .map((word) => ({ text: word }));
    wrapWords(context, words, width)
      .slice(0, BABEL_LINES)
      .forEach((line, row) => drawWords(context, line, PAD, top + NUMBER_GAP + row * LINE, row < BABEL_LINES - 1 ? width : undefined));
    drawWords(context, parseWords(text().babelChoice, babelTarget(layout, n)), PAD + 22, babelChoiceY(slot));
  }
  frame(context, page, numbers);
};

/** Une page du livre, après la règle : ses paragraphes, ou le charabia après la fin. */
export const paintEndlessPage = (context: CanvasRenderingContext2D, page: number, layout: EndlessLayout): void => {
  if (page >= layout.babelFirst) return paintBabelPage(context, page, layout);
  const sheet = layout.pages.get(page);
  if (!sheet) return;
  for (const line of sheet.lines) drawLine(context, line);
  frame(context, page, sheet.paragraphs);
};

/** Les choix cliquables de la page ; après la fin, ceux du charabia. */
export const endlessLinks = (page: number, layout: EndlessLayout): PageLink[] => {
  if (page < layout.babelFirst) return layout.pages.get(page)?.links ?? [];
  return Array.from({ length: BABEL_PER_PAGE }, (_, slot) => ({
    y: babelChoiceY(slot) - SIZE,
    height: LINE,
    target: babelPage(layout, babelTarget(layout, babelNumber(layout, page, slot))),
  }));
};
