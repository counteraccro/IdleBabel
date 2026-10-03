import { OLD_PAPER } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { idleBabelBack, idleBabelFront, idleBabelInside, idleBabelSpine, loadIdleBabelFonts } from './idleBabelCover';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette (140 × 1000) à ses vraies proportions. */
const THICKNESS = 0.1;

/**
 * « Idle Babel », l'autobiographie du jeu : la Bibliothèque contient forcément le livre de sa propre
 * création. Des mémoires reliés en maroquin, le plan d'une galerie poussé en or (idleBabelCover.ts). Pages
 * encore blanches.
 */
export const idleBabelArt: RareBookArt = {
  thickness: THICKNESS,
  paper: OLD_PAPER,
  look: async () => {
    await loadIdleBabelFonts();
    return {
      cover: idleBabelFront(),
      back: idleBabelBack(),
      inside: idleBabelInside(),
      spine: idleBabelSpine(),
      leather: 0x2a1d16,
      edge: edgeTexture(OLD_PAPER[1], '#c9b48a'),
      paper: OLD_PAPER[0],
      headband: headbandTexture('#2a1d16', '#d9a94e'),
      ribbon: 0xb8863b,
    };
  },
  paint: () => false,
};
