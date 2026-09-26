import type { PageContent } from '../../systems/babelText';

/**
 * Mise en page commune aux pages HTML et à la feuille dessinée en WebGL :
 * les retours à la ligne sont calculés une fois, à une taille de référence,
 * pour que le texte ne saute pas quand la feuille se pose.
 */
export const PAGE_TEXTURE = { width: 640, height: 800 };
export const PAGE_FONT_SIZE = 26;
export const PAGE_LINE_HEIGHT = 1.45;
export const PAGE_PADDING = { x: 62, y: 69 };
export const PAGE_FONT = `${PAGE_FONT_SIZE}px Georgia, 'Times New Roman', serif`;

export interface LinePiece {
  text: string;
  fragment: boolean;
}
export type PageLines = LinePiece[][];

let measureContext: CanvasRenderingContext2D | null = null;
const measure = (text: string): number => {
  measureContext ??= document.createElement('canvas').getContext('2d')!;
  measureContext.font = PAGE_FONT;
  return measureContext.measureText(text).width;
};

const maxLines = (): number =>
  Math.floor((PAGE_TEXTURE.height - 2 * PAGE_PADDING.y) / (PAGE_FONT_SIZE * PAGE_LINE_HEIGHT));

/** Coupe la page en lignes (par mots, un mot trop long est coupé) ; ce qui dépasse est ignoré. */
export const layoutPage = (page: PageContent): PageLines => {
  const width = PAGE_TEXTURE.width - 2 * PAGE_PADDING.x;
  const words: LinePiece[] = [];
  const pushWords = (text: string, fragment: boolean): void => {
    for (const word of text.split(' ')) if (word) words.push({ text: word, fragment });
  };
  pushWords(page.before, false);
  if (page.fragment) pushWords(page.fragment, true);
  pushWords(page.after, false);

  const lines: PageLines = [];
  let line: LinePiece[] = [];
  let lineText = '';
  const flush = (): void => {
    lines.push(line);
    line = [];
    lineText = '';
  };
  const append = (piece: LinePiece): void => {
    const last = line[line.length - 1];
    if (last && last.fragment === piece.fragment) last.text += piece.text;
    else line.push({ ...piece });
    lineText += piece.text;
  };

  for (const word of words) {
    let rest = word.text;
    while (rest && lines.length < maxLines()) {
      const separator = lineText ? ' ' : '';
      if (measure(lineText + separator + rest) <= width) {
        if (separator) append({ text: ' ', fragment: word.fragment && line[line.length - 1]?.fragment === true });
        append({ text: rest, fragment: word.fragment });
        rest = '';
      } else if (!lineText) {
        // Mot plus long qu'une ligne : on le coupe.
        let cut = rest.length;
        while (cut > 1 && measure(rest.slice(0, cut)) > width) cut--;
        append({ text: rest.slice(0, cut), fragment: word.fragment });
        flush();
        rest = rest.slice(cut);
      } else {
        flush();
      }
    }
    if (lines.length >= maxLines()) break;
  }
  if (line.length && lines.length < maxLines()) flush();
  return lines;
};
