import { preparePageTexture, type Paper } from '../../book/pageRender';
import { edgeTexture } from '../../book3d/textures';
import { loadComicFonts } from './comicDraw';
import { BLUE, comicBack, comicFront, comicInside, comicSpine } from './comicCover';
import { PLATES, paintPlate } from './comicPlates';
import { paintEndpaper, paintNoisePlate, paintTitlePage } from './comicNoise';
import type { RareBookArt } from '../rareBookArt';

const THICKNESS = 0.1;

/** Le papier de la maquette, à peine plus foncé en bas. */
const PAPER: Paper = ['#f3ecdc', '#f3ecdc', '#efe6d2'];

/** Page 1 : le titre ; page 2 : la garde ; pages 3 à 10 : les huit planches ; puis le reste de l'album. */
const FIRST_PLATE_PAGE = 3;

/**
 * « Gare aux pages » (maquette .ai/maquette-bd-notice.html, validée le 22/10) : une notice du jeu en bande dessinée,
 * dessinée avec les seuls symboles de Babel, sans héros ; puis le reste de l'album, des planches de charabia. Lisible en
 * entier dès qu'il arrive (rien ne se débloque plus tard).
 */
export const comicNoticeArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadComicFonts();
    return {
      cover: comicFront(),
      back: comicBack(),
      inside: comicInside(),
      spine: comicSpine(THICKNESS),
      leather: BLUE,
      edge: edgeTexture(PAPER[1], '#ddd2b8'),
      paper: PAPER[0],
    };
  },
  prepare: async () => {
    await loadComicFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    const ctx = preparePageTexture(canvas, spineOnLeft, PAPER);
    const plate = page - FIRST_PLATE_PAGE + 1;
    if (page === 1) paintTitlePage(ctx);
    else if (page === 2) paintEndpaper(ctx);
    else if (plate <= PLATES) paintPlate(ctx, plate);
    else paintNoisePlate(ctx, plate);
    return true;
  },
};
