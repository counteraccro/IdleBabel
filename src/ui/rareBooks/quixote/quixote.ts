import { getLocale, messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { canvasTexture, edgeTexture } from '../../book3d/textures';
import { board } from '../draw';
import { slowPieces } from '../slowDrawing';
import { classicArt } from '../classic/classicArt';
import { DIDOT, RED, loadQuixoteFonts, quixoteBack, quixoteFront, quixoteSpine } from './quixoteBinding';
import {
  BODY_LINE,
  BODY_SIZE,
  DROP_CAP,
  INK,
  PAPER,
  cuestaFlyleaf,
  foxing,
  quixoteDropCap,
  quixoteHead,
  quixoteTitlePage,
} from './quixotePages';

/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/** Les pièces de la reliure, longues à dessiner (le grain de la toile) : gardées par langue (les titres en dépendent). */
const pieces = slowPieces(
  {
    front: quixoteFront,
    back: quixoteBack,
    spine: () => quixoteSpine(THICKNESS),
  },
  getLocale,
);

/** Dessine la reliure à l'avance, par petits morceaux quand le navigateur est libre (le livre arrive sans à-coup). */
const warm = async (): Promise<void> => {
  await loadQuixoteFonts();
  await pieces.ahead();
};

/**
 * « L'Ingénieux Hidalgo Don Quichotte de la Manche », traduction de Louis Viardot : le grand Doré de Hachette
 * (1863) dans sa percaline rouge à plaque dorée, et dedans, après le fac-similé de la page de titre de
 * l'originale (Madrid, 1605), les deux parties du roman (Wikisource), en français dans les deux langues du jeu.
 * Chaque chapitre est coupé à 3 pages pour que tout tienne, des moulins à la mort du chevalier.
 */
export const quixoteArt = classicArt({
  id: 'quixote',
  locales: ['fr'],
  paper: PAPER,
  thickness: THICKNESS,
  style: {
    body: DIDOT,
    size: BODY_SIZE,
    line: BODY_LINE,
    ink: INK,
    accent: INK,
    heading: DIDOT,
    chaptersOnRight: false,
    chapterPages: 3,
    head: quixoteHead,
    dropCapBox: { lines: 3, size: DROP_CAP, gap: 10, draw: quixoteDropCap },
    // La page de 1605, puis celle de Hachette : la table vient après.
    contentsPage: 5,
    contentsWrap: true,
    justify: true,
    // En haut, « DON QUICHOTTE. » à gauche, le chapitre à droite, le folio au coin.
    marks: {
      first: 104,
      opening: 392,
      runningHead: {
        font: `12px ${DIDOT}`,
        color: INK,
        spacing: 3,
        y: 60,
        left: () => messages().rareBooks.quixote.running,
        right: (label) => `${label}.`,
      },
      folio: { font: `13px ${DIDOT}`, color: INK, y: PAGE_TEXTURE.height - 44, top: 60 },
      centered: { font: `${BODY_SIZE}px ${DIDOT}`, spacing: 2, rule: 0, half: 0, after: 0 },
      dropCapOnSecondLine: false,
    },
  },
  decorate: foxing,
  fonts: loadQuixoteFonts,
  warm,
  cover: () => ({
    cover: canvasTexture(pieces.now('front')),
    back: canvasTexture(pieces.now('back')),
    // L'intérieur des plats : un rouge sombre (crème, il se confondrait avec les pages).
    inside: board('#4a1512', '#2a0a08'),
    spine: canvasTexture(pieces.now('spine')),
    leather: Number.parseInt(RED[0].slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture(RED[0], '#d9c48f'),
  }),
  titlePage: quixoteTitlePage,
  flyleaf: cuestaFlyleaf,
  contentsHeading: () => messages().rareBooks.quixote.contents,
});
