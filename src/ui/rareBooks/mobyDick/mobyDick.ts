import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { messages } from '../../../i18n';
import { plainBoard } from '../draw';
import { classicArt } from '../classic/classicArt';
import { CASLON, CLOTH, INK, loadMobyDickFonts, mobyDickBack, mobyDickFront, mobyDickSpine, mobyDickTitlePage } from './mobyDickCover';
import type { Paper } from '../../book/pageRender';

/** Un papier de 1851, plus jauni que celui d'Alice. */
const PAPER: Paper = ['#f4ecd8', '#ece0c4', '#e0cfa8'];
/** Un gros livre. */
const THICKNESS = 0.13;

/**
 * « Moby-Dick; or, The Whale » : la première édition américaine (Harper & Brothers, 1851 : toile ardoise
 * gaufrée à froid, titre doré au dos seulement), et dedans le texte original anglais dans les deux langues
 * du jeu (pas de traduction française libre complète). Chaque chapitre est coupé à 3 pages pour que tout
 * tienne, de l'Étymologie à l'Épilogue.
 */
export const mobyDickArt = classicArt({
  id: 'mobyDick',
  locales: ['en'],
  paper: PAPER,
  thickness: THICKNESS,
  style: { body: CASLON, size: 17, line: 26, ink: INK, accent: INK, heading: CASLON, chaptersOnRight: false, chapterPages: 3 },
  fonts: loadMobyDickFonts,
  cover: () => ({
    cover: mobyDickFront(),
    back: mobyDickBack(),
    // L'intérieur des plats : l'ardoise de la toile, plus sombre (crème, il se confondait avec les pages).
    inside: plainBoard('#3a4148', '#22272c'),
    spine: mobyDickSpine(THICKNESS),
    leather: Number.parseInt(CLOTH.slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c4b088'),
    paper: PAPER[0],
    headband: headbandTexture(CLOTH, '#d9c9a0'),
  }),
  titlePage: mobyDickTitlePage,
  contentsHeading: () => messages().rareBooks.mobyDick.contents,
});
