import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, wrap, write } from '../draw';
import { loremText } from '../lorem';
import { BODY_FACE, DISPLAY, INK, SANS } from './orianaCover';

/**
 * Le texte courant du livre et ses notes de bas de page : celles d'Oriana, qui corrige son biographe. Elles
 * grandissent de page en page, jusqu'à manger presque toute la page vers la fin.
 */

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
export const LEFT = 62;
export const RIGHT = WIDTH - 62;
/** Bas du texte, au-dessus du folio. */
export const BOTTOM = HEIGHT - 90;
export const BODY = `17px ${BODY_FACE}`;
export const LINE = 28;
export const NOTE = `13.5px ${BODY_FACE}`;
export const NOTE_LINE = 20;
/** Entre le bas du texte et le filet de la note. */
const NOTE_GAP = 22;
export const GREY = '#6b6b6b';

/** Le premier et le dernier chapitre à notes : la note grandit de l'un à l'autre. */
const GROWTH_FROM = 9;
const GROWTH_TO = 339;

/** Espaces insécables de la typographie française : « » et : ; ? ! ne restent jamais seuls en bout de ligne. */
export const unbreakable = (text: string): string => text.replace(/« /g, '« ').replace(/ ([»:;?!])/g, ' $1');

/** Une ligne d'un vrai texte ; `end` : la dernière de son paragraphe (un peu d'air après). */
export interface StoryLine {
  text: string;
  end: boolean;
}

/** Les lignes d'un vrai texte (le début d'un chapitre), paragraphe par paragraphe, chacun avec son alinéa. */
export const storyLines = (context: CanvasRenderingContext2D, paragraphs: readonly string[]): StoryLine[] => {
  context.font = BODY;
  return paragraphs.flatMap((text) => {
    const lines = wrap(context, `  ${unbreakable(text)}`, RIGHT - LEFT);
    return lines.map((line, index) => ({ text: line, end: index === lines.length - 1 }));
  });
};

/**
 * Écrit les lignes d'un vrai texte de `top` à `bottom`, tant qu'elles tiennent (sans rien dessiner si `draw`
 * est faux : pour savoir où la page suivante reprend) ; renvoie le bas atteint et le nombre de lignes écrites.
 */
export const writeStory = (
  context: CanvasRenderingContext2D,
  lines: readonly StoryLine[],
  top: number,
  bottom = BOTTOM,
  draw = true,
): { y: number; count: number } => {
  let y = top;
  let count = 0;
  for (const { text, end } of lines) {
    if (y + LINE > bottom) return { y: bottom, count };
    if (draw) write(context, text, LEFT, y, { font: BODY, color: INK, align: 'left' });
    y += LINE + (end ? 8 : 0);
    count++;
  }
  return { y, count };
};

/** Les lignes d'une note (appel « ¹ », signée « — O. » si `signed`), à la police `font`. */
export const noteLines = (context: CanvasRenderingContext2D, text: string, signed = true, font = NOTE): string[] => {
  context.font = font;
  const sign = signed ? ` ${messages().rareBooks.oriana.noteSign}` : '';
  return wrap(context, unbreakable(`${text}${sign}`), RIGHT - LEFT);
};

/** Le haut de la zone de texte laissée par une note de `count` lignes en bas de page. */
export const noteTop = (count: number): number => (count ? BOTTOM - count * NOTE_LINE - NOTE_GAP : BOTTOM);

/** La note en bas de page : un filet court, puis ses lignes, qui finissent au bas du texte. */
export const writeNote = (context: CanvasRenderingContext2D, lines: readonly string[]): void => {
  if (!lines.length) return;
  const top = noteTop(lines.length);
  context.fillStyle = '#555555';
  context.fillRect(LEFT, top + 8, 150, 1);
  lines.forEach((line, index) =>
    write(context, line, LEFT, top + NOTE_GAP + index * NOTE_LINE - 4, { font: NOTE, color: '#333333', align: 'left' }),
  );
};

/**
 * La note d'Oriana sur une page de récit : plus fréquente et plus longue à mesure qu'on avance. Au début, une
 * ligne de temps en temps ; vers la fin, elle enchaîne remarque sur remarque et prend presque toute la page.
 */
export const pageNote = (context: CanvasRenderingContext2D, page: number): string[] => {
  const random = seeded(hashText(`oriana:note:${page}`));
  const progress = Math.min(1, Math.max(0, (page - GROWTH_FROM) / (GROWTH_TO - GROWTH_FROM)));
  if (random() > 0.3 + 0.7 * progress) return [];
  const most = Math.round(2 + progress ** 1.6 * 20);
  const { notes } = messages().rareBooks.oriana;
  const order = notes.map((note) => ({ note, key: random() })).sort((a, b) => a.key - b.key);
  let said = `¹ ${order[0].note}`;
  for (const { note } of order.slice(1)) {
    if (noteLines(context, `${said} ${note}`).length > most) break;
    said = `${said} ${note}`;
  }
  return noteLines(context, said);
};

/** Le titre courant en haut de page : le nom à gauche, le chapitre à droite ; le folio en bas. */
export const pageFrame = (context: CanvasRenderingContext2D, page: number, chapterTitle: string): void => {
  const left = page % 2 === 0;
  write(context, left ? 'ORIANA' : chapterTitle, left ? LEFT : RIGHT, 40, {
    font: left ? `500 12px ${SANS}` : `italic 15px ${DISPLAY}`,
    color: GREY,
    align: left ? 'left' : 'right',
    spacing: left ? 3 : 0,
  });
  folio(context, page);
};

export const folio = (context: CanvasRenderingContext2D, page: number): void =>
  write(context, String(page), PAGE_CENTER, HEIGHT - 58, { font: `13px ${BODY_FACE}`, color: GREY });

/** Les lignes d'un paragraphe, de `top` jusqu'à `bottom` au plus (la suite est coupée) ; renvoie le bas. */
const writeParagraph = (context: CanvasRenderingContext2D, text: string, top: number, bottom: number): number => {
  context.font = BODY;
  let y = top;
  for (const line of wrap(context, `  ${text}`, RIGHT - LEFT)) {
    if (y + LINE > bottom) return bottom;
    write(context, line, LEFT, y, { font: BODY, color: INK, align: 'left' });
    y += LINE;
  }
  return y + 8;
};

/** Une de ses phrases en exergue, centrée entre deux filets ; rien si elle ne tient pas. */
const writeQuote = (context: CanvasRenderingContext2D, quote: string, top: number, bottom: number): number => {
  if (top + 90 > bottom) return top;
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 30, top + 6, 60, 1);
  write(context, unbreakable(quote), PAGE_CENTER, top + 24, { font: `italic 26px ${DISPLAY}`, color: INK });
  context.fillRect(PAGE_CENTER - 30, top + 72, 60, 1);
  return top + 96;
};

/**
 * Le récit, de `top` à `bottom` : des paragraphes de lorem ipsum, parfois une de ses phrases en exergue ;
 * `called` : le premier paragraphe porte l'appel de la note « ¹ ». Toujours le même pour une page donnée.
 */
export const writeProse = (context: CanvasRenderingContext2D, page: number, top: number, bottom: number, called: boolean): void => {
  const random = seeded(hashText(`oriana:${page}`));
  const { pullQuotes } = messages().rareBooks.oriana;
  let quoteDone = false;
  let first = true;
  let y = top;
  while (y < bottom - LINE) {
    if (!quoteDone && !first && random() < 0.12) {
      quoteDone = true;
      y = writeQuote(context, pullQuotes[Math.floor(random() * pullQuotes.length)], y + 4, bottom);
      continue;
    }
    const text = loremText(160 + random() * 240, random);
    y = writeParagraph(context, first && called ? `${text}¹` : text, y, bottom);
    first = false;
  }
};
