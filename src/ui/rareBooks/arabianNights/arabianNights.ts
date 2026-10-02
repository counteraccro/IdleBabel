import { headbandTexture } from '../../book3d/headband';
import { messages } from '../../../i18n';
import { board } from '../draw';
import { classicArt } from '../classic/classicArt';
import {
  CALF,
  FELL,
  GARAMOND,
  INK,
  arabianNightsBack,
  arabianNightsFront,
  arabianNightsSpine,
  arabianNightsTitlePage,
  loadArabianNightsFonts,
  sprinkledEdge,
} from './arabianNightsCover';
import { arabianNightsHead } from './arabianNightsHead';
import type { Paper } from '../../book/pageRender';

/** Un papier de 1704, chiffon un peu jauni. */
const PAPER: Paper = ['#f3ead2', '#eadfc0', '#e4d4ae'];
/** Un petit livre de cabinet, épais. */
const THICKNESS = 0.12;

/**
 * « Les Mille et Une Nuits » : la reliure de l'édition d'origine (Galland, Paris, 1704) et dedans tout le
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
  },
  fonts: loadArabianNightsFonts,
  cover: () => ({
    cover: arabianNightsFront(),
    back: arabianNightsBack(),
    inside: board('#eadfc0', '#e4d4ae'),
    spine: arabianNightsSpine(THICKNESS),
    leather: Number.parseInt(CALF.slice(1), 16),
    edge: sprinkledEdge(),
    paper: PAPER[0],
    headband: headbandTexture('#8e2a1e', '#e8d9b0'),
  }),
  titlePage: arabianNightsTitlePage,
  contentsHeading: () => messages().rareBooks.arabianNights.contents,
});
