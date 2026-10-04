import { getLocale, messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { canvasTexture, edgeTexture } from '../../book3d/textures';
import { plainBoard } from '../draw';
import { slowPieces } from '../slowDrawing';
import { classicArt } from '../classic/classicArt';
import { GARAMOND, NIGHT, divineComedyBack, divineComedyFront, divineComedySpine, loadDivineComedyFonts } from './divineComedyBinding';
import {
  BODY_LINE,
  BODY_SIZE,
  DROP_CAP,
  INK,
  PAPER,
  divineComedyContentsName,
  divineComedyDropCap,
  divineComedyHead,
  divineComedyTitlePage,
  foxing,
} from './divineComedyPages';

/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/** Les pièces de la reliure, longues à dessiner (le grain du maroquin) : gardées par langue (le titre en dépend). */
const pieces = slowPieces(
  {
    front: divineComedyFront,
    back: divineComedyBack,
    spine: () => divineComedySpine(THICKNESS),
  },
  getLocale,
);

/** Dessine la reliure à l'avance, par petits morceaux quand le navigateur est libre (le livre arrive sans à-coup). */
const warm = async (): Promise<void> => {
  await loadDivineComedyFonts();
  await pieces.ahead();
};

/**
 * « La Divine Comédie » de Dante, traduction de Lamennais : dans une reliure de bibliophile inventée, le
 * maroquin bleu nuit des trois royaumes, et dedans le texte de l'édition Didier (1863, Wikisource), en
 * français dans les deux langues du jeu : l'Enfer, le Purgatoire et le Paradis, chant après chant, les
 * tercets numérotés comme chez Lamennais (les notes ne sont pas reprises).
 */
export const divineComedyArt = classicArt({
  id: 'divineComedy',
  locales: ['fr'],
  paper: PAPER,
  thickness: THICKNESS,
  style: {
    body: GARAMOND,
    size: BODY_SIZE,
    line: BODY_LINE,
    ink: INK,
    accent: INK,
    heading: GARAMOND,
    chaptersOnRight: false,
    head: divineComedyHead,
    dropCapBox: { lines: 3, size: DROP_CAP, gap: 12, draw: divineComedyDropCap },
    justify: true,
    contentsName: divineComedyContentsName,
    numbers: { font: `14px ${GARAMOND}`, gap: 8 },
    // En haut, « LA DIVINE COMÉDIE. » à gauche, le cantique et le chant à droite, le folio au coin.
    marks: {
      first: 104,
      opening: 340,
      runningHead: {
        font: `12px ${GARAMOND}`,
        color: INK,
        spacing: 3,
        y: 60,
        left: () => messages().rareBooks.divineComedy.running,
        right: (label, title) => `${title.toUpperCase()} — ${label}.`,
      },
      folio: { font: `14px ${GARAMOND}`, color: INK, y: PAGE_TEXTURE.height - 44, top: 60 },
      centered: { font: `${BODY_SIZE}px ${GARAMOND}`, spacing: 2, rule: 0, half: 0, after: 0 },
      dropCapOnSecondLine: false,
    },
  },
  decorate: foxing,
  fonts: loadDivineComedyFonts,
  warm,
  cover: () => ({
    cover: canvasTexture(pieces.now('front')),
    back: canvasTexture(pieces.now('back')),
    // L'intérieur des plats : un bleu plus sombre (crème, il se confondrait avec les pages).
    inside: plainBoard('#141d36', '#070b18'),
    spine: canvasTexture(pieces.now('spine')),
    leather: Number.parseInt(NIGHT[0].slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture(NIGHT[0], '#d9c48f'),
  }),
  titlePage: divineComedyTitlePage,
  contentsHeading: () => messages().rareBooks.divineComedy.contents,
});
