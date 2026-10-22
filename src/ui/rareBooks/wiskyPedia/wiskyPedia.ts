import { messages } from '../../../i18n';
import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { HEIGHT } from '../draw';
import { BLACK, SPINE_WIDTH, wiskyBack, wiskyFront, wiskyInside, wiskySpine } from './wiskyCover';
import { GOLD, loadWiskyFonts } from './wiskyDraw';
import { blackoutPage, fichesPage, lastFichePage } from './wiskyFiches';
import { INTRO_PAGES, contentsLinks, morningPage } from './wiskyIntro';
import { BLACKOUT_PAGE, CONTENTS_PAGE, LAST_FICHE_PAGE, MORNING_PAGE } from './wiskyPlan';
import type { RareBookArt } from '../rareBookArt';

/** Le dos à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
const THICKNESS = SPINE_WIDTH / (1.4 * HEIGHT);

/** Le papier blanc des guides d'aujourd'hui, à peine plus gris en bas. */
const PAPER: Paper = ['#fbfaf7', '#fbfaf7', '#f2efe8'];

/**
 * WiskyPedia (maquette .ai/maquette-wiskypedia.html, textes .ai/wiskypedia-textes.md, validés le 22/10) : un vrai
 * guide des whiskies, écrit en une seule soirée par un auteur qui goûte chaque whisky qu'il décrit. Sobre au
 * début, de plus en plus ivre, jusqu'au trou noir de la page 409 ; page 410, « Lendemain ». On rit de l'auteur,
 * jamais de l'alcool ; aucune marque. Lisible en entier dès qu'il arrive.
 */
export const wiskyPediaArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadWiskyFonts();
    return {
      cover: wiskyFront(),
      back: wiskyBack(),
      inside: wiskyInside(),
      spine: wiskySpine(),
      leather: BLACK,
      edge: edgeTexture(PAPER[1], '#dcd6ca'),
      paper: PAPER[0],
      headband: headbandTexture(BLACK, GOLD),
      ribbon: '#7a1c18',
    };
  },
  prepare: async () => {
    await loadWiskyFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    const context = preparePageTexture(canvas, spineOnLeft, PAPER);
    const texts = messages().rareBooks.wiskyPedia;
    if (page <= INTRO_PAGES.length) INTRO_PAGES[page - 1](context, texts);
    else if (page < LAST_FICHE_PAGE) fichesPage(context, texts, page);
    else if (page === LAST_FICHE_PAGE) lastFichePage(context, texts);
    else if (page === BLACKOUT_PAGE) blackoutPage(context, texts);
    else if (page === MORNING_PAGE) morningPage(context, texts);
    else return false;
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: (page) => (page === CONTENTS_PAGE ? contentsLinks(messages().rareBooks.wiskyPedia) : []),
};
