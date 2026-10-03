import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { creditsFront, creditsInside, creditsSpine, loadCreditsFonts } from './creditsCover';
import { creditsBack, loadCreditsBackFonts } from './creditsBack';
import { CONTENTS_PAGE, creditsLinks, loadCreditsPageFonts, paintCreditsPage } from './creditsPages';
import type { RareBookArt } from '../rareBookArt';

/** Un livre moderne, mince : le dos de la maquette (140 × 1000) à ses vraies proportions. */
const THICKNESS = 0.1;

/**
 * Le livre des crédits : qui a fait le jeu, avec quoi, d'après quoi, puis les notes de mise à jour. Il n'est
 * pas tiré comme les livres rares : il est dans la bibliothèque dès le début. Le lieu est ancien, le jeu
 * moderne : un livre d'aujourd'hui, habillé comme le générique d'un film (creditsCover.ts).
 */
export const creditsArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await Promise.all([loadCreditsFonts(), loadCreditsBackFonts()]);
    const front = creditsFront();
    return {
      cover: front.texture,
      tick: front.tick,
      back: creditsBack(),
      inside: creditsInside(),
      spine: creditsSpine(),
      leather: 0x152246,
      edge: edgeTexture(MODERN_PAPER[1], '#d8d3c8'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#152246', '#b8c0cc'),
      // Un ruban d'argent, comme le titre.
      ribbon: 0x8f99ab,
    };
  },
  prepare: async () => {
    await loadCreditsPageFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    paintCreditsPage(preparePageTexture(canvas, spineOnLeft, MODERN_PAPER), page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: creditsLinks,
};
