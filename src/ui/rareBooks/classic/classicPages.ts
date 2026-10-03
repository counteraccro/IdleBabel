import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, wrap, write } from '../draw';
import { CONTENTS_ROWS, LEFT, OPENING_TOP, RIGHT, titled, type ClassicLayout, type ClassicStyle } from './classicLayout';
import type { ClassicText } from './classicText';
import type { PageLink } from '../rareBookArt';

/** Les pages d'un classique : la table des matières, l'ouverture des chapitres, le texte courant. */

const { height: HEIGHT } = PAGE_TEXTURE;
const GREY = '#7a6f60';
const CONTENTS_TOP = 190;
const CONTENTS_STEP = 38;

/** Un nombre en chiffres romains (les numéros de chapitre). */
const roman = (value: number): string =>
  (
    [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ] as const
  ).reduce((out, [size, letters]) => {
    while (value >= size) {
      out += letters;
      value -= size;
    }
    return out;
  }, '');

/** Un vrai chapitre (numéroté), pas une partie hors série comme une préface ou un épilogue. */
const isNumbered = (label: string): boolean => /^CHAP/i.test(label);

/** Le nom d'une partie hors série, tel qu'en table : « EPILOGUE » → « Epilogue » ; sans nom, son titre (un conte). */
const partName = (label: string, title = ''): string => (label ? label.charAt(0) + label.slice(1).toLowerCase() : title);

/** La taille de `font` (en px, au plus `size`) à laquelle `text` tient dans `width`. */
const fitting = (
  context: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  size: number,
  width: number,
  spacing = 0,
): number => {
  context.font = font(size);
  const natural = context.measureText(text).width + spacing * text.length;
  return natural <= width ? size : (size * width) / natural;
};

/** La table des matières : le numéro du chapitre, son titre, des points de conduite, sa page. */
const contentsPage = (
  context: CanvasRenderingContext2D,
  page: number,
  text: ClassicText,
  layout: ClassicLayout,
  style: ClassicStyle,
  heading: string,
): void => {
  const sheet = page - layout.contentsPage;
  if (sheet === 0) {
    write(context, heading.toUpperCase(), PAGE_CENTER, 100, { font: `bold 19px ${style.body}`, color: style.ink, spacing: 4 });
    context.fillStyle = style.ink;
    context.fillRect(PAGE_CENTER - 30, 135, 60, 1);
  }
  const from = sheet * CONTENTS_ROWS;
  layout.starts.slice(from, from + CONTENTS_ROWS).forEach((start, row) => {
    const { label, title: name, inline } = text.chapters[from + row];
    const y = CONTENTS_TOP + row * CONTENTS_STEP;
    const font = `15px ${style.body}`;
    // Les chapitres sont numérotés (depuis le début du livre, ou de la grande partie où ils sont) ; les
    // parties hors série (étymologie, épilogue…) portent leur nom.
    const numbered = isNumbered(label);
    let number = 0;
    for (const chapter of text.chapters.slice(0, from + row + 1)) number = chapter.part ? 0 : number + (isNumbered(chapter.label) ? 1 : 0);
    const title = numbered ? name : (style.contentsName?.(label, name) ?? partName(label, name));
    if (numbered) write(context, `${roman(number)}.`, LEFT + 46, y, { font, color: style.ink, align: 'right' });
    // Sans nom de partie (des contes) : le titre part de la marge ; une histoire racontée dans un chapitre est
    // en retrait, en italique. Trop long, il est imprimé plus petit, ou sur deux lignes si le livre le veut
    // (coupé d'un « … » s'il en faut plus).
    const x = inline ? LEFT + 82 : label ? LEFT + 58 : LEFT;
    const italic = inline ? 'italic ' : '';
    const room = RIGHT - 60 - x;
    const size = fitting(context, title, (px) => `${italic}${px}px ${style.body}`, 15, room);
    let lines = [title];
    if (style.contentsWrap && size < 15) {
      context.font = `${italic}13px ${style.body}`;
      lines = wrap(context, title, room);
      if (lines.length > 2) {
        let second = lines[1];
        while (context.measureText(`${second} …`).width > room) second = second.slice(0, second.lastIndexOf(' '));
        lines = [lines[0], `${second.replace(/[ ,;:.]+$/, '')}…`];
      }
    } else context.font = `${italic}${size}px ${style.body}`;
    const lineFont = context.font;
    // Sur deux lignes : la première un peu au-dessus de la place de la ligne, la seconde un peu en dessous.
    const rows = lines.map((line, index) => [line, lines.length === 1 ? y : y - 8 + index * 16] as const);
    for (const [line, top] of rows) write(context, line, x, top, { font: lineFont, color: style.ink, align: 'left' });
    const [last, lastTop] = rows[rows.length - 1];
    context.font = lineFont;
    const width = context.measureText(last).width;
    write(context, String(start), RIGHT, lastTop, { font, color: style.ink, align: 'right' });
    // Points de conduite entre le titre et la page.
    context.fillStyle = '#a89878';
    for (let dot = x + width + 10; dot < RIGHT - 36; dot += 8) context.fillRect(dot, lastTop + 12, 1.5, 1.5);
  });
};

/** Le haut de l'ouverture d'un chapitre : son numéro, son titre, un filet. */
const chapterHead = (context: CanvasRenderingContext2D, { label, title }: { label: string; title: string }, style: ClassicStyle): void => {
  if (style.head) return style.head(context, title, label);
  write(context, `${label.toUpperCase()}.`, PAGE_CENTER, 150, { font: `15px ${style.body}`, color: style.ink, spacing: 3 });
  if (title) {
    // Un titre trop long pour la page est imprimé plus petit.
    context.font = `bold 22px ${style.heading}`;
    const size = Math.min(22, (22 * (RIGHT - LEFT)) / (context.measureText(titled(title)).width + titled(title).length));
    write(context, titled(title), PAGE_CENTER, 185, { font: `bold ${size}px ${style.heading}`, color: style.ink, spacing: 1 });
  }
  context.fillStyle = style.ink;
  context.fillRect(PAGE_CENTER - 40, OPENING_TOP - 70, 80, 1);
};

/** Du texte posé par sa ligne de base `y` (les placements des maquettes). */
const baseline = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  spacing = 0,
  align: CanvasTextAlign = 'center',
): void => {
  context.font = font;
  context.letterSpacing = `${spacing}px`;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Une ligne justifiée : ses mots étalés sur `width`, l'espace partagé entre eux. */
const justifyLine = (
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  width: number,
  font: string,
  color: string,
): void => {
  const words = line.split(' ');
  context.font = font;
  const gap = words.length > 1 ? (width - words.reduce((sum, word) => sum + context.measureText(word).width, 0)) / (words.length - 1) : 0;
  let at = x;
  for (const word of words) {
    write(context, word, at, y, { font, color, align: 'left' });
    at += context.measureText(word).width + gap;
  }
};

/** Une page du texte (ou la table des matières) ; false : rien n'y est imprimé. */
export const paintClassicPage = (
  context: CanvasRenderingContext2D,
  page: number,
  text: ClassicText,
  layout: ClassicLayout,
  style: ClassicStyle,
  contentsHeading: string,
): boolean => {
  context.textBaseline = 'alphabetic';
  if (page >= layout.contentsPage && page < layout.contentsPage + layout.contentsPages) {
    contentsPage(context, page, text, layout, style, contentsHeading);
    return true;
  }
  const content = layout.pages.get(page);
  if (!content) return false;
  const chapter = text.chapters[content.chapter];
  if (content.opening) chapterHead(context, chapter, style);
  // Le titre courant : celui du chapitre, en petit, en haut de page.
  else if (style.marks?.runningHead) {
    const { font, color, spacing, y, left, right } = style.marks.runningHead;
    const running =
      left && page % 2 === 0
        ? left()
        : right
          ? right(chapter.label, chapter.title)
          : titled(chapter.title || partName(chapter.label)).toUpperCase();
    baseline(context, running, PAGE_CENTER, y, font, color, spacing);
  } else if (!style.marks) {
    const running = titled(chapter.title || partName(chapter.label)).toUpperCase();
    const size = fitting(context, running, (px) => `italic ${px}px ${style.body}`, 12, RIGHT - LEFT, 2);
    write(context, running, PAGE_CENTER, 44, { font: `italic ${size}px ${style.body}`, color: GREY, spacing: 2 });
  }
  const font = `${style.size}px ${style.body}`;
  if (content.dropCap && style.dropCapBox) {
    const { letter, x, y } = content.dropCap;
    context.font = font;
    style.dropCapBox.draw(context, letter, x, y + context.measureText('M').fontBoundingBoxAscent);
  } else if (content.dropCap && style.dropCap && style.marks?.dropCapOnSecondLine) {
    // Sur la ligne de base de la 2e ligne du paragraphe.
    const { letter, x, y, size } = content.dropCap;
    context.font = font;
    const second = y + context.measureText('M').fontBoundingBoxAscent + style.line;
    baseline(context, letter, x, second, `${size}px ${style.dropCap}`, style.accent, 0, 'left');
  } else if (content.dropCap && style.dropCap) {
    const { letter, x, y, size } = content.dropCap;
    write(context, letter, x, y - style.line * 1.3, { font: `${size}px ${style.dropCap}`, color: style.accent, align: 'left' });
  }
  const centered = style.marks?.centered;
  const numbers = style.numbers;
  for (const { text: line, x, y, center, justify, number, heading } of content.lines) {
    if (number && numbers) {
      // Le numéro dans la marge, sur la ligne de base de la ligne.
      context.font = font;
      baseline(context, number, x - numbers.gap, y + context.measureText('M').fontBoundingBoxAscent, numbers.font, style.ink, 0, 'right');
    }
    if (heading && style.inlineHeading) {
      // Le titre d'une histoire, au fil du texte.
      const { font: headingFont, spacing } = style.inlineHeading;
      context.font = font;
      baseline(context, line, x, y + context.measureText('M').fontBoundingBoxAscent, headingFont, style.ink, spacing);
    } else if (center && centered) {
      // Une nuit : sa police, et un court filet dessous.
      context.font = centered.font;
      const base = y + context.measureText('M').fontBoundingBoxAscent;
      baseline(context, line, x, base, centered.font, style.ink, centered.spacing);
      context.fillRect(x - centered.half, base + centered.rule, 2 * centered.half, 1);
    } else if (justify) justifyLine(context, line, x, y, justify, font, style.ink);
    else write(context, line, x, y, { font, color: style.ink, align: center ? 'center' : 'left' });
  }
  if (style.marks) {
    const { font: folio, color, y, top, center: middle, format = String, openings = true } = style.marks.folio;
    // En haut, dans le coin extérieur (à gauche sur une page de gauche) ou au milieu ; aux ouvertures, en bas
    // au milieu (ou rien).
    if (top !== undefined && !content.opening) {
      const outer = page % 2 === 0;
      if (middle) baseline(context, format(page), PAGE_CENTER, top, folio, color);
      else baseline(context, format(page), outer ? LEFT : RIGHT, top, folio, color, 0, outer ? 'left' : 'right');
    } else if (openings) baseline(context, format(page), PAGE_CENTER, y, folio, color);
  } else write(context, String(page), PAGE_CENTER, HEIGHT - 52, { font: `13px ${style.body}`, color: GREY });
  return true;
};

/** Les lignes de la table des matières : un clic mène au chapitre. */
export const classicLinks = (page: number, layout: ClassicLayout | null): PageLink[] => {
  if (!layout || page < layout.contentsPage || page >= layout.contentsPage + layout.contentsPages) return [];
  const from = (page - layout.contentsPage) * CONTENTS_ROWS;
  return layout.starts.slice(from, from + CONTENTS_ROWS).map((target, row) => ({
    y: CONTENTS_TOP + row * CONTENTS_STEP - 12,
    height: CONTENTS_STEP,
    target,
  }));
};
