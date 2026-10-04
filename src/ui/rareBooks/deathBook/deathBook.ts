import { sealEvent } from '../../../systems/seals';
import { edgeTexture } from '../../book3d/textures';
import { GOTHIC, deathBookBack, deathBookFront, deathBookSpine } from './deathBookCover';
import { DEATH_PAPER, SCENARIO_PAGE, loadDeathFonts, paintDeathPage } from './deathBookPages';
import { plainBoard } from '../draw';
import type { RareBookArt } from '../rareBookArt';

/** 410 pages, comme tous les livres de Babel : l'épaisseur d'un livre ordinaire. */
const THICKNESS = 0.12;

/**
 * Le DeathBook : un cahier noir comme celui qu'il imite (mais de 410 pages), son titre en lettres gothiques, son
 * mode d'emploi au dos. Dedans, des listes de noms, quelques noms énormes, et page 15 le joueur : le
 * trouver là est un secret.
 */
export const deathBookArt: RareBookArt = {
  thickness: THICKNESS,
  paper: DEATH_PAPER,
  look: async () => {
    await Promise.all([document.fonts.load(`40px ${GOTHIC}`), loadDeathFonts()]);
    return {
      cover: deathBookFront(),
      back: deathBookBack(),
      inside: plainBoard('#151516', '#070708'),
      spine: deathBookSpine(THICKNESS),
      leather: 0x1a1a1b,
      edge: edgeTexture(DEATH_PAPER[1], '#bdb8ac'),
      paper: DEATH_PAPER[0],
      // Un cahier : pas de tranchefiles.
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    paintDeathPage(page, canvas, spineOnLeft);
    return true;
  },
  passed: (page, state) => {
    if (page === SCENARIO_PAGE) sealEvent(state, 'deathBook');
  },
};
