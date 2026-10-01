import { messages } from '../../i18n';
import { hashText, seeded } from '../../core/random';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { PAGE_CENTER, wrap, write } from './draw';
import { INK, ITALIC, MODERN, MONO } from './alexHCover';
import { SNIPPETS } from './alexHCode';
import { loremText } from './lorem';

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
const LEFT = 62;
const RIGHT = WIDTH - 62;
/** Bas du texte, au-dessus du folio. */
const BOTTOM = HEIGHT - 90;
const BODY = `19px Georgia, 'Times New Roman', serif`;
const LINE = 28;
const CODE_LINE = 21;
const GREY = '#6b6b6b';

/** Un numéro de PR (quatre chiffres) ou un commit (sept caractères hexadécimaux). */
const reference = (random: () => number): string =>
  messages()
    .rareBooks.alexH.refs[Math.floor(random() * messages().rareBooks.alexH.refs.length)].replace(
      '{n}',
      String(1000 + Math.floor(random() * 9000)),
    )
    .replace(
      '{hash}',
      Math.floor(random() * 0xfffffff)
        .toString(16)
        .padStart(7, '0'),
    );

/** Espaces insécables de la typographie française : « » et : ; ? ! ne restent jamais seuls en bout de ligne. */
const unbreakable = (text: string): string => text.replace(/« /g, '«\u00a0').replace(/ ([»:;?!])/g, '\u00a0$1');

/** Un paragraphe de lorem ipsum, parfois avec un renvoi à une PR glissé avant un point. */
const paragraph = (random: () => number): string => {
  const text = loremText(180 + random() * 260, random);
  if (random() > 0.5) return text;
  const sentences = text.split('. ');
  const at = Math.floor(random() * sentences.length);
  sentences[at] = `${sentences[at].replace(/\.$/, '')} ${reference(random)}`;
  return sentences.join('. ').replace(/\)$/, ').');
};

/** Les lignes d'un paragraphe, de `top` jusqu'au bas de la page au plus (la suite est coupée) ; renvoie le bas. */
const writeParagraph = (context: CanvasRenderingContext2D, text: string, top: number): number => {
  context.font = BODY;
  // Alinéa : la première ligne est rentrée.
  const lines = wrap(context, `\u2003\u2003${unbreakable(text)}`, RIGHT - LEFT);
  let y = top;
  for (const line of lines) {
    if (y + LINE > BOTTOM) return BOTTOM;
    write(context, line, LEFT, y, { font: BODY, color: INK, align: 'left' });
    y += LINE;
  }
  return y + 8;
};

/** Une ligne d'un vrai texte ; `end` : la dernière de son paragraphe (un peu d'air après). */
export interface StoryLine {
  text: string;
  end: boolean;
}

/** Les lignes d'un vrai texte (le début d'un chapitre), paragraphe par paragraphe, chacun avec son alinéa. */
export const storyLines = (context: CanvasRenderingContext2D, paragraphs: readonly string[]): StoryLine[] => {
  context.font = BODY;
  return paragraphs.flatMap((text) => {
    const lines = wrap(context, `\u2003\u2003${unbreakable(text)}`, RIGHT - LEFT);
    return lines.map((line, index) => ({ text: line, end: index === lines.length - 1 }));
  });
};

/**
 * Écrit les lignes d'un vrai texte à partir de `top`, tant qu'elles tiennent (sans rien dessiner si `draw` est
 * faux : pour savoir où la page suivante reprend) ; renvoie le bas atteint et le nombre de lignes écrites.
 */
export const writeStory = (
  context: CanvasRenderingContext2D,
  lines: readonly StoryLine[],
  top: number,
  draw = true,
): { y: number; count: number } => {
  let y = top;
  let count = 0;
  for (const { text, end } of lines) {
    if (y + LINE > BOTTOM) return { y: BOTTOM, count };
    if (draw) write(context, text, LEFT, y, { font: BODY, color: INK, align: 'left' });
    y += LINE + (end ? 8 : 0);
    count++;
  }
  return { y, count };
};

/** Un extrait de code sur fond gris, une barre verte à gauche ; rien s'il ne tient pas. */
const writeCode = (context: CanvasRenderingContext2D, lines: string[], top: number): number => {
  const height = lines.length * CODE_LINE + 24;
  if (top + height > BOTTOM) return top;
  context.fillStyle = 'rgba(0, 0, 0, 0.06)';
  context.fillRect(LEFT, top, RIGHT - LEFT, height);
  context.fillStyle = '#1d7a3a';
  context.fillRect(LEFT, top, 4, height);
  lines.forEach((line, index) =>
    write(context, line, LEFT + 20, top + 12 + index * CODE_LINE, { font: `14px ${MONO}`, color: '#2a2a2a', align: 'left' }),
  );
  return top + height + 18;
};

/** Une citation en exergue, centrée entre deux filets ; rien si elle ne tient pas. */
const writeQuote = (context: CanvasRenderingContext2D, quote: string, top: number): number => {
  if (top + 90 > BOTTOM) return top;
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 30, top + 6, 60, 1);
  write(context, quote, PAGE_CENTER, top + 24, { font: `italic 500 26px ${ITALIC}`, color: INK });
  context.fillRect(PAGE_CENTER - 30, top + 72, 60, 1);
  return top + 96;
};

/** Le titre courant en haut de page : le nom à gauche, le chapitre à droite ; le folio en bas. */
export const pageFrame = (context: CanvasRenderingContext2D, page: number, chapterTitle: string): void => {
  const left = page % 2 === 0;
  write(context, left ? 'ALEXH' : chapterTitle, left ? LEFT : RIGHT, 40, {
    font: left ? `500 12px ${MODERN}` : `italic 500 15px ${ITALIC}`,
    color: GREY,
    align: left ? 'left' : 'right',
    spacing: left ? 3 : 0,
  });
  write(context, String(page), PAGE_CENTER, HEIGHT - 58, { font: `13px ${MODERN}`, color: GREY });
};

/**
 * Le récit, de `top` au bas de la page : des paragraphes de lorem ipsum avec des renvois aux PR, parfois
 * un extrait de code ou une citation. Toujours le même pour une page donnée.
 */
export const writeProse = (context: CanvasRenderingContext2D, page: number, top: number): void => {
  const random = seeded(hashText(`alexH:${page}`));
  const { pullQuotes } = messages().rareBooks.alexH;
  let codeDone = false;
  let quoteDone = false;
  let y = top;
  while (y < BOTTOM - LINE) {
    const roll = random();
    if (!codeDone && roll < 0.22) {
      codeDone = true;
      y = writeCode(context, SNIPPETS[Math.floor(random() * SNIPPETS.length)], y + 4);
    } else if (!quoteDone && roll < 0.28) {
      quoteDone = true;
      y = writeQuote(context, pullQuotes[Math.floor(random() * pullQuotes.length)], y + 4);
    } else y = writeParagraph(context, paragraph(random), y);
  }
};
