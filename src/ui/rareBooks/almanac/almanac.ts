import { sealEvent } from '../../../systems/seals';
import { HEIGHT } from '../draw';
import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { NIGHT, RED, SPINE_WIDTH, almanacBack, almanacFront, almanacInside, almanacSpine } from './almanacCover';
import { loadAlmanacFonts } from './almanacDraw';
import { CONTENTS_PAGE, NOTE_PAGE, almanacLinks, loadAlmanacPageFonts, paintAlmanacPage } from './almanacPages';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
const THICKNESS = SPINE_WIDTH / (1.4 * HEIGHT);

/**
 * L'Almanach des sports 1950-2000 : un livre de poche de kiosque des années 80, cinquante ans de résultats
 * inventés. Couverture et pages d'après les maquettes (almanacCover.ts, almanacPages.ts) ; les résultats sont
 * tirés dans almanacSeasons.ts.
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
  prepare: async () => {
    await loadAlmanacPageFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    paintAlmanacPage(preparePageTexture(canvas, spineOnLeft, MODERN_PAPER), page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: almanacLinks,
  // Secret : dans les notes, le juron d'un lecteur venu avant (ou après).
  passed: (page, state) => {
    if (page === NOTE_PAGE) sealEvent(state, 'greatScott');
  },
};
