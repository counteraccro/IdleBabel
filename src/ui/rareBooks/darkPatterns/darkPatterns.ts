import { HEIGHT } from '../draw';
import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { BIG_BOOK_REWRITE } from '../../book3d/book3dBook';
import { foilTrap, isTrapFoiled, trapAt } from '../../../systems/darkPatterns';
import { NIGHT, PINK, VIOLET } from './darkPatternsDraw';
import { SPINE_WIDTH, darkPatternsBack, darkPatternsFront, darkPatternsInside, darkPatternsSpine } from './darkPatternsCover';
import { CONTENTS_PAGE, loadDarkPatternsPageFonts, paintDarkPatternsPage } from './darkPatternsPages';
import { PAPER } from './darkPatternsText';
import { openTrap, type Trap } from './traps/trapStage';
import { cookieTrap } from './traps/cookieTrap';
import { runnerTrap } from './traps/runnerTrap';
import { urgencyTrap } from './traps/urgencyTrap';
import { unsubscribeTrap } from './traps/unsubscribeTrap';
import { premiumTrap } from './traps/premiumTrap';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
const THICKNESS = SPINE_WIDTH / (1.4 * HEIGHT);

/** Le papier blanc de la maquette des pages, à peine plus gris en bas. */
const WHITE_PAPER: Paper = [PAPER, PAPER, '#f4f2ec'];

/** Les pièges, dans l'ordre des chapitres. */
const TRAP_SCENES: Trap[] = [cookieTrap, runnerTrap, urgencyTrap, unsubscribeTrap, premiumTrap];

/**
 * « Les dark patterns par l'exemple » (maquettes .ai/maquette-dark-patterns.html et .ai/maquette-dark-patterns-pages.html) :
 * un best-seller d'aujourd'hui, un manuel sérieux pour concepteurs d'interfaces. Lu dans la bibliothèque, les
 * exemples des cinq premiers chapitres sont des pièges dont il faut sortir (traps/) ; déjoué, l'exemple garde un
 * tampon. Les cinq déjoués : un sceau secret (systems/darkPatterns.ts).
 */
export const darkPatternsArt: RareBookArt = {
  thickness: THICKNESS,
  paper: WHITE_PAPER,
  look: async () => {
    await loadDarkPatternsPageFonts();
    return {
      cover: darkPatternsFront(),
      back: darkPatternsBack(),
      inside: darkPatternsInside(),
      spine: darkPatternsSpine(),
      leather: VIOLET,
      edge: edgeTexture(WHITE_PAPER[1], '#dcd8e2'),
      paper: WHITE_PAPER[0],
      headband: headbandTexture(NIGHT, PINK),
      ribbon: PINK,
    };
  },
  prepare: async () => {
    await loadDarkPatternsPageFonts();
  },
  paint: (page, canvas, spineOnLeft, state) => {
    paintDarkPatternsPage(preparePageTexture(canvas, spineOnLeft, WHITE_PAPER), page, (chapter) => isTrapFoiled(state, chapter));
    return true;
  },
  bookmark: CONTENTS_PAGE,
  // L'exemple d'un piège ouvert, livre posé dans la bibliothèque : le piège passe par-dessus l'écran.
  shown: (page, state) => {
    const trap = trapAt(page);
    if (trap === undefined || isTrapFoiled(state, trap)) return;
    openTrap(TRAP_SCENES[trap], (foiled) => {
      if (!foiled) return;
      foilTrap(state, trap);
      // L'exemple prend son tampon « Déjoué ».
      window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
    });
  },
};
