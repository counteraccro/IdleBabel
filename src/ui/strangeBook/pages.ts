import { el } from '../dom';
import { coverDesign, shelfMarkText } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { CHAPTERS, chapterShown, chapterTitle, contentsTitle, figureCaption, figureShown, type Chapter } from './chapters';
import { createItemsView, drawItems, type Item } from './pageItems';
import type { GameState } from '../../core/state';

/** Une page du grand livre : ses chiffres suivent la partie en direct. */
export interface LeafPage {
  root: HTMLElement;
  update: () => void;
  /** Dessine la page sur la texture de la feuille qui tourne. */
  paint: (canvas: HTMLCanvasElement, spineOnLeft: boolean) => void;
}

const heading = (text: string): Item => ({ kind: 'text', text, x: 320, y: 100, size: 32, align: 'center', spacing: 6 });
const folio = (number: number): Item => ({ kind: 'text', text: String(number), x: 320, y: 730, size: 18, align: 'center', faded: true });

/** Page de garde : les chiffres de la page de titre du livre tenu en main, et sa cote. */
const titleItems = (): Item[] => {
  const design = coverDesign(STRANGE_BOOK_INDEX);
  const groups = design.blurb.split(' ');
  const lines = Array.from({ length: Math.ceil(groups.length / 3) }, (_, i) => groups.slice(i * 3, i * 3 + 3).join('  '));
  return [
    ...lines.map((text, i): Item => ({ kind: 'text', text, x: 320, y: 290 + i * 40, size: 22, align: 'center', faded: true, spacing: 4 })),
    { kind: 'text', text: shelfMarkText(design), x: 320, y: 660, size: 18, align: 'center', faded: true, spacing: 5 },
  ];
};

const ENTRY_TOP = 200;
const ENTRY_STEP = 60;

const contentsItems = (chapters: Chapter[], firstPage: number): Item[] => [
  heading(contentsTitle()),
  ...chapters.flatMap((chapter, index): Item[] => {
    const y = ENTRY_TOP + index * ENTRY_STEP;
    return [
      { kind: 'text', text: chapterTitle(chapter), x: 90, y, size: 26, align: 'left', spacing: 2 },
      { kind: 'dots', x1: 290, x2: 520, y: y + 20 },
      { kind: 'text', text: String(firstPage + index + 1), x: 550, y, size: 26, align: 'right' },
      { kind: 'link', y: y - 12, height: ENTRY_STEP - 6, target: firstPage + index },
    ];
  }),
  folio(2),
];

const FIGURE_TOP = 190;
const FIGURE_STEP = 125;

const chapterItems = (state: GameState, chapter: Chapter, number: number): Item[] => [
  heading(chapterTitle(chapter)),
  ...chapter.figures
    .filter((figure) => figureShown(state, figure))
    .flatMap((figure, index): Item[] => {
      const y = FIGURE_TOP + index * FIGURE_STEP;
      return [
        { kind: 'text', text: figure.value(state), x: 320, y, size: 52, align: 'center', spacing: 2 },
        { kind: 'text', text: figureCaption(figure), x: 320, y: y + 64, size: 20, align: 'center', italic: true, faded: true, spacing: 3 },
      ];
    }),
  folio(number),
];

const createLeafPage = (layout: () => Item[], goTo: (page: number) => void): LeafPage => {
  const root = el('div', 'sb-paper');
  const render = createItemsView(root, goTo);
  render(layout());
  return {
    root,
    update: () => render(layout()),
    paint: (canvas, spineOnLeft) => drawItems(canvas, layout(), spineOnLeft),
  };
};

/** Toutes les pages : garde, sommaire, puis un chapitre par page (ceux déjà débloqués). */
export const createPages = (state: GameState, goTo: (page: number) => void): LeafPage[] => {
  const chapters = CHAPTERS.filter((chapter) => chapterShown(state, chapter));
  const first = 2;
  return [
    createLeafPage(titleItems, goTo),
    createLeafPage(() => contentsItems(chapters, first), goTo),
    ...chapters.map((chapter, index) => createLeafPage(() => chapterItems(state, chapter, first + index + 1), goTo)),
  ];
};
