import { PAGE_TEXTURE } from '../book/pageLayout';
import { preparePageTexture, type Paper } from '../book/pageRender';
import { rasterizeSvg } from '../book3d/textures';
import { paperWear, WEAR_HEIGHT, WEAR_WIDTH } from './wear';

/** Papier d'écolier, blanc cassé, un peu jauni vers le bas. */
export const NOTEBOOK_PAPER: Paper = ['#f4f1e8', '#eeeadf', '#e5dfd0'];

/** Petits carreaux (repère de la texture, 640 × 800) : 16 unités, environ 4 mm sur un cahier de 17 cm. */
export const GRID = 16;
/** Ligne rouge de la marge, à gauche de chaque page comme dans un cahier d'écolier. */
export const MARGIN = 6 * GRID;
/** Écriture : après la marge, jusqu'à un carreau et demi du bord. */
export const TEXT_LEFT = MARGIN + 2 * GRID;
export const TEXT_RIGHT = PAGE_TEXTURE.width - 3 * GRID;

/** Usures du papier, tirées une fois : les pages se les partagent (une page sur deux a sa tache de café). */
const WEARS = 6;
export const loadPaperWear = (): Promise<HTMLCanvasElement[]> =>
  Promise.all(Array.from({ length: WEARS }, (_, i) => rasterizeSvg(paperWear(60 + i, { coffee: i % 2 === 0 }), WEAR_WIDTH, WEAR_HEIGHT)));

/**
 * Fond d'une page du cahier : papier et ombre du pli, carreaux bleus pâles, marge rouge, usure. Renvoie
 * le contexte, dans le repère de la mise en page, pour y écrire.
 */
export const paintNotebookPaper = (canvas: HTMLCanvasElement, spineOnLeft: boolean, wear?: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = preparePageTexture(canvas, spineOnLeft, NOTEBOOK_PAPER);
  const { width, height } = PAGE_TEXTURE;
  context.fillStyle = 'rgba(70, 115, 185, 0.2)';
  for (let x = GRID; x < width; x += GRID) context.fillRect(x, 0, 0.8, height);
  for (let y = GRID; y < height; y += GRID) context.fillRect(0, y, width, 0.8);
  context.fillStyle = 'rgba(205, 55, 70, 0.55)';
  context.fillRect(MARGIN, 0, 1.4, height);
  // Usure adoucie : un cahier qui a vécu, pas un parchemin.
  if (wear) {
    context.globalAlpha = 0.6;
    context.drawImage(wear, 0, 0, width, height);
    context.globalAlpha = 1;
  }
  return context;
};
