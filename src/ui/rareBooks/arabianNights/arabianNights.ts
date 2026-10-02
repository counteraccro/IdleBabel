import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { getLocale, messages } from '../../../i18n';
import { canvasTexture } from '../../book3d/textures';
import { board } from '../draw';
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
import type * as THREE from 'three';

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

/**
 * « Les Mille et Une Nuits » : notre reliure orientale (maroquin bordeaux et or) et dedans tout le
 * recueil, conte après conte, avec ses nuits au fil du texte : en français la traduction de Galland
 * (Le Normant, 1806), en anglais celle de Jonathan Scott faite sur Galland (1811). Chaque conte est coupé à
 * 4 pages pour que tout tienne dans les 410 pages.
 */
/** Les pièces de la reliure : chacune prend de 20 à 70 ms à dessiner (le grain du maroquin). */
const PIECES = {
  front: arabianNightsFront,
  back: arabianNightsBack,
  spine: () => arabianNightsSpine(THICKNESS),
};
type Piece = keyof typeof PIECES;
/** Les pièces déjà dessinées, par langue (le titre du plat et du dos en dépend) : on ne les redessine pas. */
const drawn = new Map<string, HTMLCanvasElement>();
const piece = (name: Piece): THREE.CanvasTexture => {
  const key = `${name}:${getLocale()}`;
  let canvas = drawn.get(key);
  if (!canvas) {
    canvas = PIECES[name]().image as HTMLCanvasElement;
    drawn.set(key, canvas);
  }
  return canvasTexture(canvas);
};
/** Attend un moment où le navigateur est libre (entre deux images, sans page qui tourne). */
const idle = (): Promise<void> =>
  new Promise((resolve) => ('requestIdleCallback' in window ? requestIdleCallback(() => resolve()) : setTimeout(resolve, 50)));
/**
 * Dessine la reliure à l'avance, une pièce à la fois quand le navigateur est libre : en main, le livre arrive
 * sans à-coup (dessinée d'un bloc à son arrivée, elle figeait l'image ~150 ms).
 */
const warm = async (): Promise<void> => {
  await loadArabianNightsFonts();
  for (const name of Object.keys(PIECES) as Piece[]) {
    if (drawn.has(`${name}:${getLocale()}`)) continue;
    await idle();
    piece(name);
  }
};

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
    cover: piece('front'),
    back: piece('back'),
    inside: board('#eadfc0', '#e4d4ae'),
    spine: piece('spine'),
    leather: Number.parseInt(MOROCCO.slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture('#6a1f22', '#d9b25a'),
  }),
  titlePage: arabianNightsTitlePage,
  contentsHeading: () => messages().rareBooks.arabianNights.contents,
});
