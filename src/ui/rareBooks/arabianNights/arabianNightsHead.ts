import { LEFT, RIGHT } from '../classic/classicLayout';
import { PAGE_CENTER } from '../draw';
import { GARAMOND, INK, typeFlower } from './arabianNightsCover';

/**
 * L'ouverture d'un conte, comme dans l'édition de Galland : un bandeau de fleurons entre deux filets, le
 * titre en capitales coupé après son premier mot (« HISTOIRE » / « DU PÊCHEUR. »), un court filet.
 * Mesures de .ai/maquette-nuits.html (y : lignes de base).
 */

/** Les petits mots où le titre se coupe : « Histoire | du pêcheur », « The Story | of the Fisherman ». */
const LINK = /^(du|de|des|d’|d'|of)$/i;
const LINE2_FONT = (size: number): string => `${size}px ${GARAMOND}`;

/** Le titre en deux parts : ses premiers mots (au plus trois, jusqu'au petit mot) et la suite. */
const split = (title: string): [string, string] => {
  const words = title.split(' ');
  const at = words.slice(1, 4).findIndex((word) => LINK.test(word) || /^d[’']/i.test(word));
  return at < 0 ? ['', title] : [words.slice(0, at + 1).join(' '), words.slice(at + 1).join(' ')];
};

const centered = (context: CanvasRenderingContext2D, text: string, y: number, font: string, spacing: number): void => {
  context.font = font;
  context.letterSpacing = `${spacing}px`;
  context.fillStyle = INK;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(text, PAGE_CENTER, y);
  context.letterSpacing = '0px';
};

/** Les lignes de `text` à la police `font`, d'au plus `width` de large. */
const lines = (context: CanvasRenderingContext2D, text: string, font: string, width: number, spacing: number): string[] => {
  context.font = font;
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width + spacing * tried.length > width) {
      out.push(line);
      line = word;
    } else line = tried;
  }
  return line ? [...out, line] : out;
};

export const arabianNightsHead = (context: CanvasRenderingContext2D, title: string): void => {
  // Le bandeau : une frise de fleurons entre deux filets.
  context.fillStyle = INK;
  context.fillRect(LEFT + 40, 130 - 18, RIGHT - LEFT - 80, 1);
  context.fillRect(LEFT + 40, 130 + 18, RIGHT - LEFT - 80, 1);
  for (let x = LEFT + 58; x <= RIGHT - 58; x += 26) typeFlower(context, x, 130, 8);
  const [first, rest] = split(title);
  const text = `${rest}${/[.!?]$/.test(rest) ? '' : '.'}`.toUpperCase();
  const width = RIGHT - LEFT - 40;
  let y = first ? 246 : 228;
  if (first) centered(context, first.toUpperCase(), 210, `28px ${GARAMOND}`, 5);
  // La suite sur une ligne (à 21 px, ou plus petite jusqu'à 16 px), sinon sur deux lignes à 16 px.
  context.font = LINE2_FONT(21);
  const natural = context.measureText(text).width + 3 * text.length;
  const size = Math.max(16, Math.min(21, (21 * width) / natural));
  const rows = lines(context, text, LINE2_FONT(size), width, 3);
  if (rows.length > 1) y -= 10;
  rows.forEach((row, index) => centered(context, row, y + index * 22, LINE2_FONT(size), 3));
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 40, y + (rows.length - 1) * 22 + 24, 80, 1);
};
