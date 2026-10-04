import { OLD_PAPER } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { defaultArt } from '../defaultArt';
import { LEATHER, THICKNESS, necronomiconBack, necronomiconFront, necronomiconInside, necronomiconSpine } from './necronomiconCover';
import type { RareBookArt } from '../rareBookArt';

/** Les pages, en attendant leur maquette : celles d'un livre rare pas encore dessiné. */
const pages = defaultArt('necronomicon');

/**
 * Le Necronomicon : le livre inventé par Lovecraft, que la Bibliothèque contient forcément. L'original
 * arabe, Al Azif, dans sa reliure de maroquin (necronomiconCover.ts).
 */
export const necronomiconArt: RareBookArt = {
  thickness: THICKNESS,
  paper: OLD_PAPER,
  look: async () => ({
    cover: necronomiconFront(),
    back: necronomiconBack(),
    inside: necronomiconInside(),
    spine: necronomiconSpine(),
    leather: Number.parseInt(LEATHER.slice(1), 16),
    edge: edgeTexture(OLD_PAPER[1], '#b39d74'),
    paper: OLD_PAPER[0],
    headband: headbandTexture('#3a1a10', '#d9b25a'),
  }),
  paint: pages.paint,
};
