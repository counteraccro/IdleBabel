import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { TOMES } from '../../../data/sagaTomes';
import { CLOTH, CLOTH_EDGE, loadTomeFonts, tomeBack, tomeFront, tomeSpine } from './tomeCover';
import { plainBoard } from '../draw';
import type { RareBookArt } from '../rareBookArt';

/** Le papier du tome 1 (trueStory.ts) : toute la collection est imprimée sur le même. */
const PAPER: Paper = ['#efe6d0', '#ebe1ca', '#e3d7bb'];

/**
 * Un tome de « L'histoire de Babel » après le premier (`index` : 1 pour le tome 2) : la couverture de la collection, son
 * épaisseur de sa place dans le meuble, et des pages encore blanches (l'auteur, 17/10 : vides et cachés pour l'instant, le
 * contenu viendra avec leur déblocage).
 */
export const sagaTomeArt = (index: number): RareBookArt => ({
  thickness: TOMES[index].t,
  paper: PAPER,
  look: async () => {
    await loadTomeFonts();
    return {
      cover: tomeFront(index),
      back: await tomeBack(index),
      inside: plainBoard(CLOTH, CLOTH_EDGE),
      spine: tomeSpine(index),
      leather: 0x4c3d30,
      edge: edgeTexture(PAPER[1], '#d6c9a8'),
      paper: PAPER[0],
      headband: headbandTexture('#3e3226', '#d8cdb5'),
    };
  },
  paint: (_page, canvas, spineOnLeft) => {
    preparePageTexture(canvas, spineOnLeft, PAPER);
    return true;
  },
});
