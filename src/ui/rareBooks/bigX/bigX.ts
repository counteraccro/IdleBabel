import { MODERN_PAPER } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { loremPages } from '../defaultArt';
import { CREAM, INK, RED, THICKNESS, bigXBack, bigXFront, bigXInside, bigXSpine, loadBigXFonts } from './bigXCover';
import type { RareBookArt } from '../rareBookArt';

/**
 * Le grand livre du X : l'histoire de la lettre X, en douze chapitres qui finissent tous en x, et dont la
 * plus grande part est écrite en langue X. Couverture d'après la maquette (bigXCover.ts) ; les pages restent
 * à dessiner (page de titre et lorem ipsum en attendant).
 */
export const bigXArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await loadBigXFonts();
    return {
      cover: bigXFront(),
      back: bigXBack(),
      inside: bigXInside(),
      spine: bigXSpine(),
      leather: Number.parseInt(CREAM[1].slice(1), 16),
      edge: edgeTexture(MODERN_PAPER[1], '#d8d3c8'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture(INK, RED),
      ribbon: RED,
    };
  },
  paint: loremPages('bigX', MODERN_PAPER),
};
