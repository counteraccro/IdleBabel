import { MODERN_PAPER, preparePageTexture, type Paper } from '../book/pageRender';
import { headbandTexture } from '../book3d/headband';
import { edgeTexture } from '../book3d/textures';
import { board } from './draw';
import { CREAM, CREAM_EDGE, alexHBack, alexHFront, alexHSpine, loadAlexHFonts } from './alexHCover';
import { CONTENTS_PAGE, alexHLinks, isPhotoPage, paintAlexHPage } from './alexHPages';
import type { RareBookArt } from './rareBookArt';

/** Une biographie à succès : plus épaisse qu'un livre ordinaire. */
const THICKNESS = 0.15;

/** Papier glacé du cahier photo, plus blanc et plus froid. */
const GLOSSY: Paper = ['#ffffff', '#f7f7f5', '#eeeeea'];

/**
 * « AlexH, mon code, ma PR » : une biographie de développeur, en couverture d'essai à succès toute en
 * lettres, le titre écrit comme un diff. Dedans, comme une vraie : mentions légales, dédicace, sommaire,
 * chapitres (du code, des renvois aux PR), une PR et ses commentaires, un cahier photo de diffs,
 * remerciements, index.
 */
export const alexHArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await loadAlexHFonts();
    return {
      cover: alexHFront(),
      back: alexHBack(),
      inside: board(CREAM, CREAM_EDGE),
      spine: alexHSpine(THICKNESS),
      leather: 0xefe9de,
      edge: edgeTexture(MODERN_PAPER[1], '#c9c1b0'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#1d7a3a', '#f1ece2'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    paintAlexHPage(preparePageTexture(canvas, spineOnLeft, isPhotoPage(page) ? GLOSSY : MODERN_PAPER), page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: alexHLinks,
};
