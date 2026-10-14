import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { storyBribes } from '../../../systems/etherium';
import { CLOTH, CLOTH_EDGE, loadTrueStoryFonts, trueStoryBack, trueStoryFront, trueStorySpine } from './trueStoryCover';
import { paintTrueStoryPage, trueStoryLinks } from './trueStoryPages';
import { plainBoard } from '../draw';
import type { RareBookArt } from '../rareBookArt';

const THICKNESS = 0.12;
/** Le papier de la maquette : crème, un peu passé. */
const PAPER: Paper = ['#efe6d0', '#ebe1ca', '#e3d7bb'];

/**
 * « Mon histoire vraie », la fausse fin (14/10, conception §9.2) : pas un livre rare tiré au hasard, il paraît dans la
 * vitrine à la première étoile du Rideau, à la place gardée pour le livre de la fin. Ses bribes remontent une à une.
 */
export const trueStoryArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadTrueStoryFonts();
    return {
      cover: trueStoryFront(),
      back: trueStoryBack(),
      inside: plainBoard(CLOTH, CLOTH_EDGE),
      spine: trueStorySpine(THICKNESS),
      leather: 0x4c3d30,
      edge: edgeTexture(PAPER[1], '#d6c9a8'),
      paper: PAPER[0],
      headband: headbandTexture('#3e3226', '#d8cdb5'),
    };
  },
  paint: (page, canvas, spineOnLeft, state) => {
    paintTrueStoryPage(preparePageTexture(canvas, spineOnLeft, PAPER), page, storyBribes(state));
    return true;
  },
  bookmark: 1,
  links: (page, state) => trueStoryLinks(page, storyBribes(state)),
};
