import { t } from '../../i18n';
import { edgeTexture, rasterizeSvg } from '../book3d/textures';
import { doodleSvg } from './doodles';
import { createWriter, PEN_FONT, zoneAt, type Zone } from './notebookInk';
import { loadPaperWear, NOTEBOOK_PAPER, paintNotebookPaper } from './notebookPaper';
import { createNotebookPages, NOTEBOOK_PAGES, type NotebookActions, type Sketches } from './notebookPages';
import { notebookCover } from './notebookCover';
import { HAND } from '../strangeBook/pageItems';
import { sealEvent } from '../../systems/seals';
import type { Book3d } from '../book3d/book3dBook';
import type { GameState } from '../../core/state';

const sketchImage = (kind: keyof Sketches, seed: number, color: string): Promise<HTMLCanvasElement> =>
  rasterizeSvg(doodleSvg(kind, seed, color), 300, 300);

/**
 * Le cahier d'options, en 3D : un cahier d'écolier à petits carreaux et couverture souple, où l'on
 * coche les réglages au stylo. Mince (24 pages), agrafé : ni tranchefiles, ni signet.
 */
export const notebook3d = (state: GameState, actions: NotebookActions): Book3d => {
  const write = createNotebookPages(state, actions);
  let wears: HTMLCanvasElement[] = [];
  let sketches: Sketches | null = null;
  // Pour savoir ce qu'un clic touche : la page réécrite sur un canvas de brouillon.
  const draft = document.createElement('canvas').getContext('2d')!;
  const zonesOf = (index: number): Zone[] => {
    if (!sketches) return [];
    const writer = createWriter(draft, index);
    write(index, writer, sketches, index % 2 === 1);
    return writer.zones;
  };
  return {
    // Proportions d'une page ; plats de carte fine, à peine plus grands que les feuilles.
    shape: { width: 0.8, height: 1, thickness: 0.02, board: 0.0025, overhang: 0.004, corner: 0.012 },
    source: {
      count: NOTEBOOK_PAGES,
      paint: (index, canvas, spineOnLeft) => {
        const context = paintNotebookPaper(canvas, spineOnLeft, wears[index % wears.length]);
        if (sketches) write(index, createWriter(context, index), sketches, spineOnLeft);
        return true;
      },
    },
    press: (index, x, y) => {
      const zone = zoneAt(zonesOf(index), x, y);
      zone?.act();
      return zone !== undefined;
    },
    pointable: (index, x, y) => zoneAt(zonesOf(index), x, y) !== undefined,
    // Secret : regarder le dos du cahier, et ses multiplications qui donnent toutes 410.
    closedOnBack: () => sealEvent(state, 'notebookBack'),
    look: async () => {
      // Les pages s'écrivent avec ces polices : chargées avant le premier dessin.
      await Promise.all([document.fonts.load(`24px ${PEN_FONT}`), document.fonts.load(`20px ${HAND}`)]);
      const pencil = '#4a463f';
      const [wear, hexagon, books, spiral, scratch] = await Promise.all([
        loadPaperWear(),
        sketchImage('hexagon', 7, pencil),
        sketchImage('books', 3, pencil),
        sketchImage('spiral', 11, pencil),
        sketchImage('spiral', 11, '#d9e2de'),
      ]);
      wears = wear;
      sketches = { hexagon, books, spiral };
      const cover = await notebookCover(t('ui.options'), scratch);
      return {
        cover: cover.front,
        back: cover.back,
        inside: cover.inside,
        spine: cover.spine,
        // Chants de la carte : la couleur de la couverture, à peine assombrie.
        leather: 0xd8d8d8,
        edge: edgeTexture(NOTEBOOK_PAPER[0], '#d3cdbd'),
        paper: NOTEBOOK_PAPER[0],
      };
    },
  };
};
