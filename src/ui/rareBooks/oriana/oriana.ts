import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { board } from '../draw';
import { loadOrianaFonts, orianaBack, orianaFront, orianaSpine } from './orianaCover';
import { CONTENTS_PAGE, isTravelPage, orianaLinks, paintOrianaPage } from './orianaPages';
import { KRAFT } from './orianaTravel';
import type { RareBookArt } from '../rareBookArt';

/** Des mémoires : plus épaisses qu'un livre ordinaire (elle avait beaucoup à dire). */
const THICKNESS = 0.15;

/**
 * « La biographie d'Oriana » : des mémoires de voyage, un couchant vers l'ouest en couverture. Dedans, une
 * vraie biographie (chapitres, sommaire) que son sujet commente en notes de bas de page de plus en plus
 * longues ; un carnet de voyage sur papier kraft ; en annexe, son journal de bord tenu en chaîne de blocs.
 */
export const orianaArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await loadOrianaFonts();
    return {
      cover: orianaFront(),
      back: orianaBack(),
      // L'intérieur des plats : la nuit de son couchant (crème, il se confondait avec les pages).
      inside: board('#3a2a33', '#221a20'),
      spine: orianaSpine(THICKNESS),
      leather: 0x2a2848,
      edge: edgeTexture(MODERN_PAPER[1], '#c9c1b0'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#c8687a', '#f2a65a'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    paintOrianaPage(preparePageTexture(canvas, spineOnLeft, isTravelPage(page) ? KRAFT : MODERN_PAPER), page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: orianaLinks,
};
