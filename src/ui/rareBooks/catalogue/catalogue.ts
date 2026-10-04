import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { readCatalogue } from '../../../systems/catalogue';
import { LEATHER, THICKNESS, catalogueBack, catalogueFront, catalogueInside, catalogueSpine } from './catalogueCover';
import { loadCatalogueFonts } from './catalogueDraw';
import { paintCataloguePage } from './cataloguePages';
import type { RareBookArt } from '../rareBookArt';

const PAPER: Paper = ['#f2ecdb', '#e8dfc8', '#ddd2b6'];

/**
 * Le Catalogue des catalogues : le livre que cherchent les bibliothécaires de Borges. Couverture en abyme
 * (catalogueCover.ts) ; dedans, un registre vrai, les livres que le joueur prendra ensuite (cataloguePages.ts,
 * systems/catalogue.ts).
 */
export const catalogueArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadCatalogueFonts();
    return {
      cover: catalogueFront(),
      back: catalogueBack(),
      inside: catalogueInside(),
      spine: catalogueSpine(),
      leather: Number.parseInt(LEATHER.slice(1), 16),
      edge: edgeTexture(PAPER[1], '#cfc3a6'),
      paper: PAPER[0],
      headband: headbandTexture('#c9a052', '#1f2a3d'),
    };
  },
  prepare: async () => {
    await loadCatalogueFonts();
  },
  paint: (page, canvas, spineOnLeft, state) => {
    paintCataloguePage(preparePageTexture(canvas, spineOnLeft, PAPER), page, spineOnLeft, state);
    return true;
  },
  // Secret : vingt pages lues dans la bibliothèque (systems/catalogue.ts).
  passed: (page, state) => readCatalogue(state, page),
};
