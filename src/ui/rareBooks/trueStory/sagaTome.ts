import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { TOMES } from '../../../data/sagaTomes';
import { loadTomeFonts, tomeBack, tomeFront, tomeSpine } from './tomeCover';
import { CONTENTS_PAGE, paintEmptyTome, tomeEndpaper } from './tomePages';
import { paintTomePage, tomeLinks } from './trueStoryPages';
import { TOME_BRIBE_PAGES } from '../../../data/trueStory';
import type { RareBookArt } from '../rareBookArt';

/** Le papier du tome 1 (trueStory.ts) : toute la collection est imprimée sur le même. */
const PAPER: Paper = ['#efe6d0', '#ebe1ca', '#e3d7bb'];

/**
 * Un tome de « L'histoire de Babel » après le premier (`index` : 1 pour le tome 2) : la couverture de la collection, son
 * épaisseur de sa place dans le meuble, les pages d'avant le texte de toute la collection (tomePages.ts), puis, s'il est
 * écrit (data/trueStory.ts, TOME_BRIBE_PAGES), ses bribes comme celles du tome 1 (trueStoryPages.ts) ; sinon, le reste
 * blanc (l'auteur, 17/10 : le contenu vient avec leur déblocage).
 */
export const sagaTomeArt = (index: number): RareBookArt => {
  const written = index < TOME_BRIBE_PAGES.length;
  return {
    thickness: TOMES[index].t,
    paper: PAPER,
    look: async () => {
      await loadTomeFonts();
      return {
        cover: tomeFront(index),
        back: await tomeBack(index),
        inside: tomeEndpaper(),
        spine: tomeSpine(index),
        leather: 0x4c3d30,
        edge: edgeTexture(PAPER[1], '#d6c9a8'),
        paper: PAPER[0],
        headband: headbandTexture('#3e3226', '#d8cdb5'),
      };
    },
    paint: (page, canvas, spineOnLeft) => {
      const context = preparePageTexture(canvas, spineOnLeft, PAPER);
      if (written) paintTomePage(context, index, page);
      else paintEmptyTome(context, index, page);
      return true;
    },
    ...(written ? { bookmark: CONTENTS_PAGE, links: (page: number) => tomeLinks(index, page) } : {}),
  };
};
