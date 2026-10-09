import { HEIGHT } from '../draw';
import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { CHAPTERS, platePage, rabbitHome } from '../../../systems/rabbit';
import { GREEN, GREEN_EDGE, loadRabbitFonts } from './rabbitDraw';
import { SPINE_WIDTH, rabbitBack, rabbitFront, rabbitInside, rabbitSpine } from './rabbitCover';
import { CONTENTS_PAGE, CONTENTS_ROW, CONTENTS_TOP, PLATES_PAGE, PLATES_ROW, PLATES_TOP, contentsTargets, paintRabbitPage } from './rabbitPages';
import { rabbitMayCross } from './rabbitHunt';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
const THICKNESS = SPINE_WIDTH / (1.4 * HEIGHT);

/** Le papier crème de la maquette des pages, un peu plus jaune en bas. */
const CREAM_PAPER: Paper = ['#f6efdc', '#eee4ca', '#ebdfc2'];

/**
 * « Le Lapin de garenne » (maquettes .ai/maquette-lapin.html, piste A1, et .ai/maquette-lapin-pages.html) : un traité
 * d'histoire naturelle des années 1870 dont le modèle s'est échappé. Lu dans la bibliothèque, le Lapin blanc d'Alice
 * traverse parfois une double page (rabbitHunt.ts) ; attrapé trois fois, il rentre dans ses planches, et c'est un
 * sceau secret (systems/rabbit.ts).
 */
export const rabbitArt: RareBookArt = {
  thickness: THICKNESS,
  paper: CREAM_PAPER,
  look: async () => {
    await loadRabbitFonts();
    return {
      cover: rabbitFront(),
      back: rabbitBack(),
      inside: rabbitInside(),
      spine: rabbitSpine(),
      leather: GREEN,
      edge: edgeTexture(CREAM_PAPER[1], '#d8ccae'),
      paper: CREAM_PAPER[0],
      headband: headbandTexture(GREEN_EDGE, '#c9a24a'),
      ribbon: '#7a1f1f',
    };
  },
  prepare: async () => {
    await loadRabbitFonts();
  },
  paint: (page, canvas, spineOnLeft, state) => {
    paintRabbitPage(preparePageTexture(canvas, spineOnLeft, CREAM_PAPER), page, rabbitHome(state));
    return true;
  },
  bookmark: CONTENTS_PAGE,
  // Chaque ligne de la table des matières mène à sa page, chaque ligne de la liste des planches à sa planche.
  links: (page) => {
    if (page === CONTENTS_PAGE)
      return contentsTargets().map((target, row) => ({ y: CONTENTS_TOP + row * CONTENTS_ROW - 25, height: CONTENTS_ROW - 2, target }));
    if (page === PLATES_PAGE)
      return Array.from({ length: CHAPTERS }, (_, chapter) => ({
        y: PLATES_TOP + chapter * PLATES_ROW - 26,
        height: PLATES_ROW - 2,
        target: platePage(chapter),
      }));
    return [];
  },
  // Une double page posée sous les yeux, dans la bibliothèque : peut-être qu'il la traverse (une fois par double page :
  // sa page de droite).
  shown: (page, state) => {
    if (page % 2 === 1) rabbitMayCross(state, page);
  },
};
