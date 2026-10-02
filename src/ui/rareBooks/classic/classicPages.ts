import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, write } from '../draw';
import { CONTENTS_PAGE, CONTENTS_ROWS, LEFT, OPENING_TOP, RIGHT, type ClassicLayout, type ClassicStyle } from './classicLayout';
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

/** Le titre d'un chapitre suivi d'un point, sauf s'il finit déjà par une ponctuation. */
const titled = (title: string): string => (/[.!?]$/.test(title) ? title : `${title}.`);

/** La table des matières : le numéro du chapitre, son titre, des points de conduite, sa page. */
const contentsPage = (
  context: CanvasRenderingContext2D,
  page: number,
  text: ClassicText,
  layout: ClassicLayout,
  style: ClassicStyle,
  heading: string,
): void => {
  const sheet = page - CONTENTS_PAGE;
  if (sheet === 0) {
    write(context, heading.toUpperCase(), PAGE_CENTER, 100, { font: `bold 19px ${style.body}`, color: style.ink, spacing: 4 });
    context.fillStyle = style.ink;
    context.fillRect(PAGE_CENTER - 30, 135, 60, 1);
  }
  const from = sheet * CONTENTS_ROWS;
  layout.starts.slice(from, from + CONTENTS_ROWS).forEach((start, row) => {
    const { label, title: name } = text.chapters[from + row];
    const y = CONTENTS_TOP + row * CONTENTS_STEP;
    const font = `15px ${style.body}`;
    // Les chapitres sont numérotés ; les parties hors série (étymologie, épilogue…) portent leur nom.
    const numbered = isNumbered(label);
    const number = text.chapters.slice(0, from + row + 1).filter((chapter) => isNumbered(chapter.label)).length;
    const title = numbered ? name : partName(label, name);
    if (numbered) write(context, `${roman(number)}.`, LEFT + 46, y, { font, color: style.ink, align: 'right' });
    // Sans nom de partie (des contes) : le titre part de la marge ; trop long, il est imprimé plus petit.
    const x = label ? LEFT + 58 : LEFT;
    const size = fitting(context, title, (px) => `${px}px ${style.body}`, 15, RIGHT - 60 - x);
    context.font = `${size}px ${style.body}`;
    const width = context.measureText(title).width;
    write(context, title, x, y, { font: context.font, color: style.ink, align: 'left' });
    write(context, String(start), RIGHT, y, { font, color: style.ink, align: 'right' });
    // Points de conduite entre le titre et la page.
    context.fillStyle = '#a89878';
    for (let dot = x + width + 10; dot < RIGHT - 36; dot += 8) context.fillRect(dot, y + 12, 1.5, 1.5);
  });
};

/** Le haut de l'ouverture d'un chapitre : son numéro, son titre, un filet. */
const chapterHead = (context: CanvasRenderingContext2D, { label, title }: { label: string; title: string }, style: ClassicStyle): void => {
  if (style.head) return style.head(context, title);
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
  if (page >= CONTENTS_PAGE && page < CONTENTS_PAGE + layout.contentsPages) {
    contentsPage(context, page, text, layout, style, contentsHeading);
    return true;
  }
  const content = layout.pages.get(page);
  if (!content) return false;
  const chapter = text.chapters[content.chapter];
  if (content.opening) chapterHead(context, chapter, style);
  // Le titre courant : celui du chapitre, en petit, en haut de page.
  else if (style.marks) {
    const { font, color, spacing, y } = style.marks.runningHead;
    baseline(context, titled(chapter.title || partName(chapter.label)).toUpperCase(), PAGE_CENTER, y, font, color, spacing);
  } else {
    const running = titled(chapter.title || partName(chapter.label)).toUpperCase();
    const size = fitting(context, running, (px) => `italic ${px}px ${style.body}`, 12, RIGHT - LEFT, 2);
    write(context, running, PAGE_CENTER, 44, { font: `italic ${size}px ${style.body}`, color: GREY, spacing: 2 });
  }
  const font = `${style.size}px ${style.body}`;
  if (content.dropCap && style.dropCap && style.marks?.dropCapOnSecondLine) {
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
  for (const { text: line, x, y, center } of content.lines) {
    if (center && centered) {
      // Une nuit : sa police, et un court filet dessous.
      context.font = centered.font;
      const base = y + context.measureText('M').fontBoundingBoxAscent;
      baseline(context, line, x, base, centered.font, style.ink, centered.spacing);
      context.fillRect(x - centered.half, base + centered.rule, 2 * centered.half, 1);
    } else write(context, line, x, y, { font, color: style.ink, align: center ? 'center' : 'left' });
  }
  if (style.marks) {
    const { font: folio, color, y } = style.marks.folio;
    baseline(context, String(page), PAGE_CENTER, y, folio, color);
  } else write(context, String(page), PAGE_CENTER, HEIGHT - 52, { font: `13px ${style.body}`, color: GREY });
  return true;
};

/** Les lignes de la table des matières : un clic mène au chapitre. */
export const classicLinks = (page: number, layout: ClassicLayout | null): PageLink[] => {
  if (!layout || page < CONTENTS_PAGE || page >= CONTENTS_PAGE + layout.contentsPages) return [];
  const from = (page - CONTENTS_PAGE) * CONTENTS_ROWS;
  return layout.starts.slice(from, from + CONTENTS_ROWS).map((target, row) => ({
    y: CONTENTS_TOP + row * CONTENTS_STEP - 12,
    height: CONTENTS_STEP,
    target,
  }));
};
