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
/**
 * Une page du livre en main : sa version HTML (posée à plat) et sa version dessinée (la feuille qui
 * tourne). D'ordinaire des lignes de texte (textPage) ; le livre étrange y met aussi ses propres pages.
 */
export interface PageView {
  html: (target: HTMLElement) => void;
  texture: (canvas: HTMLCanvasElement, spineOnLeft: boolean, paper: Paper) => void;
}

/** Numéro de page, en bas au centre, comme celui des grands livres (pageItems.ts) ; même place en HTML (book.css). */
const PAGE_NUMBER_TOP = 730;
const PAGE_NUMBER_FONT = `18px Georgia, 'Times New Roman', serif`;
const PAGE_NUMBER_INK = 'rgba(52, 36, 22, 0.55)';

export const renderPageHtml = (target: HTMLElement, lines: PageLines, pageNumber?: string): void => {
  const text = el('span', 'page-text');
  for (const line of lines) {
    const row = el('span', 'page-line');
    for (const piece of line) {
      row.append(piece.fragment ? el('mark', 'fragment', piece.text) : document.createTextNode(piece.text));
    }
    text.append(row);
  }
  target.replaceChildren(text);
  if (pageNumber) target.append(el('span', 'page-number', pageNumber));
};

const TEXTURE_SCALE = 2;

/** Papier des pages, de haut en bas : jauni pour les livres anciens, blanc pour les modernes. */
export type Paper = readonly [string, string, string];
export const OLD_PAPER: Paper = ['#efe2c4', '#e2d1ab', '#d6c299'];
export const MODERN_PAPER: Paper = ['#f8f6f0', '#f0ede5', '#e6e2d8'];

/** Même papier pour les pages fixes (CSS) et la feuille qui tourne (canevas). */
export const paperCss = (paper: Paper): string => `linear-gradient(180deg, ${paper[0]}, ${paper[1]} 70%, ${paper[2]})`;

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

/** Hauteurs de la police courante du contexte au-dessus et au-dessous de la ligne de base. */
const fontBox = (context: CanvasRenderingContext2D): { ascent: number; descent: number } => {
  const metrics = context.measureText('M');
  return { ascent: metrics.fontBoundingBoxAscent, descent: metrics.fontBoundingBoxDescent };
};

/**
 * Ligne de base d'un texte placé comme en CSS, dans une ligne qui commence à `top` : avec une hauteur
 * de ligne `lineHeight`, la police (ascendante + descendante) y est centrée ; sans (line-height:
 * normal), la ligne a la hauteur de la police et la ligne de base est à une ascendante du haut.
 * À dessiner avec textBaseline = 'alphabetic'. (textBaseline = 'top' cale le haut du carré de la
 * lettre, plus haut : le texte sautait de quelques pixels quand la page HTML laissait place à sa
 * photo au début d'un tour.)
 */
export const cssBaseline = (context: CanvasRenderingContext2D, top: number, lineHeight?: number): number => {
  const { ascent, descent } = fontBox(context);
  return top + ((lineHeight ?? ascent + descent) - (ascent + descent)) / 2 + ascent;
};

/**
 * Fond d'une page dessinée (feuille WebGL) : papier et ombre du dos, à la résolution de la texture.
 * Renvoie un contexte dans le repère de la mise en page (PAGE_TEXTURE).
 */
export const preparePageTexture = (
  canvas: HTMLCanvasElement,
  spineOnLeft: boolean,
  paperColors: Paper = OLD_PAPER,
): CanvasRenderingContext2D => {
  // Texture deux fois plus fine que la mise en page : le texte reste net sur les écrans denses.
  canvas.width = PAGE_TEXTURE.width * TEXTURE_SCALE;
  canvas.height = PAGE_TEXTURE.height * TEXTURE_SCALE;
  const context = canvas.getContext('2d')!;
  context.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  const { width, height } = PAGE_TEXTURE;

  const paper = context.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, paperColors[0]);
  paper.addColorStop(0.7, paperColors[1]);
  paper.addColorStop(1, paperColors[2]);
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);

  const gutter = context.createLinearGradient(spineOnLeft ? 0 : width, 0, spineOnLeft ? width : 0, 0);
  for (const [at, color] of GUTTER) gutter.addColorStop(at, color);
  context.fillStyle = gutter;
  context.fillRect(0, 0, width, height);
  return context;
};

/**
 * Page dessinée (feuille WebGL) : parchemin, ombre du pli côté dos, texte et fragment surligné.
 * spineOnLeft : le dos du livre est à gauche de la page (recto de la feuille) ou à droite (verso).
 */
export const drawPageTexture = (
  canvas: HTMLCanvasElement,
  lines: PageLines,
  spineOnLeft: boolean,
  paperColors: Paper = OLD_PAPER,
  pageNumber?: string,
): void => {
  const context = preparePageTexture(canvas, spineOnLeft, paperColors);
  if (pageNumber) {
    context.font = PAGE_NUMBER_FONT;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillStyle = PAGE_NUMBER_INK;
    context.fillText(pageNumber, PAGE_TEXTURE.width / 2, cssBaseline(context, PAGE_NUMBER_TOP));
    context.textAlign = 'start';
  }
  context.font = PAGE_FONT;
  context.textBaseline = 'alphabetic';
  const lineHeight = PAGE_FONT_SIZE * PAGE_LINE_HEIGHT;
  const { ascent, descent } = fontBox(context);
  lines.forEach((line, index) => {
    let x = PAGE_PADDING.x;
    const baseline = cssBaseline(context, PAGE_PADDING.y + index * lineHeight, lineHeight);
    for (const piece of line) {
      const pieceWidth = context.measureText(piece.text).width;
      if (piece.fragment) {
        // Fond d'un <mark> : la hauteur de la police, autour du texte.
        context.fillStyle = 'rgba(242, 198, 121, 0.6)';
        context.fillRect(x, baseline - ascent, pieceWidth, ascent + descent);
        context.fillStyle = '#2a1608';
      } else {
        context.fillStyle = 'rgba(52, 36, 22, 0.82)';
      }
      context.fillText(piece.text, x, baseline);
      x += pieceWidth;
    }
  });
};

/** Page de texte (charabia de Babel, fragment surligné), avec son numéro imprimé. */
export const textPage = (lines: PageLines, pageNumber?: string): PageView => ({
  html: (target) => renderPageHtml(target, lines, pageNumber),
  texture: (canvas, spineOnLeft, paper) => drawPageTexture(canvas, lines, spineOnLeft, paper, pageNumber),
});
