import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { sealEvent } from '../../../systems/seals';
import { CREAM, INK, RED, THICKNESS, bigXBack, bigXFront, bigXInside, bigXSpine, loadBigXFonts } from './bigXCover';
import { CONTENTS_PAGE, Y_PAGE, bigXLinks, loadBigXPageFonts, paintBigXPage } from './bigXPages';
import type { RareBookArt } from '../rareBookArt';

/**
 * Le grand livre du X : l'histoire de la lettre X, en douze chapitres qui finissent tous en x, et dont la
 * plus grande part est écrite en langue X. Couverture et pages d'après les maquettes (bigXCover.ts,
 * bigXPages.ts) ; page 205, un seul y.
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
  prepare: async () => {
    await loadBigXPageFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    paintBigXPage(preparePageTexture(canvas, spineOnLeft, MODERN_PAPER), page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: bigXLinks,
  // Secret : page 205, le seul y du livre.
  passed: (page, state) => {
    if (page === Y_PAGE) sealEvent(state, 'foundTypo');
  },
};
