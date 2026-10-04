import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { sealEvent } from '../../../systems/seals';
import { THICKNESS, VELLUM, voynichBack, voynichFront, voynichInside, voynichSpine } from './voynichCover';
import { LAST_PAGE, PAGE_TONE, loadVoynichFonts, paintVoynichPage } from './voynichPages';
import type { RareBookArt } from '../rareBookArt';

const PAPER: Paper = PAGE_TONE;

/**
 * Le Manuscrit de Voynich : le seul livre que personne n'a jamais su lire. Une couverture de vélin devenue
 * page, une plante peinte dessus (voynichCover.ts) ; dedans, l'écriture inconnue et les parties du vrai
 * manuscrit (voynichPages.ts).
 */
export const voynichArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadVoynichFonts();
    return {
      cover: voynichFront(),
      back: voynichBack(),
      inside: voynichInside(),
      spine: voynichSpine(),
      leather: Number.parseInt(VELLUM.slice(1), 16),
      edge: edgeTexture(PAPER[1], '#c4b08a'),
      paper: PAPER[0],
      headband: headbandTexture('#6a4a2a', '#d9c9a2'),
    };
  },
  prepare: async () => {
    await loadVoynichFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    paintVoynichPage(preparePageTexture(canvas, spineOnLeft, PAPER), page);
    return true;
  },
  // Secret : à la dernière page, un lecteur venu avant a entouré un mot, le seul qu'il croit connaître.
  passed: (page, state) => {
    if (page === LAST_PAGE) sealEvent(state, 'oneWord');
  },
};
