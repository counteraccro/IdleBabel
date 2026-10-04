import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { getLocale, messages } from '../../../i18n';
import { canvasTexture, edgeTexture } from '../../book3d/textures';
import { plainBoard } from '../draw';
import { slowPieces } from '../slowDrawing';
import { classicArt } from '../classic/classicArt';
import {
  MOROCCO,
  FELL,
  GARAMOND,
  INK,
  arabianNightsBack,
  arabianNightsFront,
  arabianNightsSpine,
  arabianNightsTitlePage,
  loadArabianNightsFonts,
} from './arabianNightsCover';
import { arabianNightsHead } from './arabianNightsHead';
import type { Paper } from '../../book/pageRender';

/** Le papier de la maquette : de #f3ead2 en haut à #e4d4ae en bas (le milieu : sa teinte aux 7/10). */
const PAPER: Paper = ['#f3ead2', '#e9dbb9', '#e4d4ae'];
/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/** Les piqûres et les rousseurs du papier, comme sur la maquette (toujours les mêmes pour une page). */
const foxing = (context: CanvasRenderingContext2D, page: number): void => {
  const random = seeded(hashText(`nights:paper:${page}`));
  const { width, height } = PAGE_TEXTURE;
  for (let speck = 0; speck < 2600; speck++) {
    context.fillStyle = `rgba(120, 90, 40, ${random() * 0.06})`;
    context.fillRect(random() * width, random() * height, 1.5, 1.5);
  }
  for (let spot = 0; spot < 16; spot++) {
    context.fillStyle = `rgba(150, 100, 40, ${0.04 + random() * 0.06})`;
    context.beginPath();
    context.arc(random() * width, random() * height, 1 + random() * 3, 0, Math.PI * 2);
    context.fill();
  }
};

/** Les pièces de la reliure, longues à dessiner (le grain du maroquin) : gardées par langue (le titre en dépend). */
const pieces = slowPieces(
  {
    front: arabianNightsFront,
    back: arabianNightsBack,
    spine: () => arabianNightsSpine(THICKNESS),
  },
  getLocale,
);

/**
 * Dessine la reliure à l'avance, par petits morceaux quand le navigateur est libre : en main, le livre arrive
 * sans à-coup (dessinée d'un bloc à son arrivée, elle figeait l'image ~150 ms ; pièce par pièce, encore ~50 ms).
 */
const warm = async (): Promise<void> => {
  await loadArabianNightsFonts();
  await pieces.ahead();
};

/**
 * « Les Mille et Une Nuits » : notre reliure orientale (maroquin bordeaux et or) et dedans tout le
 * recueil, conte après conte, avec ses nuits au fil du texte : en français la traduction de Galland
 * (Le Normant, 1806), en anglais celle de Jonathan Scott faite sur Galland (1811). Chaque conte est coupé à
 * 4 pages pour que tout tienne dans les 410 pages.
 */
export const arabianNightsArt = classicArt({
  id: 'arabianNights',
  paper: PAPER,
  thickness: THICKNESS,
  style: {
    body: GARAMOND,
    size: 21,
    line: 27,
    ink: INK,
    accent: INK,
    dropCap: FELL,
    heading: GARAMOND,
    chaptersOnRight: false,
    chapterPages: 4,
    head: arabianNightsHead,
    // Les placements de la maquette (y : lignes de base).
    marks: {
      first: 110,
      opening: 330,
      runningHead: { font: `italic 14px ${GARAMOND}`, color: '#7a6f60', spacing: 2, y: 58 },
      folio: { font: `15px ${GARAMOND}`, color: INK, y: PAGE_TEXTURE.height - 46 },
      centered: { font: `21px ${GARAMOND}`, spacing: 3, rule: 14, half: 24, after: 13.5 },
      dropCapOnSecondLine: true,
    },
  },
  decorate: foxing,
  fonts: loadArabianNightsFonts,
  warm,
  cover: () => ({
    cover: canvasTexture(pieces.now('front')),
    back: canvasTexture(pieces.now('back')),
    // L'intérieur des plats : le bordeaux du maroquin, plus sombre (crème, il se confondait avec les pages).
    inside: plainBoard('#4a1518', '#2a0b0d'),
    spine: canvasTexture(pieces.now('spine')),
    leather: Number.parseInt(MOROCCO.slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture('#6a1f22', '#d9b25a'),
  }),
  titlePage: arabianNightsTitlePage,
  contentsHeading: () => messages().rareBooks.arabianNights.contents,
});
