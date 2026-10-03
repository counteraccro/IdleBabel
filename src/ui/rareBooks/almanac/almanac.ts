import { HEIGHT } from '../draw';
import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { NIGHT, RED, SPINE_WIDTH, almanacBack, almanacFront, almanacInside, almanacSpine } from './almanacCover';
import { loadAlmanacFonts } from './almanacDraw';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
const THICKNESS = SPINE_WIDTH / (1.4 * HEIGHT);

/**
 * L'Almanach des sports 1950-2000 : un livre de poche de kiosque des années 80, cinquante ans de résultats
 * inventés. Couverture d'après la maquette (almanacCover.ts) ; les pages restent blanches en attendant la
 * leur.
 */
export const almanacArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await loadAlmanacFonts();
    return {
      cover: almanacFront(),
      back: almanacBack(),
      inside: almanacInside(),
      spine: almanacSpine(),
      leather: NIGHT,
      edge: edgeTexture(MODERN_PAPER[1], '#d8d3c8'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#141a44', RED),
      ribbon: RED,
    };
  },
  paint: (_page, canvas, spineOnLeft) => {
    preparePageTexture(canvas, spineOnLeft, MODERN_PAPER);
    return true;
  },
};
