import { getLocale, messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { canvasTexture, edgeTexture } from '../../book3d/textures';
import { board } from '../draw';
import { slowPieces } from '../slowDrawing';
import { classicArt } from '../classic/classicArt';
import { GARAMOND, MOROCCO, loadOdysseyFonts, odysseyBack, odysseyFront, odysseySpine } from './odysseyBinding';
import { DROP_CAP, INK, PAPER, foxing, odysseyDropCap, odysseyHead, odysseyTitlePage } from './odysseyPages';

/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/** Les pièces de la reliure, longues à dessiner (le papier caillouté, goutte à goutte) : gardées par langue (le dos en dépend). */
const pieces = slowPieces(
  {
    front: odysseyFront,
    back: odysseyBack,
    spine: () => odysseySpine(THICKNESS),
  },
  getLocale,
);

/** Dessine la reliure à l'avance, par petits morceaux quand le navigateur est libre (le livre arrive sans à-coup). */
const warm = async (): Promise<void> => {
  await loadOdysseyFonts();
  await pieces.ahead();
};

/**
 * « Odyssée », traduction de Leconte de Lisle : l'originale de Lemerre (1868) dans sa reliure d'amateur
 * (demi-maroquin rouge, plats de papier caillouté), et dedans les vingt-quatre rhapsodies telles que Lemerre les
 * imprimait en 1893 (Wikisource), en français dans les deux langues du jeu.
 */
export const odysseyArt = classicArt({
  id: 'odyssey',
  locales: ['fr'],
  paper: PAPER,
  thickness: THICKNESS,
  style: {
    body: GARAMOND,
    size: 17.5,
    line: 25,
    ink: INK,
    accent: INK,
    heading: GARAMOND,
    chaptersOnRight: false,
    head: odysseyHead,
    dropCapBox: { lines: 4, size: DROP_CAP, gap: 10, draw: odysseyDropCap },
    // Comme dans le scan de 1893 : en haut « ODYSSÉE. » à gauche, la rhapsodie à droite, le folio au coin.
    marks: {
      first: 104,
      opening: 400,
      runningHead: { font: `13px ${GARAMOND}`, color: INK, spacing: 3, y: 60, left: () => messages().rareBooks.odyssey.running },
      folio: { font: `14px ${GARAMOND}`, color: INK, y: PAGE_TEXTURE.height - 44, top: 60 },
      centered: { font: `17.5px ${GARAMOND}`, spacing: 2, rule: 0, half: 0, after: 0 },
      dropCapOnSecondLine: false,
    },
  },
  decorate: foxing,
  fonts: loadOdysseyFonts,
  warm,
  cover: () => ({
    cover: canvasTexture(pieces.now('front')),
    back: canvasTexture(pieces.now('back')),
    // L'intérieur des plats : un bordeaux sombre (crème, il se confondrait avec les pages).
    inside: board('#4a1520', '#2a0a10'),
    spine: canvasTexture(pieces.now('spine')),
    leather: Number.parseInt(MOROCCO[0].slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture(MOROCCO[0], '#d9c48f'),
  }),
  titlePage: odysseyTitlePage,
  contentsHeading: () => messages().rareBooks.odyssey.contents,
});
