import { el } from '../dom';
import { coverDesign, shelfMarkText } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { CHAPTERS, chapterShown, chapterTitle, contentsTitle, figureCaption, figureShown, type Chapter } from './chapters';
import { createItemsView, drawItems, folio, heading, type Item } from './pageItems';
import { newsMark, plateHasNews, plateTitle, sealLegend, sealsTitle, completionItems, plateItems, platePages, type PlatePage } from './plates';
import { markSealsSeen } from '../../systems/seals';
import type { Paper } from '../book/pageRender';
import type { GameState } from '../../core/state';

/** Une page du grand livre : ses chiffres suivent la partie en direct. */
export interface LeafPage {
  root: HTMLElement;
  update: () => void;
  /** La page arrive sous les yeux : la légende d'un sceau survolé la dernière fois s'efface. */
  shown: () => void;
  /** Efface la légende du sceau survolé. */
  reset: () => void;
  /** Dessine la page sur la texture de la feuille qui tourne (sur le papier `paper`, celui du grand livre par défaut). */
  paint: (canvas: HTMLCanvasElement, spineOnLeft: boolean, paper?: Paper) => void;
}


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

const ENTRY_TOP = 180;
const ENTRY_STEP = 56;
const SUB_STEP = 40;

/** Une entrée du sommaire ; `sub` : sous-entrée, en retrait et plus petite. */
interface Entry {
  title: () => string;
  /** Du nouveau à voir (sceaux) : une étoile dorée dans la marge. */
  news?: () => boolean;
  page: number;
  sub?: boolean;
}

const contentsItems = (entries: Entry[]): Item[] => {
  let y = ENTRY_TOP;
  return [
    heading(contentsTitle()),
    ...entries.flatMap((entry): Item[] => {
      const size = entry.sub ? 20 : 26;
      const step = entry.sub ? SUB_STEP : ENTRY_STEP;
      const top = y;
      y += step;
      const x = entry.sub ? 130 : 90;
      return [
        ...(entry.news?.() ? [newsMark(x - 12, top, size)] : []),
        { kind: 'text', text: entry.title(), x, y: top, size, align: 'left', spacing: 2, faded: entry.sub },
        { kind: 'dots', x1: 330, x2: 520, y: top + size * 0.75 },
        { kind: 'text', text: String(entry.page + 1), x: 550, y: top, size, align: 'right', faded: entry.sub },
        { kind: 'link', y: top - 10, height: step - 4, target: entry.page },
      ];
    }),
    folio(2),
  ];
};

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

/** La page dont un sceau est survolé : une seule légende à la fois dans tout le livre. */
let legendOwner: LeafPage | null = null;

interface PageHooks {
  /** La page arrive sous les yeux. */
  onShown?: () => void;
  /** Un de ses sceaux est survolé. */
  onHover?: (id: string) => void;
}

/** `layout` reçoit le sceau survolé sur cette page (sa légende s'y écrit). */
const createLeafPage = (layout: (hovered: string | null) => Item[], goTo: (page: number) => void, hooks: PageHooks = {}): LeafPage => {
  const root = el('div', 'sb-paper');
  let hovered: string | null = null;
  const render = createItemsView(root, {
    goTo,
    hover: (id) => {
      if (legendOwner !== page) legendOwner?.reset();
      legendOwner = page;
      hooks.onHover?.(id);
      hovered = id;
      render(layout(hovered));
    },
  });
  render(layout(hovered));
  const page: LeafPage = {
    root,
    update: () => render(layout(hovered)),
    shown: () => {
      page.reset();
      hooks.onShown?.();
    },
    reset: () => {
      if (hovered === null) return;
      hovered = null;
      render(layout(hovered));
    },
    paint: (canvas, spineOnLeft, paper) => drawItems(canvas, layout(hovered), spineOnLeft, paper),
  };
  return page;
};

/**
 * Toutes les pages : garde, sommaire, un chapitre par page (ceux déjà débloqués), puis les sceaux :
 * une page d'introduction (avancement) et leurs planches.
 */
export const createPages = (state: GameState, goTo: (page: number) => void): LeafPage[] => {
  const chapters = CHAPTERS.filter((chapter) => chapterShown(state, chapter));
  const first = 2;
  // Les sceaux commencent sur une page impaire (à gauche, face à leur première planche) : sinon, une
  // page blanche est laissée avant eux.
  const blank = (first + chapters.length) % 2 === 1;
  const sealsPage = first + chapters.length + (blank ? 1 : 0);
  const plates: PlatePage[] = platePages(sealsPage + 1);
  const entries: Entry[] = [
    ...chapters.map((chapter, index) => ({ title: () => chapterTitle(chapter), page: first + index })),
    { title: sealsTitle, page: sealsPage, news: () => state.newSeals.length > 0 },
    ...plates
      .filter((plate) => plate.part === 0)
      .map((plate) => ({ title: () => plateTitle(plate.plate), page: plate.page, sub: true, news: () => plateHasNews(state, plate.plate) })),
  ];
  // Sceaux nouveaux à l'ouverture du livre : ils luisent plus fort le temps de cette lecture, même une
  // fois leur planche vue (le signet, lui, s'éteint), jusqu'à ce qu'on les survole.
  const fresh = new Set(state.newSeals);
  const isFresh = (id: string): boolean => fresh.has(id) || state.newSeals.includes(id);
  return [
    createLeafPage(titleItems, goTo),
    createLeafPage(() => contentsItems(entries), goTo),
    ...chapters.map((chapter, index) => createLeafPage(() => chapterItems(state, chapter, first + index + 1), goTo)),
    ...(blank ? [createLeafPage(() => [folio(sealsPage)], goTo)] : []),
    createLeafPage(() => completionItems(state, plates, sealsPage + 1), goTo),
    ...plates.map((plate) =>
      createLeafPage((hovered) => plateItems(state, plate, sealLegend(state, hovered), isFresh), goTo, {
        onShown: () => markSealsSeen(state, plate.seals.map((seal) => seal.id)),
        onHover: (id) => {
          fresh.delete(id);
          markSealsSeen(state, [id]);
        },
      }),
    ),
  ];
};
