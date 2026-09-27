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

const TEXTURE_SCALE = 2;

/**
 * Ombre de la gouttière, du dos vers la tranche (position en fraction de la largeur de page) :
 * le papier s'enfonce dans la reliure (creux sombre), se courbe (léger reflet), puis s'étale à plat.
 * Même profil pour les pages fixes (CSS) et la feuille qui tourne (canevas).
 */
const GUTTER: readonly [number, string][] = [
  [0, 'rgba(45, 25, 10, 0.5)'],
  [0.02, 'rgba(60, 35, 15, 0.3)'],
  [0.07, 'rgba(80, 50, 20, 0.1)'],
  [0.11, 'rgba(255, 246, 222, 0.08)'],
  [0.17, 'rgba(0, 0, 0, 0)'],
  [0.88, 'rgba(0, 0, 0, 0)'],
  [1, 'rgba(60, 35, 15, 0.18)'],
];

/** Dégradé CSS de la gouttière ; `toward` : sens du dos vers la tranche (90deg si le dos est à gauche). */
export const gutterCss = (toward: '90deg' | '270deg'): string =>
  `linear-gradient(${toward}, ${GUTTER.map(([at, color]) => `${color} ${(at * 100).toFixed(1)}%`).join(', ')})`;

/**
 * Page dessinée (feuille WebGL) : parchemin, ombre du pli côté dos, texte et fragment surligné.
 * spineOnLeft : le dos du livre est à gauche de la page (recto de la feuille) ou à droite (verso).
 */
export const drawPageTexture = (canvas: HTMLCanvasElement, lines: PageLines, spineOnLeft: boolean): void => {
  // Texture deux fois plus fine que la mise en page : le texte reste net sur les écrans denses.
  canvas.width = PAGE_TEXTURE.width * TEXTURE_SCALE;
  canvas.height = PAGE_TEXTURE.height * TEXTURE_SCALE;
  const context = canvas.getContext('2d')!;
  context.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  const { width, height } = PAGE_TEXTURE;

  const paper = context.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, '#efe2c4');
  paper.addColorStop(0.7, '#e2d1ab');
  paper.addColorStop(1, '#d6c299');
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);

  const gutter = context.createLinearGradient(spineOnLeft ? 0 : width, 0, spineOnLeft ? width : 0, 0);
  for (const [at, color] of GUTTER) gutter.addColorStop(at, color);
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
