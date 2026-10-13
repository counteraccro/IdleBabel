import { preparePageTexture, type Paper } from '../../book/pageRender';
import { edgeTexture } from '../../book3d/textures';
import { colorZone } from '../../../systems/coloring';
import { loadColoringFonts } from './coloringDraw';
import { YELLOW, coloringBack, coloringFront, coloringInside, coloringSpine } from './coloringCover';
import { coloringZones, zoneAt } from './coloringDrawings';
import { ERASER, choosePencil, chosenPencil, drawingOf, paintColoringPage, pencilAt } from './coloringPages';
import type { ColoringDrawingId } from '../../../data/coloring';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette : 100 de large pour 800 de haut (le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 100 / 800 / 1.4;

/** Le papier de la maquette, un peu plus jaune en bas. */
const PAPER: Paper = ['#f8f2e2', '#f2e9d3', '#efe5cc'];

type Target = { id: ColoringDrawingId; color: string } | { id: ColoringDrawingId; zone: string };

/** Ce qui est sous (x, y) sur la page `page` : un crayon de la boîte, ou une zone du dessin. */
const target = (page: number, x: number, y: number): Target | undefined => {
  const id = drawingOf(page);
  if (!id) return undefined;
  if (page % 2 === 0) {
    const color = pencilAt(id, x, y);
    return color ? { id, color } : undefined;
  }
  const zone = zoneAt(id, x, y);
  return zone ? { id, zone } : undefined;
};

/**
 * « Colorie la Bibliothèque » (maquette .ai/maquette-coloriage.html, piste A) : un cahier de coloriage des années 60,
 * neuf grands dessins. Dans la bibliothèque, on touche un crayon de la boîte (il sort), puis une zone du dessin : elle
 * se remplit, avec le grain du crayon ; la gomme efface. Les couleurs sont gardées dans la partie, et le livre en main
 * montre les dessins coloriés. Deux sceaux (systems/coloring.ts).
 */
export const coloringArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadColoringFonts();
    return {
      cover: coloringFront(),
      back: coloringBack(),
      inside: coloringInside(),
      spine: coloringSpine(THICKNESS),
      leather: YELLOW,
      edge: edgeTexture(PAPER[1], '#ddd2b8'),
      paper: PAPER[0],
      // Un cahier agrafé : ni tranchefiles, ni signet.
    };
  },
  prepare: async () => {
    await loadColoringFonts();
  },
  paint: (page, canvas, spineOnLeft, state) => {
    paintColoringPage(preparePageTexture(canvas, spineOnLeft, PAPER), page, state);
    return true;
  },
  press: (page, x, y, state) => {
    const hit = target(page, x, y);
    if (!hit) return false;
    if ('color' in hit) choosePencil(hit.id, hit.color);
    else {
      const color = chosenPencil(hit.id);
      colorZone(state, hit.id, hit.zone, color === ERASER ? null : color, coloringZones());
    }
    return true;
  },
  pointable: (page, x, y) => target(page, x, y) !== undefined,
};
