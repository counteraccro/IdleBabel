import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { TOMES } from '../../../data/sagaTomes';
import { loadTomeFonts, tomeBack, tomeFront, tomeSpine } from './tomeCover';
import { paintTomePage, tomeLinks } from './trueStoryPages';
import { CONTENTS_PAGE, tomeEndpaper } from './tomePages';
import type { RareBookArt } from '../rareBookArt';

/** L'épaisseur du tome 1, celle de sa place dans le meuble des fins : son dos y est le même. */
const THICKNESS = TOMES[0].t;
/** Le papier de la maquette : crème, un peu passé. */
const PAPER: Paper = ['#efe6d0', '#ebe1ca', '#e3d7bb'];

/**
 * « Qui j'étais » (d'abord « Mon histoire vraie »), la fausse fin (14/10, conception §9.2), tome 1 de « L'histoire de Babel »
 * (17/10) : pas un livre rare tiré au hasard, il s'achète au Nord-Est de la Rose des vents (18/10), entier.
 */
export const trueStoryArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadTomeFonts();
    return {
      cover: tomeFront(0),
      back: await tomeBack(0),
      inside: tomeEndpaper(),
      spine: tomeSpine(0),
      leather: 0x4c3d30,
      edge: edgeTexture(PAPER[1], '#d6c9a8'),
      paper: PAPER[0],
      headband: headbandTexture('#3e3226', '#d8cdb5'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    paintTomePage(preparePageTexture(canvas, spineOnLeft, PAPER), 0, page);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: (page) => tomeLinks(0, page),
};
