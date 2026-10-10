import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { plainBoard } from '../draw';
import { classicArt } from '../classic/classicArt';
import { OLD, RED, centerEarthBack, centerEarthFront, centerEarthSpine, loadCenterEarthFonts } from './centerEarthCover';
import {
  BODY_LINE,
  BODY_SIZE,
  INK,
  PAPER,
  centerEarthChapter,
  centerEarthHead,
  centerEarthRunning,
  centerEarthTitlePage,
} from './centerEarthPages';

/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/**
 * « Voyage au centre de la Terre » de Jules Verne (Hetzel, 1864) dans un cartonnage d'étrennes de son éditeur :
 * percaline rouge, or et noir, tranches dorées. Dedans, tout le texte : en français l'édition illustrée de
 * Hetzel (1867, Wikisource), en anglais la traduction de F. A. Malleson (Ward, Lock & Co., 1877, Gutenberg),
 * sans ses notes. Le parchemin de Saknussemm et son nom y sont en vraies runes, centrés comme les autres
 * figures (les lettres dictées par Axel, la phrase latine).
 */
export const centerEarthArt = classicArt({
  id: 'centerEarth',
  paper: PAPER,
  thickness: THICKNESS,
  style: {
    body: OLD,
    size: BODY_SIZE,
    line: BODY_LINE,
    ink: INK,
    accent: INK,
    heading: OLD,
    chaptersOnRight: false,
    head: centerEarthHead,
    centerVerses: true,
    contentsName: centerEarthChapter,
    marks: {
      first: 104,
      opening: 300,
      runningHead: {
        font: `italic 12px ${OLD}`,
        color: '#7a6f60',
        spacing: 2,
        y: 56,
        left: () => messages().rareBooks.centerEarth.running,
        right: centerEarthRunning,
      },
      folio: { font: `14px ${OLD}`, color: INK, y: PAGE_TEXTURE.height - 46 },
      centered: { font: `${BODY_SIZE}px ${OLD}`, spacing: 0, rule: 0, half: 0, after: 0 },
      dropCapOnSecondLine: false,
    },
  },
  fonts: loadCenterEarthFonts,
  cover: () => ({
    cover: centerEarthFront(),
    back: centerEarthBack(),
    // L'intérieur des plats : le rouge de la percaline, plus sombre (crème, il se confondrait avec les pages).
    inside: plainBoard('#6e1414', '#3e0a0a'),
    spine: centerEarthSpine(THICKNESS),
    leather: Number.parseInt(RED[0].slice(1), 16),
    // Les tranches dorées des cartonnages.
    edge: edgeTexture('#d4ad5a', '#a8822f'),
    paper: PAPER[0],
    headband: headbandTexture(RED[0], '#e8d9a8'),
  }),
  titlePage: centerEarthTitlePage,
  contentsHeading: () => messages().rareBooks.centerEarth.contents,
});
