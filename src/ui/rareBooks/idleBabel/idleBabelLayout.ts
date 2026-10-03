import { messages } from '../../../i18n';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { toRoman } from '../../../systems/coverDesign';
import { TITLE } from '../draw';
import { hexagon, write } from '../credits/creditsCover';
import { MOROCCO } from './idleBabelCover';
import { BOOK_DRAFTS, DRAFT_GROUPS, STORY, pagesText, type DraftGroup } from './idleBabelStory';

/**
 * La mise en page du livre « Idle Babel » (maquette .ai/maquette-idle-babel-pages.html, validée) : texte justifié
 * en Garamond, chaque chapitre ouvert sur une page de droite avec une lettrine, des intertitres par partie ; les
 * planches attendent que la page de texte en cours soit pleine. Mesures de la maquette (page 640 × 800 : celles
 * de la texture). Le sommaire liste les chapitres et leurs parties.
 */

export const GARAMOND = "'EB Garamond', Georgia, serif";
export const INK = '#2b2118';
export const SOFT = '#7a6448';
export const GOLD = '#9a6f2a';
export const RULE = 'rgba(43,33,24,0.45)';
const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
export const CENTER = WIDTH / 2;

const MARGIN = 84;
const MEASURE = WIDTH - 2 * MARGIN;
const LEADING = 31;
const BODY = `21px ${GARAMOND}`;
const INDENT = 30;
/** La lettrine : DROP lignes de haut. */
const DROP = 2;
const DROP_FONT = `600 64px ${TITLE}`;
/** Haut du texte (page d'ouverture d'un chapitre, autres pages) ; dernière ligne de base permise. */
const OPENER_TOP = 330;
const TOP = 150;
const BOTTOM = 690;
/** Un intertitre : de l'air au-dessus, l'intertitre, un peu d'air dessous. */
const HEAD_BEFORE = 22;
const HEAD_AFTER = 44;
const CHAPTER_FONT = `600 30px ${TITLE}`;
/** Le titre d'un chapitre passe sur deux lignes au-delà de cette largeur. */
const CHAPTER_WIDTH = MEASURE * 0.75;

export const TITLE_PAGE = 1;
export const FOREWORD_PAGE = 3;
export const CONTENTS_PAGE = 5;
const FIRST_CHAPTER_PAGE = 7;
/** Le sommaire : ligne de base de la première entrée, pas d'un chapitre, pas d'une partie. */
const CONTENTS_TOP = 176;
const CONTENTS_STEP = 42;
const CONTENTS_SUB_STEP = 26;
/** Le pas d'une sous-partie, plus serré. */
const CONTENTS_SUB_SUB_STEP = 22;

export type Painter = (context: CanvasRenderingContext2D) => void;

/** Ce qui illustre le livre, dessiné par idleBabelPlates.ts. */
export interface PlateArt {
  /** La planche de la couverture retenue de `book`, numérotée `number`. */
  plate: (context: CanvasRenderingContext2D, book: string, number: number) => void;
  /** Une planche de pistes écartées : les images `files`, et ce qu'elles montrent. */
  drafts: (context: CanvasRenderingContext2D, files: string[], title: string) => void;
  /** Le nom d'un livre rare, dans la langue du jeu. */
  name: (book: string) => string;
}

export interface ContentsEntry {
  name: string;
  page: number;
  /** Une partie (plus petite, en retrait) plutôt qu'un chapitre. */
  part?: boolean;
  /** Une sous-partie : encore plus en retrait. */
  sub?: boolean;
}

export interface BookLayout {
  pages: Map<number, Painter>;
  contents: ContentsEntry[];
}

const smallHex = (context: CanvasRenderingContext2D, y: number, radius = 4): void => {
  context.fillStyle = GOLD;
  hexagon(context, CENTER, y, radius);
  context.fill();
};

export const folio = (context: CanvasRenderingContext2D, page: number): void =>
  write(context, String(page), CENTER, HEIGHT - 56, { font: `500 14px ${TITLE}`, color: SOFT, spacing: 2 });

/** Une planche, et son numéro de page une fois sa place connue. */
const withFolio =
  (draw: Painter) =>
  (page: number): Painter =>
  (context) => {
    draw(context);
    folio(context, page);
  };

const heading = (context: CanvasRenderingContext2D, title: string, y: number): void => {
  write(context, title.toLocaleUpperCase(), CENTER, y, { font: `600 28px ${TITLE}`, color: MOROCCO, spacing: 6 });
  smallHex(context, y + 30);
};

/** Ce que contient un chapitre, dans l'ordre : paragraphes, intertitres, et ce qui illustre une partie. */
type Block = { paragraph: string } | { head: string; sub?: boolean } | { plates: string[]; drafts: DraftGroup[]; now?: boolean };

interface Line {
  words: string[];
  last: boolean;
  left: number;
}

/**
 * Les mots d'un paragraphe ; la ponctuation haute (: ; ? ! ») et le « ne quittent pas leur voisin (espace
 * fine insécable), comme dans un livre français : jamais de deux-points en début de ligne.
 */
export const words = (text: string): string[] =>
  text
    .replace(/ ([:;?!»])/g, ' $1')
    .replace(/« /g, '« ')
    .split(' ');

/** Coupe un paragraphe en lignes ; la lettrine prend `drop` de large sur les `dropLines` premières lignes. */
const flow = (context: CanvasRenderingContext2D, text: string, drop: number, dropLines: number, indent: number): Line[] => {
  context.font = BODY;
  const lines: Line[] = [];
  let line: string[] = [];
  const left = () => (lines.length < dropLines ? drop : 0) + (lines.length === 0 ? indent : 0);
  const push = (last: boolean) => {
    lines.push({ words: line, last, left: left() });
    line = [];
  };
  for (const word of words(text)) {
    if (line.length && context.measureText([...line, word].join(' ')).width > MEASURE - left()) push(false);
    line.push(word);
  }
  push(true);
  return lines;
};

/** Une ligne justifiée (la dernière d'un paragraphe : espaces ordinaires). */
const drawLine = (context: CanvasRenderingContext2D, { words: list, last, left }: Line, y: number): void => {
  context.font = BODY;
  context.fillStyle = INK;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  const x0 = MARGIN + left;
  const natural = list.reduce((sum, word) => sum + context.measureText(word).width, 0);
  const space = last || list.length < 2 ? context.measureText(' ').width : (MARGIN + MEASURE - x0 - natural) / (list.length - 1);
  let x = x0;
  for (const word of list) {
    context.fillText(word, x, y);
    x += context.measureText(word).width + space;
  }
};

/** Le titre d'un chapitre : sur deux lignes équilibrées s'il dépasse CHAPTER_WIDTH. */
const chapterTitle = (context: CanvasRenderingContext2D, title: string): string[] => {
  context.save();
  context.font = CHAPTER_FONT;
  context.letterSpacing = '5px';
  const width = (text: string) => context.measureText(text).width;
  const list = title.split(' ');
  let lines = [title];
  if (width(title) > CHAPTER_WIDTH && list.length > 1) {
    let best = Infinity;
    for (let i = 1; i < list.length; i++) {
      const pair = [list.slice(0, i).join(' '), list.slice(i).join(' ')];
      const widest = Math.max(...pair.map(width));
      if (widest < best) [best, lines] = [widest, pair];
    }
  }
  context.restore();
  return lines;
};

/**
 * Le livre entier, dans la langue du jeu : chaque page écrite et ce qu'elle dessine (les autres restent
 * blanches), et le sommaire. `context` sert à mesurer le texte. La dernière page dit que le livre s'écrit encore.
 */
export const layoutIdleBabel = (context: CanvasRenderingContext2D, art: PlateArt): BookLayout => {
  const text = pagesText();
  const pages = new Map<number, Painter>();
  const contents: ContentsEntry[] = [{ name: text.foreword, page: FOREWORD_PAGE }];

  pages.set(TITLE_PAGE, (target) => {
    const { idle, babel, subtitle, subtitle2 } = messages().rareBooks.idleBabel;
    write(target, `${idle} ${babel}`, CENTER, 300, { font: `600 58px ${TITLE}`, color: MOROCCO, spacing: 10 });
    smallHex(target, 340, 6);
    write(target, subtitle, CENTER, 400, { font: `italic 26px ${GARAMOND}`, color: INK });
    write(target, subtitle2, CENTER, 436, { font: `italic 22px ${GARAMOND}`, color: SOFT });
    write(target, text.publisher, CENTER, HEIGHT - 110, { font: `500 14px ${TITLE}`, color: SOFT, spacing: 4 });
  });
  pages.set(PAGES_PER_BOOK, (target) => {
    smallHex(target, 440);
    text.colophon.forEach((line, i) => write(target, line, CENTER, 480 + i * 28, { font: `italic 19px ${GARAMOND}`, color: SOFT }));
  });

  pages.set(FOREWORD_PAGE, (target) => {
    heading(target, text.foreword, 130);
    let y = 250;
    text.forewordText.forEach((paragraph, i) =>
      flow(target, paragraph, 0, 0, i ? INDENT : 0).forEach((line) => {
        drawLine(target, line, y);
        y += LEADING;
      }),
    );
    folio(target, FOREWORD_PAGE);
  });

  let page = FIRST_CHAPTER_PAGE;
  let plateNumber = 1;
  STORY.forEach((chapter, c) => {
    const { title, text: intro } = text.chapters[chapter.key];
    // Chaque chapitre s'ouvre sur une page de droite.
    if (page % 2 === 0) page++;
    contents.push({ name: `${toRoman(c + 1)}. ${title}`, page });
    const titleLines = chapterTitle(context, title.toLocaleUpperCase());
    const extra = (titleLines.length - 1) * 40;
    let draws: Painter[] = [];
    let y = OPENER_TOP + extra;
    // Les planches attendent que la page de texte en cours soit pleine : jamais de page à moitié vide.
    let queue: ((at: number) => Painter)[] = [];
    const flush = () => {
      for (const make of queue) pages.set(page, make(page++));
      queue = [];
    };
    const close = () => {
      const list = draws;
      const number = page++;
      pages.set(number, (target) => {
        list.forEach((draw) => draw(target));
        folio(target, number);
      });
      draws = [];
      y = TOP;
      flush();
    };
    const chapterNumber = toRoman(c + 1);
    draws.push((target) => {
      write(target, `${text.chapter} ${chapterNumber}`, CENTER, 150, { font: `500 15px ${TITLE}`, color: SOFT, spacing: 5 });
      titleLines.forEach((line, i) => write(target, line, CENTER, 200 + i * 40, { font: CHAPTER_FONT, color: MOROCCO, spacing: 5 }));
      smallHex(target, 236 + extra);
    });

    const blocks: Block[] = intro.map((paragraph) => ({ paragraph }));
    for (const section of chapter.sections ?? []) {
      const part = text.sections[section.key];
      blocks.push({ head: part.head, sub: section.sub }, ...part.text.map((paragraph) => ({ paragraph })));
      if (section.plates || section.drafts) blocks.push({ plates: section.plates ?? [], drafts: section.drafts ?? [], now: section.sub });
    }
    if (!blocks.length) {
      draws.push((target) => write(target, text.soon, CENTER, 330 + extra, { font: `italic 22px ${GARAMOND}`, color: SOFT }));
      close();
      return;
    }

    // La lettrine prend DROP lignes, même si le premier paragraphe est plus court.
    let first = true;
    let afterHead = true;
    let drop = 0;
    let dropLines = 0;
    for (const block of blocks) {
      if ('plates' in block) {
        for (const book of block.plates) {
          const number = plateNumber++;
          queue.push(withFolio((target) => art.plate(target, book, number)));
          const files = BOOK_DRAFTS[book];
          if (files) queue.push(withFolio((target) => art.drafts(target, files, art.name(book))));
        }
        for (const group of block.drafts)
          queue.push(withFolio((target) => art.drafts(target, DRAFT_GROUPS[group], text.draftGroups[group])));
        // Les couvertures d'une sous-partie de « Les livres » la suivent tout de suite (la page reste courte) :
        // la sous-partie suivante commence après elles.
        if (block.now) close();
        continue;
      }
      if ('head' in block) {
        // Un intertitre garde au moins une ligne avec lui.
        if (y + HEAD_BEFORE + HEAD_AFTER + LEADING > BOTTOM) close();
        const at = y === TOP ? y : y + HEAD_BEFORE;
        contents.push({ name: block.head, page, part: true, sub: block.sub });
        // Une sous-partie : son titre en italique, sous celui de sa partie.
        draws.push((target) =>
          block.sub
            ? write(target, block.head, CENTER, at, { font: `italic 20px ${GARAMOND}`, color: MOROCCO })
            : write(target, block.head.toLocaleUpperCase(), CENTER, at, { font: `500 15px ${TITLE}`, color: MOROCCO, spacing: 4 }),
        );
        y = at + HEAD_AFTER;
        afterHead = true;
        continue;
      }
      let paragraph = block.paragraph;
      if (first) {
        context.font = DROP_FONT;
        drop = context.measureText(paragraph[0]).width + 12;
        dropLines = DROP;
        const letter = paragraph[0];
        const at = y;
        draws.push((target) => write(target, letter, MARGIN, at + (DROP - 1) * LEADING, { font: DROP_FONT, color: GOLD, align: 'left' }));
        paragraph = paragraph.slice(1);
      }
      const lines = flow(context, paragraph, drop, dropLines, first || afterHead || dropLines ? 0 : INDENT);
      dropLines = Math.max(0, dropLines - lines.length);
      for (const line of lines) {
        if (y > BOTTOM) close();
        const at = y;
        draws.push((target) => drawLine(target, line, at));
        y += LEADING;
      }
      first = false;
      afterHead = false;
    }
    close();
    flush();
  });

  pages.set(CONTENTS_PAGE, (target) => {
    heading(target, text.contents, 110);
    const baselines = contentsBaselines(contents);
    contents.forEach(({ name, page: at, part, sub }, i) => {
      const y = baselines[i];
      const left = sub ? 146 : part ? 118 : 90;
      const font = sub ? `italic 15px ${GARAMOND}` : part ? `italic 17px ${GARAMOND}` : `400 21px ${GARAMOND}`;
      write(target, name, left, y, { font, color: part ? SOFT : INK, align: 'left' });
      write(target, String(at), WIDTH - 90, y, { font: `500 ${part ? 13 : 15}px ${TITLE}`, color: SOFT, align: 'right', spacing: 1 });
      target.font = font;
      target.fillStyle = RULE;
      for (let x = left + target.measureText(name).width + 12; x < WIDTH - 124; x += 9) target.fillRect(x, y - 5, 1.2, 1.2);
    });
    folio(target, CONTENTS_PAGE);
  });

  return { pages, contents };
};

/** Les lignes du sommaire (ligne de base de chacune), pour les rendre cliquables. */
export const contentsBaselines = (contents: ContentsEntry[]): number[] => {
  let y = CONTENTS_TOP;
  return contents.map(({ part, sub }, i) => (y += sub ? CONTENTS_SUB_SUB_STEP : part ? CONTENTS_SUB_STEP : i ? CONTENTS_STEP : 0));
};
