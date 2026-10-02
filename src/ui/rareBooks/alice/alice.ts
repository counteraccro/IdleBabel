import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { messages } from '../../../i18n';
import { board } from '../draw';
import { classicArt } from '../classic/classicArt';
import { CLOTH, INK, OLD, PLAYFAIR, aliceBack, aliceFront, aliceSpine, aliceTitlePage, loadAliceFonts } from './aliceCover';
import type { Paper } from '../../book/pageRender';

/** Un papier crème du XIXe siècle, un peu jauni. */
const PAPER: Paper = ['#f6efdf', '#efe5cf', '#e4d6b8'];
const THICKNESS = 0.11;

/**
 * « Alice au pays des merveilles » : la première édition (toile rouge, or, aucun titre sur le plat), et
 * dedans tout le vrai texte, la traduction d'Henri Bué (1869) en français, l'original en anglais.
 */
export const aliceArt = classicArt({
  id: 'alice',
  paper: PAPER,
  thickness: THICKNESS,
  style: { body: OLD, size: 17, line: 26, ink: INK, accent: '#8a1c22', dropCap: PLAYFAIR, heading: OLD, chaptersOnRight: true },
  fonts: loadAliceFonts,
  cover: () => ({
    cover: aliceFront(),
    back: aliceBack(),
    // L'intérieur des plats : le rouge de la toile, plus sombre (crème, il se confondait avec les pages).
    inside: board('#6e161c', '#430c10'),
    spine: aliceSpine(THICKNESS),
    leather: Number.parseInt(CLOTH.slice(1), 16),
    edge: edgeTexture(PAPER[1], '#c9b790'),
    paper: PAPER[0],
    headband: headbandTexture(CLOTH, '#e8d9a8'),
  }),
  titlePage: aliceTitlePage,
  contentsHeading: () => messages().rareBooks.alice.contents,
});
