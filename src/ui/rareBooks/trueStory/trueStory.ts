import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { storyBribes } from '../../../systems/etherium';
import { TOMES } from '../../../data/sagaTomes';
import { CLOTH, CLOTH_EDGE, loadTomeFonts, tomeBack, tomeFront, tomeSpine } from './tomeCover';
import { paintTrueStoryPage, trueStoryLinks } from './trueStoryPages';
import { plainBoard } from '../draw';
import type { RareBookArt } from '../rareBookArt';

/** L'épaisseur du tome 1, celle de sa place dans le meuble des fins : son dos y est le même. */
const THICKNESS = TOMES[0].t;
/** Le papier de la maquette : crème, un peu passé. */
const PAPER: Paper = ['#efe6d0', '#ebe1ca', '#e3d7bb'];

/**
 * « Qui j'étais » (d'abord « Mon histoire vraie »), la fausse fin (14/10, conception §9.2), tome 1 de « L'histoire de Babel »
 * (17/10) : pas un livre rare tiré au hasard, il paraît à la première étoile du Rideau. Ses bribes remontent une à une.
 */
export const trueStoryArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadTomeFonts();
    return {
      cover: tomeFront(0),
      back: await tomeBack(0),
      inside: plainBoard(CLOTH, CLOTH_EDGE),
      spine: tomeSpine(0),
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
