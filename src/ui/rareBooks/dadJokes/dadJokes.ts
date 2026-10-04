import { HEIGHT } from '../draw';
import { MODERN_PAPER, preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { sealEvent } from '../../../systems/seals';
import { RED, SPINE_WIDTH, YELLOW, dadJokesBack, dadJokesFront, dadJokesInside, dadJokesSpine } from './dadJokesCover';
import { loadDadJokesFonts } from './dadJokesDraw';
import { LAUGH_PAGE, loadDadJokesPageFonts, paintDadJokesPage } from './dadJokesPages';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
const THICKNESS = SPINE_WIDTH / (1.4 * HEIGHT);

/**
 * Les Jokes de Papa : un livre d'humour d'aujourd'hui, de ceux qu'on offre à la fête des pères (il remplace
 * le Livre des morts). Couverture et pages d'après les maquettes (dadJokesCover.ts, dadJokesPages.ts) : une
 * blague par page, et il n'y en a qu'environ 90 (dadJokesOrder.ts).
 */
export const dadJokesArt: RareBookArt = {
  thickness: THICKNESS,
  paper: MODERN_PAPER,
  look: async () => {
    await loadDadJokesFonts();
    return {
      cover: dadJokesFront(),
      back: dadJokesBack(),
      inside: dadJokesInside(),
      spine: dadJokesSpine(),
      leather: YELLOW,
      edge: edgeTexture(MODERN_PAPER[1], '#d8d3c8'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#1d1a17', RED),
      ribbon: RED,
    };
  },
  prepare: async () => {
    await loadDadJokesPageFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    paintDadJokesPage(preparePageTexture(canvas, spineOnLeft, MODERN_PAPER), page);
    return true;
  },
  // Secret : page 25, un lecteur venu avant a ri, puis barré son rire.
  passed: (page, state) => {
    if (page === LAUGH_PAGE) sealEvent(state, 'neverLaughed');
  },
};
