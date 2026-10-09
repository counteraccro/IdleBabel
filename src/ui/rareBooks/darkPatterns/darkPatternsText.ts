import { text } from './darkPatternsDraw';

/** Le papier, l'encre et le gris des pages (maquette .ai/maquette-dark-patterns-pages.html). */
export const PAPER = '#fbfaf6';
export const INK = '#1d1b24';
export const SOFT = '#6f6b78';

/** Lignes de `label` d'au plus `width` ; la ponctuation haute (« ? », « ! », « : », « » ») reste avec son mot. */
export const lines = (context: CanvasRenderingContext2D, label: string, font: string, width: number): string[] => {
  context.save();
  context.font = font;
  const out: string[] = [];
  let line = '';
  for (const word of label
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/« /g, '« ')
    .split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width) {
      out.push(line);
      line = word;
    } else line = tried;
  }
  context.restore();
  return line ? [...out, line] : out;
};

/** Un paragraphe à partir de la ligne de base `y` ; renvoie la ligne de base suivante. */
export const paragraph = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  width: number,
  font: string,
  lineHeight: number,
  color: string,
  align: 'left' | 'center' = 'left',
): number => {
  let baseline = y;
  for (const line of lines(context, label, font, width)) {
    text(context, line, align === 'center' ? x + width / 2 : x, baseline, font, color, align);
    baseline += lineHeight;
  }
  return baseline;
};
