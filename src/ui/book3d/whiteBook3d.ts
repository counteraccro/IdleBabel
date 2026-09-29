import type * as THREE from 'three';
import { createVellum } from '../whiteBook/vellum';
import { createWhiteBookPages } from '../whiteBook/pages';
import { WHITE_PAPER } from '../whiteBook/whiteBookPage';
import { headbandTexture } from './headband';
import { edgeTexture, svgTexture } from './textures';
import { leafPagesBook } from './leafPages';
import type { Book3d } from './book3dBook';
import type { GameState } from '../../core/state';

/** Plat de vélin rendu en image, à la taille d'une texture. */
const vellumTexture = (seed: number, stamped: boolean, ornaments = true): Promise<THREE.CanvasTexture> =>
  svgTexture(createVellum(seed, stamped, { ornaments }).querySelector('svg')!, 800, 1000);

/** Le livre des Connaissances : vélin crème, tranche dorée, grand et épais. */
export const whiteBook3d = (state: GameState): Book3d => {
  const book: Book3d = {
    // Proportions d'un grand livre : 4 × 5, épais (410 pages), plats solides qui débordent un peu.
    // Plats qui débordent nettement des pages : le coin carré du bloc reste caché sous leur coin arrondi.
    shape: { width: 0.8, height: 1, thickness: 0.16, board: 0.018, overhang: 0.02, corner: 0.035 },
    // La liste des pages commence déjà par l'intérieur de la couverture (null) : mêmes places qu'en 3D.
    ...leafPagesBook(() => createWhiteBookPages(state, (page) => book.navigate?.(page)), 0, WHITE_PAPER),
    look: async () => {
      const [cover, back, spine] = await Promise.all([vellumTexture(3, true), vellumTexture(11, false), vellumTexture(19, false, false)]);
      return {
        cover,
        back,
        inside: spine,
        spine,
        leather: 0xe8dcc0,
        edge: edgeTexture('#d6ae5a', '#a47d2e'),
        paper: 0xf3eee2,
        headband: headbandTexture('#c8993f', '#efe4c6'),
      };
    },
    // Phrases qui se complètent, notes au crayon : les pages suivent la partie.
    live: true,
  };
  return book;
};
