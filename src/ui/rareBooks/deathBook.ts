import { t } from '../../i18n';
import { preparePageTexture, type Paper } from '../book/pageRender';
import { edgeTexture } from '../book3d/textures';
import { CQW, HAND, HEIGHT, TITLE, WIDTH, board, write } from './draw';
import type { RareBookArt } from './rareBookArt';

/** Papier d'un cahier : blanc cassé, un peu gris. */
const PAPER: Paper = ['#f1efe9', '#e9e6de', '#dedad0'];
/** Lignes du cahier, de haut en bas. */
const FIRST_LINE = 120;
const LINE_STEP = 34;
const LAST_LINE = 740;
const RULE = 'rgba(110, 130, 160, 0.28)';
const INK = '#141414';

/** Une page de cahier : papier et lignes. */
const ruled = (canvas: HTMLCanvasElement, spineOnLeft: boolean): CanvasRenderingContext2D => {
  const context = preparePageTexture(canvas, spineOnLeft, PAPER);
  context.fillStyle = RULE;
  for (let y = FIRST_LINE; y <= LAST_LINE; y += LINE_STEP) context.fillRect(40, y, 560, 1);
  return context;
};

/**
 * Le DeathBook : un cahier noir et mince, sans dorure, son titre en blanc. Des pages lignées, toutes
 * vides sauf la première : le nom du joueur, écrit à la main, et rien d'autre.
 */
export const deathBookArt: RareBookArt = {
  thickness: 0.06,
  paper: PAPER,
  look: async () => {
    const plain = board('#151516', '#070708');
    return {
      cover: board('#151516', '#070708', (context) => {
        write(context, t('rareBooks.deathBook.cover.0'), WIDTH / 2, HEIGHT * 0.36, {
          font: `600 ${10 * CQW}px ${TITLE}`,
          color: '#ece9e2',
          spacing: 0.6 * CQW,
        });
      }),
      back: plain,
      inside: plain,
      spine: plain,
      leather: 0x1a1a1b,
      edge: edgeTexture(PAPER[1], '#bdb8ac'),
      paper: PAPER[0],
      // Un cahier : pas de tranchefiles.
    };
  },
  paint: (page, canvas, spineOnLeft, state) => {
    const context = ruled(canvas, spineOnLeft);
    if (page === 1) {
      // Le nom, posé sur une ligne, un peu de travers : écrit vite, d'une main sûre.
      context.save();
      context.translate(90, FIRST_LINE + 3 * LINE_STEP);
      context.rotate(-0.025);
      write(context, state.playerName || '…', 0, -62, { font: `64px ${HAND}`, color: INK, align: 'left' });
      context.restore();
    }
    return true;
  },
};
