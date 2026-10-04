import { babelTextWidth, drawBabelText, hasBabelDigits } from '../babelDigits';
import { PAGE_FONT, PAGE_FONT_SIZE, PAGE_LINE_HEIGHT, PAGE_PADDING, PAGE_TEXTURE, type PageLines } from './pageLayout';

/** Numéro de page, en bas au centre, comme celui des grands livres (pageItems.ts). */
const PAGE_NUMBER_TOP = 730;
const PAGE_NUMBER_SIZE = 18;
const PAGE_NUMBER_FONT = `${PAGE_NUMBER_SIZE}px Georgia, 'Times New Roman', serif`;
const PAGE_NUMBER_INK = 'rgba(52, 36, 22, 0.55)';

const TEXTURE_SCALE = 2;

/** Papier des pages, de haut en bas : jauni pour les livres anciens, blanc pour les modernes. */
export type Paper = readonly [string, string, string];
export const OLD_PAPER: Paper = ['#efe2c4', '#e2d1ab', '#d6c299'];
export const MODERN_PAPER: Paper = ['#f8f6f0', '#f0ede5', '#e6e2d8'];

/**
 * Ombre de la gouttière, du dos vers la tranche (position en fraction de la largeur de page) :
 * le papier s'enfonce dans la reliure (creux sombre), se courbe (léger reflet), puis s'étale à plat.
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
  shadeGutter(context, spineOnLeft);
  return context;
};

/** L'ombre de la gouttière sur la page (un papier redessiné par-dessus la reprend). */
export const shadeGutter = (context: CanvasRenderingContext2D, spineOnLeft: boolean): void => {
  const { width, height } = PAGE_TEXTURE;
  const gutter = context.createLinearGradient(spineOnLeft ? 0 : width, 0, spineOnLeft ? width : 0, 0);
  for (const [at, color] of GUTTER) gutter.addColorStop(at, color);
  context.fillStyle = gutter;
  context.fillRect(0, 0, width, height);
};

/**
 * Encre de la trouvaille : brun sombre, un peu plus grasse que le texte (lisible), sur un halo doré vif
 * sur le papier : la lumière est derrière les lettres, pas sur elles.
 */
const FIND_INK = '#351800';
const FIND_HALO = 'rgba(240, 150, 20, 0.95)';
/** Lueur de la trouvaille (masque de lueur) : le halo autour des lettres, en or ; les lettres restent sombres. */
const GLOW_GOLD = 'rgb(255, 150, 20)';

/**
 * Lueur des pages dessinées : le masque (noir, un halo d'or autour de la trouvaille) qui la fait briller dans le livre 3D,
 * rangé à côté du canvas de la page. Pas d'entrée : la page ne brille pas.
 */
export const pageGlow = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

/**
 * Page dessinée (feuille WebGL) : parchemin, ombre du pli côté dos, texte, et le fragment trouvé écrit à
 * l'encre dorée qui luit (son masque de lueur va dans pageGlow).
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
    const baseline = cssBaseline(context, PAGE_NUMBER_TOP);
    if (hasBabelDigits(pageNumber)) {
      const left = (PAGE_TEXTURE.width - babelTextWidth(context, pageNumber, PAGE_NUMBER_SIZE)) / 2;
      drawBabelText(context, pageNumber, left, PAGE_NUMBER_TOP, PAGE_NUMBER_SIZE, baseline);
    } else context.fillText(pageNumber, PAGE_TEXTURE.width / 2, baseline);
    context.textAlign = 'start';
  }
  context.font = PAGE_FONT;
  context.textBaseline = 'alphabetic';
  const lineHeight = PAGE_FONT_SIZE * PAGE_LINE_HEIGHT;
  /** Morceaux de la trouvaille : où ils sont écrits. */
  const found: PageFind[] = [];
  lines.forEach((line, index) => {
    let x = PAGE_PADDING.x;
    const baseline = cssBaseline(context, PAGE_PADDING.y + index * lineHeight, lineHeight);
    for (const piece of line) {
      const pieceWidth = context.measureText(piece.text).width;
      if (piece.fragment) found.push({ text: piece.text, x, y: baseline });
      else {
        context.fillStyle = 'rgba(52, 36, 22, 0.82)';
        context.fillText(piece.text, x, baseline);
      }
      x += pieceWidth;
    }
  });
  pageGlow.delete(canvas);
  highlightFinds(canvas, context, found, PAGE_FONT);
};

/** Un mot surligné sur une page : son texte, et où il est écrit (début de la ligne de base). */
export interface PageFind {
  text: string;
  x: number;
  y: number;
}

/**
 * Surligne des mots déjà placés sur une page (police `font`) : encre sombre sur un halo doré, et le
 * masque de lueur qui les fait briller dans le livre 3D (pageGlow). Rien à surligner : rien ne change.
 */
export const highlightFinds = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  found: readonly PageFind[],
  font: string,
): void => {
  if (found.length === 0) return;
  context.font = font;
  context.textBaseline = 'alphabetic';
  // Sur le papier : un halo doré vif derrière les lettres, puis les lettres nettes, un peu grasses.
  context.save();
  context.shadowColor = FIND_HALO;
  context.fillStyle = FIND_INK;
  for (const blur of [16, 6]) {
    context.shadowBlur = blur;
    for (const { text, x, y } of found) context.fillText(text, x, y);
  }
  context.restore();
  context.strokeStyle = FIND_INK;
  context.lineWidth = 0.9;
  context.lineJoin = 'round';
  context.fillStyle = FIND_INK;
  for (const { text, x, y } of found) {
    context.strokeText(text, x, y);
    context.fillText(text, x, y);
  }
  // Masque de lueur, à la taille de la mise en page (une lueur n'a pas besoin d'être fine).
  const glow = document.createElement('canvas');
  glow.width = PAGE_TEXTURE.width;
  glow.height = PAGE_TEXTURE.height;
  const light = glow.getContext('2d')!;
  light.fillStyle = '#000';
  light.fillRect(0, 0, glow.width, glow.height);
  light.font = font;
  light.textBaseline = 'alphabetic';
  light.fillStyle = GLOW_GOLD;
  light.shadowColor = GLOW_GOLD;
  for (const blur of [28, 12, 5]) {
    light.shadowBlur = blur;
    for (const { text, x, y } of found) light.fillText(text, x, y);
  }
  // Les lettres elles-mêmes restent sombres (sinon la lueur les délave) : découpées, un peu épaissies.
  light.shadowBlur = 0;
  light.strokeStyle = '#000';
  light.lineWidth = 2;
  light.lineJoin = 'round';
  light.fillStyle = '#000';
  for (const { text, x, y } of found) {
    light.strokeText(text, x, y);
    light.fillText(text, x, y);
  }
  pageGlow.set(canvas, glow);
};
