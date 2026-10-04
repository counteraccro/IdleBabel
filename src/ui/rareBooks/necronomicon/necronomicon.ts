import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { LEATHER, THICKNESS, necronomiconBack, necronomiconFront, necronomiconInside, necronomiconSpine } from './necronomiconCover';
import { loadNecronomiconFonts, paintNecronomiconPage } from './necronomiconPages';
import type { RareBookArt } from '../rareBookArt';

/** Le papier de la maquette, du milieu de la page vers ses bords (necronomiconPages.ts le redessine). */
const PAPER: Paper = ['#f1e4c4', '#e6d6b0', '#dcc89c'];

/**
 * Le Necronomicon : le livre inventé par Lovecraft, que la Bibliothèque contient forcément. L'original
 * arabe, Al Azif : une reliure de maroquin (necronomiconCover.ts), un manuscrit dans une écriture qui ne se
 * lit pas (necronomiconPages.ts).
 */
export const necronomiconArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => ({
    cover: necronomiconFront(),
    back: necronomiconBack(),
    inside: necronomiconInside(),
    spine: necronomiconSpine(),
    leather: Number.parseInt(LEATHER.slice(1), 16),
    edge: edgeTexture(PAPER[1], '#b39d74'),
    paper: PAPER[0],
    headband: headbandTexture('#3a1a10', '#d9b25a'),
  }),
  prepare: async () => {
    await loadNecronomiconFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    paintNecronomiconPage(preparePageTexture(canvas, spineOnLeft, PAPER), page, spineOnLeft);
    return true;
  },
};
