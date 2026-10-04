import { getLocale, messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { canvasTexture, edgeTexture } from '../../book3d/textures';
import { plainBoard } from '../draw';
import { slowPieces } from '../slowDrawing';
import { classicArt } from '../classic/classicArt';
import { CALF, DIDOT, loadSaragossaFonts, saragossaBack, saragossaFront, saragossaSpine } from './saragossaBinding';
import { BODY_LINE, BODY_SIZE, INK, PAPER, foxing, saragossaFolio, saragossaHead, saragossaTitlePage } from './saragossaPages';

/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/** Les pièces de la reliure, longues à dessiner (le grain du veau) : gardées par langue (le titre en dépend). */
const pieces = slowPieces(
  {
    front: saragossaFront,
    back: saragossaBack,
    spine: () => saragossaSpine(THICKNESS),
  },
  getLocale,
);

/** Dessine la reliure à l'avance, par petits morceaux quand le navigateur est libre (le livre arrive sans à-coup). */
const warm = async (): Promise<void> => {
  await loadSaragossaFonts();
  await pieces.ahead();
};

/**
 * « Manuscrit trouvé à Saragosse » de Jan Potocki : l'originale de Paris (Gide fils, 1814), « Dix journées de
 * la vie d'Alphonse Van-Worden », écrite en français par Potocki, dans un veau raciné du temps ; dedans,
 * l'Avertissement de l'officier qui a trouvé le manuscrit, puis les dix journées et les histoires qu'on y
 * raconte (Wikisource), en français dans les deux langues du jeu, dans l'orthographe de 1814. Le texte finit
 * sur la promesse d'une suite qui n'est jamais venue : les pages d'après restent blanches.
 */
export const saragossaArt = classicArt({
  id: 'saragossa',
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
    head: saragossaHead,
    openingCaps: 2,
    contentsWrap: true,
    justify: true,
    inlineHeading: { font: `italic ${BODY_SIZE}px ${DIDOT}`, spacing: 0 },
    // « FIN DU TROISIÈME ET DERNIER TOME. », centré.
    centeredUpTo: 36,
    // Pas de titre courant : le folio entre parenthèses en tête, au milieu ; aucun aux ouvertures.
    marks: {
      first: 110,
      opening: 380,
      folio: {
        font: `15px ${DIDOT}`,
        color: INK,
        y: PAGE_TEXTURE.height - 44,
        top: 62,
        center: true,
        format: saragossaFolio,
        openings: false,
      },
      centered: { font: `${BODY_SIZE}px ${DIDOT}`, spacing: 2, rule: 0, half: 0, after: 0 },
      dropCapOnSecondLine: false,
    },
  },
  decorate: foxing,
  fonts: loadSaragossaFonts,
  warm,
  cover: () => ({
    cover: canvasTexture(pieces.now('front')),
    back: canvasTexture(pieces.now('back')),
    // L'intérieur des plats : un veau plus sombre (crème, il se confondrait avec les pages).
    inside: plainBoard('#5a3417', '#2e1909'),
    spine: canvasTexture(pieces.now('spine')),
    leather: Number.parseInt(CALF[1].slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture('#9a2a1e', '#d9c48f'),
  }),
  titlePage: saragossaTitlePage,
  contentsHeading: () => messages().rareBooks.saragossa.contents,
});
