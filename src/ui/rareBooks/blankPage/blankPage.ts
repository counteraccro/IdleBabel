import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { SLATE, SLATE_EDGE, blankPageBack, blankPageFront, blankPageSpine, loadBlankPageFonts } from './blankPageCover';
import { CONTENTS_PAGE, blankPageLinks, paintBlankPage } from './blankPagePages';
import { board } from '../draw';
import type { RareBookArt } from '../rareBookArt';

const THICKNESS = 0.12;

/**
 * « Page blanche, l'explication » : un essai sérieux, toile ardoise, une feuille blanche sur la couverture,
 * un résumé qui promet tout au dos. Dedans, un vrai sommaire (un clic mène au chapitre), des débuts de
 * chapitre sans rien dessous, l'errata et l'achevé d'imprimer à la fin ; partout ailleurs, rien.
 */
export const blankPageArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await loadBlankPageFonts();
    return {
      cover: blankPageFront(),
      back: blankPageBack(),
      inside: board(SLATE, SLATE_EDGE),
      spine: blankPageSpine(THICKNESS),
      leather: 0x3b4a52,
      edge: edgeTexture(MODERN_PAPER[1], '#d8d3c8'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#2b3338', '#d8cdb5'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    paintBlankPage(preparePageTexture(canvas, spineOnLeft, MODERN_PAPER), page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: blankPageLinks,
};
