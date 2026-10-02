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
    const { title } = text.chapters[from + row];
    const y = CONTENTS_TOP + row * CONTENTS_STEP;
    const font = `15px ${style.body}`;
    write(context, `${roman(from + row + 1)}.`, LEFT + 46, y, { font, color: style.ink, align: 'right' });
    context.font = font;
    const width = context.measureText(title).width;
    write(context, title, LEFT + 58, y, { font, color: style.ink, align: 'left' });
    write(context, String(start), RIGHT, y, { font, color: style.ink, align: 'right' });
    // Points de conduite entre le titre et la page.
    context.fillStyle = '#a89878';
    for (let x = LEFT + 58 + width + 10; x < RIGHT - 36; x += 8) context.fillRect(x, y + 12, 1.5, 1.5);
  });
};

/** Le haut de l'ouverture d'un chapitre : son numéro, son titre, un filet. */
const chapterHead = (context: CanvasRenderingContext2D, { label, title }: { label: string; title: string }, style: ClassicStyle): void => {
  write(context, `${label.toUpperCase()}.`, PAGE_CENTER, 150, { font: `15px ${style.body}`, color: style.ink, spacing: 3 });
  write(context, `${title}.`, PAGE_CENTER, 185, { font: `bold 22px ${style.heading}`, color: style.ink, spacing: 1 });
  context.fillStyle = style.ink;
  context.fillRect(PAGE_CENTER - 40, OPENING_TOP - 70, 80, 1);
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
  else write(context, `${chapter.title}.`.toUpperCase(), PAGE_CENTER, 44, { font: `italic 12px ${style.body}`, color: GREY, spacing: 2 });
  if (content.dropCap) {
    const { letter, x, y, size } = content.dropCap;
    write(context, letter, x, y - style.line * 1.3, { font: `${size}px ${style.dropCap}`, color: style.accent, align: 'left' });
  }
  const font = `${style.size}px ${style.body}`;
  for (const { text: line, x, y, center } of content.lines)
    write(context, line, x, y, { font, color: style.ink, align: center ? 'center' : 'left' });
  write(context, String(page), PAGE_CENTER, HEIGHT - 52, { font: `13px ${style.body}`, color: GREY });
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
