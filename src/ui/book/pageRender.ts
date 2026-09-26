import { el } from '../dom';
import {
  PAGE_FONT,
  PAGE_FONT_SIZE,
  PAGE_LINE_HEIGHT,
  PAGE_PADDING,
  PAGE_TEXTURE,
  type PageLines,
} from './pageLayout';

/** Page HTML (pages fixes du livre) : les lignes déjà calculées, à l'échelle de la page. */
export const renderPageHtml = (target: HTMLElement, lines: PageLines): void => {
  const text = el('span', 'page-text');
  for (const line of lines) {
    const row = el('span', 'page-line');
    for (const piece of line) {
      row.append(piece.fragment ? el('mark', 'fragment', piece.text) : document.createTextNode(piece.text));
    }
    text.append(row);
  }
  target.replaceChildren(text);
};

/**
 * Page dessinée (feuille WebGL) : parchemin, ombre du pli côté dos, texte et fragment surligné.
 * spineOnLeft : le dos du livre est à gauche de la page (recto de la feuille) ou à droite (verso).
 */
export const drawPageTexture = (canvas: HTMLCanvasElement, lines: PageLines, spineOnLeft: boolean): void => {
  canvas.width = PAGE_TEXTURE.width;
  canvas.height = PAGE_TEXTURE.height;
  const context = canvas.getContext('2d')!;
  const { width, height } = PAGE_TEXTURE;

  const paper = context.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, '#efe2c4');
  paper.addColorStop(0.7, '#e2d1ab');
  paper.addColorStop(1, '#d6c299');
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);

  const gutter = context.createLinearGradient(spineOnLeft ? 0 : width, 0, spineOnLeft ? width : 0, 0);
  gutter.addColorStop(0, 'rgba(80, 50, 20, 0.45)');
  gutter.addColorStop(0.28, 'rgba(0, 0, 0, 0)');
  gutter.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
  gutter.addColorStop(1, 'rgba(60, 35, 15, 0.18)');
  context.fillStyle = gutter;
  context.fillRect(0, 0, width, height);

  context.font = PAGE_FONT;
  context.textBaseline = 'top';
  const lineHeight = PAGE_FONT_SIZE * PAGE_LINE_HEIGHT;
  lines.forEach((line, index) => {
    let x = PAGE_PADDING.x;
    const y = PAGE_PADDING.y + index * lineHeight;
    for (const piece of line) {
      const pieceWidth = context.measureText(piece.text).width;
      if (piece.fragment) {
        context.fillStyle = 'rgba(242, 198, 121, 0.6)';
        context.fillRect(x - 2, y + 2, pieceWidth + 4, PAGE_FONT_SIZE + 4);
        context.fillStyle = '#2a1608';
      } else {
        context.fillStyle = 'rgba(52, 36, 22, 0.82)';
      }
      context.fillText(piece.text, x, y + 4);
      x += pieceWidth;
    }
  });
};
