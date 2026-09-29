import { el } from '../dom';
import { coverDesign, shelfMarkText } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { CHAPTERS, chapterShown, chapterTitle, contentsTitle, figureCaption, figureShown, type Chapter } from './chapters';
import { createItemsView, drawItems, folio, heading, itemAt, pressItem, textLeft, textWidth, type Item, type ItemActions, type TextItem } from './pageItems';
import { newsMark, plateHasNews, plateTitle, sealLegend, sealsTitle, completionCaption, completionItems, plateItems, platePages, type PlatePage } from './plates';
import { markSealsSeen } from '../../systems/seals';
import { decipher, decipherPrice } from '../../systems/decipher';
import { t } from '../../i18n';
import type { PartId } from '../../data/decipher';
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
  /**
   * Clic au point (x, y) de la page dessinée (livre 3D, où la page n'est qu'une image) : le même effet
   * qu'un clic sur la page HTML. false : rien de cliquable ici.
   */
  press: (x: number, y: number) => boolean;
  /**
   * Souris au point (x, y) de la page dessinée : un sceau survolé écrit sa légende. true : la page a
   * changé (à redessiner).
   */
  hover: (x: number, y: number) => boolean;
  /** Quelque chose de cliquable au point (x, y) de la page dessinée (pour la main du pointeur). */
  pointable: (x: number, y: number) => boolean;
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
  title: (state: GameState) => string;
  /** Du nouveau à voir (sceaux) : une étoile dorée dans la marge. */
  news?: () => boolean;
  page: number;
  sub?: boolean;
}

const contentsItems = (state: GameState, entries: Entry[]): Item[] => {
  let y = ENTRY_TOP;
  return [
    heading(contentsTitle(state)),
    ...entries.flatMap((entry): Item[] => {
      const size = entry.sub ? 20 : 26;
      const step = entry.sub ? SUB_STEP : ENTRY_STEP;
      const top = y;
      y += step;
      const x = entry.sub ? 130 : 90;
      return [
        ...(entry.news?.() ? [newsMark(x - 12, top, size)] : []),
        { kind: 'text', text: entry.title(state), x, y: top, size, align: 'left', spacing: 2, faded: entry.sub },
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

/**
 * Offre au crayon : ce que le chercheur n'a pas su lire (`marked` : légendes, nom) est souligné d'un
 * pointillé ; un clic sur un texte souligné fait écrire la note en `noteY` (ce que ça coûte), un clic
 * sur la note paie. Le reste de la page tourne comme les autres. Sert à déchiffrer le livre étrange, et
 * à deviner un morceau dans le livre blanc.
 */
export const pencilOffer = (note: string, asking: boolean, noteY: number, marked: TextItem[]): Item[] => [
  ...marked.flatMap((text): Item[] => {
    const [left, width] = [textLeft(text), textWidth(text)];
    return [
      { kind: 'underline', x1: left, x2: left + width, y: text.y + text.size * 1.3 },
      { kind: 'action', id: 'ask', x: left - 10, width: width + 20, y: text.y - 6, height: text.size * 1.6 + 12 },
    ];
  }),
  ...(asking
    ? [
        { kind: 'text', text: note, x: 320, y: noteY, size: 30, align: 'center', face: 'hand', steady: true } satisfies Item,
        { kind: 'action', id: 'pay', y: noteY - 8, height: 44 } satisfies Item,
      ]
    : []),
];

/** Note d'un prix en Connaissance : ce qu'on obtient, ou ce qu'il manque. */
export const priceNote = (state: GameState, price: number, offer: string, short: string): string =>
  t(state.knowledge >= price ? offer : short).replace('{n}', String(price));

/** Partie encore illisible qui s'achète : ses légendes soulignées, la note au crayon propose de la déchiffrer. */
const decipherItems = (state: GameState, part: PartId, asking: boolean, noteY: number, marked: TextItem[]): Item[] => {
  const price = decipherPrice(state, part);
  if (price === undefined) return [];
  return pencilOffer(priceNote(state, price, 'strangeBook.decipher', 'strangeBook.decipherShort'), asking, noteY, marked);
};

const chapterItems = (state: GameState, chapter: Chapter, number: number, asking: boolean): Item[] => {
  const figures = chapter.figures.filter((figure) => figureShown(state, figure));
  const captions = figures.map(
    (figure, index): TextItem => ({
      kind: 'text',
      text: figureCaption(state, chapter, figure),
      x: 320,
      y: FIGURE_TOP + index * FIGURE_STEP + 64,
      size: 20,
      align: 'center',
      italic: true,
      faded: true,
      spacing: 3,
    }),
  );
  return [
    heading(chapterTitle(state, chapter)),
    ...figures.flatMap((figure, index): Item[] => [
      { kind: 'text', text: figure.value(state), x: 320, y: FIGURE_TOP + index * FIGURE_STEP, size: 52, align: 'center', spacing: 2 },
      captions[index],
    ]),
    ...decipherItems(state, chapter.id, asking, 676, captions),
    folio(number),
  ];
};

/** La page dont un sceau est survolé : une seule légende à la fois dans tout le livre. */
let legendOwner: LeafPage | null = null;

export interface PageHooks {
  /** La page arrive sous les yeux. */
  onShown?: () => void;
  /** Un de ses sceaux est survolé. */
  onHover?: (id: string) => void;
  /** Sa note au crayon est cliquée : payer pour déchiffrer. */
  onPay?: () => void;
}

/** Ce qui change sur une page sans venir de la partie : le sceau survolé, la note au crayon ouverte. */
export interface PageView {
  hovered: string | null;
  asking: boolean;
}

export const createLeafPage = (layout: (view: PageView) => Item[], goTo: (page: number) => void, hooks: PageHooks = {}): LeafPage => {
  const root = el('div', 'sb-paper');
  const view: PageView = { hovered: null, asking: false };
  const actions: ItemActions = {
    goTo,
    hover: (id) => {
      if (legendOwner !== page) legendOwner?.reset();
      legendOwner = page;
      hooks.onHover?.(id);
      view.hovered = id;
      render(layout(view));
    },
    act: (id) => {
      if (id === 'pay') hooks.onPay?.();
      view.asking = id === 'ask' && !view.asking;
      render(layout(view));
    },
  };
  const render = createItemsView(root, actions);
  render(layout(view));
  const page: LeafPage = {
    root,
    update: () => render(layout(view)),
    shown: () => {
      page.reset();
      hooks.onShown?.();
    },
    reset: () => {
      if (view.hovered === null && !view.asking) return;
      view.hovered = null;
      view.asking = false;
      render(layout(view));
    },
    paint: (canvas, spineOnLeft, paper) => drawItems(canvas, layout(view), spineOnLeft, paper),
    press: (x, y) => pressItem(itemAt(layout(view), x, y), actions),
    hover: (x, y) => {
      const item = itemAt(layout(view), x, y);
      if (item?.kind !== 'seal' || item.id === view.hovered) return false;
      actions.hover?.(item.id);
      return true;
    },
    pointable: (x, y) => itemAt(layout(view), x, y) !== undefined,
  };
  return page;
};

/**
 * Toutes les pages : garde, sommaire, un chapitre par page (ceux déjà débloqués), puis les sceaux :
 * une page d'introduction (avancement) et leurs planches.
 * `offset` : place de la garde dans le livre (0 : à gauche de la première double page, comme le livre
 * 2D ; 1 : à droite, le livre 3D gardant la gauche pour l'intérieur de la couverture). Les numéros de
 * page restent ceux de la liste.
 */
export const createPages = (state: GameState, goTo: (page: number) => void, offset = 0): LeafPage[] => {
  const chapters = CHAPTERS.filter((chapter) => chapterShown(state, chapter));
  const first = 2;
  // Les sceaux commencent sur une page impaire (à gauche, face à leur première planche) : sinon, une
  // page blanche est laissée avant eux.
  const blank = (offset + first + chapters.length) % 2 === 1;
  const sealsPage = first + chapters.length + (blank ? 1 : 0);
  const plates: PlatePage[] = platePages(sealsPage + 1);
  const entries: Entry[] = [
    ...chapters.map((chapter, index) => ({ title: () => chapterTitle(state, chapter), page: first + index })),
    { title: sealsTitle, page: sealsPage, news: () => state.newSeals.length > 0 },
    ...plates
      .filter((plate) => plate.part === 0)
      .map((plate) => ({ title: () => plateTitle(state, plate.plate), page: plate.page, sub: true, news: () => plateHasNews(state, plate.plate) })),
  ];
  // Sceaux nouveaux à l'ouverture du livre : ils luisent plus fort le temps de cette lecture, même une
  // fois leur planche vue (le signet, lui, s'éteint), jusqu'à ce qu'on les survole.
  const fresh = new Set(state.newSeals);
  const isFresh = (id: string): boolean => fresh.has(id) || state.newSeals.includes(id);
  return [
    createLeafPage(titleItems, goTo),
    createLeafPage(() => contentsItems(state, entries), goTo),
    ...chapters.map((chapter, index) =>
      createLeafPage(({ asking }) => chapterItems(state, chapter, first + index + 1, asking), goTo, {
        onPay: () => decipher(state, chapter.id),
      }),
    ),
    ...(blank ? [createLeafPage(() => [folio(sealsPage)], goTo)] : []),
    createLeafPage(
      ({ asking }) => [
        ...completionItems(state, plates, sealsPage + 1),
        ...decipherItems(state, 'seals', asking, 352, [completionCaption(state)]),
      ],
      goTo,
      { onPay: () => decipher(state, 'seals') },
    ),
    ...plates.map((plate) =>
      createLeafPage(({ hovered }) => plateItems(state, plate, sealLegend(state, hovered), isFresh), goTo, {
        onShown: () => markSealsSeen(state, plate.seals.map((seal) => seal.id)),
        onHover: (id) => {
          fresh.delete(id);
          markSealsSeen(state, [id]);
        },
      }),
    ),
  ];
};
