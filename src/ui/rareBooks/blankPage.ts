import { t } from '../../i18n';
import { MODERN_PAPER, preparePageTexture } from '../book/pageRender';
import { headbandTexture } from '../book3d/headband';
import { edgeTexture } from '../book3d/textures';
import { CQW, HEIGHT, PAGE_CENTER, SERIF, WIDTH, board, write } from './draw';
import type { RareBookArt } from './rareBookArt';

const INK = '#3a3833';
const COVER = '#ece8df';
const COVER_EDGE = '#d9d3c6';

/** Titre et sous-titre, centrés à partir de `top` (couverture ou page de titre). */
const titleBlock = (context: CanvasRenderingContext2D, center: number, top: number, scale: number): void => {
  write(context, t('rareBooks.blankPage.title'), center, top, { font: `${40 * scale}px ${SERIF}`, color: INK, spacing: 6 * scale });
  context.fillStyle = INK;
  context.fillRect(center - 40 * scale, top + 70 * scale, 80 * scale, 1.5 * scale);
  write(context, t('rareBooks.blankPage.subtitle'), center, top + 92 * scale, { font: `italic ${24 * scale}px ${SERIF}`, color: INK });
};

/**
 * « Page blanche, l'explication » : une couverture blanche, sobre, comme un essai ; un sommaire vide ;
 * puis rien, sur toutes les pages.
 */
export const blankPageArt: RareBookArt = {
  paper: MODERN_PAPER,
  look: async () => {
    const plain = board(COVER, COVER_EDGE);
    return {
      cover: board(COVER, COVER_EDGE, (context) => titleBlock(context, WIDTH / 2, HEIGHT * 0.3, CQW / 4)),
      back: plain,
      inside: plain,
      spine: plain,
      leather: 0xf2efe8,
      edge: edgeTexture(MODERN_PAPER[1], '#d8d3c8'),
      paper: MODERN_PAPER[0],
      headband: headbandTexture('#d8d2c4', '#f3f0e8'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    const context = preparePageTexture(canvas, spineOnLeft, MODERN_PAPER);
    if (page === 1) titleBlock(context, PAGE_CENTER, 240, 1);
    // Le sommaire, sur la première page de droite après la page de titre : son titre, et rien dessous.
    if (page === 3) {
      write(context, t('rareBooks.blankPage.contents'), PAGE_CENTER, 110, { font: `26px ${SERIF}`, color: INK, spacing: 4 });
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - 30, 160, 60, 1);
    }
    return true;
  },
};
