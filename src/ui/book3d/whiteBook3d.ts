import type * as THREE from 'three';
import { createVellum } from '../whiteBook/vellum';
import { createWhiteBookPages } from '../whiteBook/pages';
import { WHITE_PAPER } from '../whiteBook/whiteBookPage';
import { headbandTexture } from './headband';
import { edgeTexture, svgTexture } from './textures';
import type { Book3d } from './book3dBook';
import type { GameState } from '../../core/state';

/** Plat de vélin rendu en image, à la taille d'une texture. */
const vellumTexture = (seed: number, stamped: boolean, ornaments = true): Promise<THREE.CanvasTexture> =>
  svgTexture(createVellum(seed, stamped, { ornaments }).querySelector('svg')!, 800, 1000);

/** Le livre des Connaissances : vélin crème, tranche dorée, grand et épais. */
export const whiteBook3d = (state: GameState): Book3d => {
  const leaves = createWhiteBookPages(state, () => {});
  return {
    // Proportions d'un grand livre : 4 × 5, épais (410 pages), plats solides qui débordent un peu.
    shape: { width: 0.8, height: 1, thickness: 0.16, board: 0.018, overhang: 0.012, corner: 0.035 },
    source: {
      // Sans les pages vierges de la fin (le livre 2D en ajoute une pour finir sur une double page) :
      // la dernière feuille qui tourne découvre le plat arrière.
      count: leaves.length - [...leaves].reverse().findIndex((leaf) => leaf !== null),
      paint: (index, canvas, spineOnLeft) => {
        leaves[index]?.paint(canvas, spineOnLeft, WHITE_PAPER);
        return !!leaves[index];
      },
    },
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
  };
};
