import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { albumBack, albumFront, albumInside, albumSpine } from './albumCover';
import { BLUE, RED, YELLOW, loadAlbumFonts } from './albumDraw';
import { CONTENTS_PAGE, contentsLinks, paintAlbumPage } from './albumPages';
import type { RareBookArt } from '../rareBookArt';

const THICKNESS = 0.1;

/** Le papier blanc cassé de la maquette, à peine plus foncé en bas. */
const PAPER: Paper = ['#f7f2e6', '#f7f2e6', '#efe8d6'];

/**
 * « Les Couvertures de Babel » (maquette .ai/maquette-album-autocollants.html, validée le 22/10) : un album d'autocollants
 * de cour de récré dont les images sont les couvertures des livres lus, dessinées par le jeu. La collection (les cuirs, les
 * fleurons, la bande dessinée, les livres rares en brillant, les introuvables, les grandes dates), la liste de contrôle et
 * ses doubles, puis « Mes livres » jusqu'à la page 410. Il se remplit tout seul, avec tout ce qui a été lu avant lui.
 */
export const stickerAlbumArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async (state) => {
    await loadAlbumFonts();
    return {
      cover: await albumFront(state),
      back: albumBack(),
      inside: albumInside(),
      spine: albumSpine(THICKNESS),
      leather: BLUE,
      edge: edgeTexture(PAPER[1], '#ddd4bf'),
      paper: PAPER[0],
      headband: headbandTexture(RED, YELLOW),
      ribbon: RED,
    };
  },
  prepare: async () => {
    await loadAlbumFonts();
  },
  // Les autocollants arrivent un à un : les pages ouvertes se redessinent.
  live: true,
  paint: (page, canvas, spineOnLeft, state) => paintAlbumPage(preparePageTexture(canvas, spineOnLeft, PAPER), state, page, spineOnLeft),
  bookmark: CONTENTS_PAGE,
  links: (page) => (page === CONTENTS_PAGE ? contentsLinks() : []),
};
