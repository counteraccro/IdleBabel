import { el } from '../dom';
import { AUTOMATIC_AGE } from '../../data/tools';
import { starLit } from '../../systems/etherium';
import { babelize, seedOf } from '../whiteBook/babelMask';
import { isDeciphered } from '../../systems/decipher';
import { coverDesign, shelfMarkText } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { CHAPTERS, chapterShown, chapterTitle, contentsTitle, figureCaption, figureShown, type Chapter } from './chapters';
import {
  createItemsView,
  drawItems,
  fitCaption,
  folio,
  heading,
  itemAt,
  pressItem,
  textLeft,
  textWidth,
  type Item,
  type ItemActions,
  type TextItem,
} from './pageItems';
import {
  newsMark,
  plateHasNews,
  plateTitle,
  sealLegend,
  sealsTitle,
  completionItems,
  plateItems,
  platePages,
  type PlatePage,
} from './plates';
import { markSealsSeen } from '../../systems/seals';
import { markPartRead, partHasNews } from '../../systems/decipher';
import { getLocale, t } from '../../i18n';
import { currentNotation, formatNumber, writeDigits } from '../../core/format';
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
/** Bas du sommaire, au-dessus du numéro de page : au-delà, les lignes se resserrent. */
const ENTRY_BOTTOM = 700;

/** Une entrée du sommaire ; `sub` : sous-entrée, en retrait et plus petite. */
interface Entry {
  title: (state: GameState) => string;
  /** Du nouveau à voir (sceaux, partie devenue lisible) : une étoile dorée dans la marge. */
  news?: () => boolean;
  page: number;
  sub?: boolean;
}

const contentsItems = (state: GameState, entries: Entry[]): Item[] => {
  let y = ENTRY_TOP;
  const height = entries.reduce((sum, entry) => sum + (entry.sub ? SUB_STEP : ENTRY_STEP), 0);
  const squeeze = Math.min(1, (ENTRY_BOTTOM - ENTRY_TOP) / height);
  return [
    ...heading(contentsTitle(state)),
    ...entries.flatMap((entry): Item[] => {
      const size = entry.sub ? 20 : 26;
      const step = (entry.sub ? SUB_STEP : ENTRY_STEP) * squeeze;
      const top = y;
      y += step;
      const x = entry.sub ? 130 : 90;
      return [
        ...(entry.news?.() ? [newsMark(x - 12, top, size)] : []),
        { kind: 'text', text: entry.title(state), x, y: top, size, align: 'left', spacing: 2, faded: entry.sub },
        { kind: 'dots', x1: 330, x2: 520, y: top + size * 0.75 },
        { kind: 'text', text: writeDigits(String(entry.page + 1)), x: 550, y: top, size, align: 'right', faded: entry.sub },
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
 * sur la note paie. Le reste de la page tourne comme les autres. Sert à deviner un morceau dans le livre blanc.
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
  t(state.knowledge >= price ? offer : short).replace('{n}', formatNumber(price, getLocale()));

/** Chiffre écrit en symboles de Babel (notation choisie dans les options) : doré, comme les titres. */
const babelGold = (item: TextItem): TextItem => (currentNotation() === 'babel' && !/\d/.test(item.text) ? { ...item, gold: true } : item);

/** Une ligne d'une décomposition sous la légende (la vitesse de lecture). */
const DETAIL_LINE = 28;

/** Les grands chiffres d'un chapitre, chacun sous le précédent ; une décomposition en plusieurs lignes repousse les suivants. */
const chapterItems = (state: GameState, chapter: Chapter, number: number): Item[] => {
  const figures = chapter.figures.filter((figure) => !figure.row && figureShown(state, figure));
  const readable = isDeciphered(state, chapter.id);
  const details = figures.map((figure) => figure.detail?.(state, readable));
  const lines = details.map((detail) => (Array.isArray(detail) ? detail : []));
  const tops = figures.map(
    (_, index) => FIGURE_TOP + index * FIGURE_STEP + lines.slice(0, index).reduce((total, list) => total + list.length * DETAIL_LINE, 0),
  );
  return [
    ...heading(chapterTitle(state, chapter), CHAPTERS.indexOf(chapter) + 1),
    ...figures.flatMap((figure, index): Item[] => {
      const detail = details[index];
      const value = babelGold({ kind: 'text', text: figure.value(state), x: 320, y: tops[index], size: 52, align: 'center', spacing: 2 });
      const caption = fitCaption({
        kind: 'text',
        text: figureCaption(state, chapter, figure),
        x: 320,
        y: tops[index] + 64,
        size: 20,
        align: 'center',
        italic: true,
        faded: true,
        spacing: 3,
      });
      const small = (text: string, y: number): TextItem =>
        fitCaption({ kind: 'text', text, x: 320, y, size: 19, align: 'center', spacing: 2 });
      if (typeof detail === 'string') return [value, small(detail, tops[index] + 60), { ...caption, y: caption.y + 28 }];
      return [value, caption, ...lines[index].map((line, i) => small(line, caption.y + 34 + i * DETAIL_LINE))];
    }),
    folio(number),
  ];
};

/**
 * Le relevé d'un chapitre (les méthodes : nom … exemplaires), sur ses propres pages après ses grands chiffres : il y
 * aura des dizaines de méthodes. L'Âge Automatique acheté, chaque Âge s'ouvre sur son sous-titre, comme dans le livre
 * blanc ; avant, rien ne le laisse deviner.
 */
const ROW_TOP = 180;
const ROW_STEP = 36;
const ROW_BOTTOM = 690;
/** Un sous-titre d'Âge : de l'air au-dessus, sa ligne, et un peu d'air avant la première méthode. */
const AGE_STEP = 60;

type Slot = { kind: 'age'; key: string } | { kind: 'row'; figure: Chapter['figures'][number] };

/** Les lignes du relevé, page par page ; un sous-titre ne reste jamais seul en bas d'une page. */
const rowPages = (state: GameState, chapter: Chapter): Slot[][] => {
  const byAge = starLit(state, AUTOMATIC_AGE);
  const slots: Slot[] = [];
  let age: string | null = null;
  for (const figure of chapter.figures.filter((candidate) => candidate.row && figureShown(state, candidate))) {
    const key = figure.age === AUTOMATIC_AGE ? 'automaticAge' : 'manualAge';
    if (byAge && key !== age) slots.push({ kind: 'age', key });
    age = key;
    slots.push({ kind: 'row', figure });
  }
  const pages: Slot[][] = [];
  let y = ROW_BOTTOM;
  for (const slot of slots) {
    // Un sous-titre passe à la page suivante s'il n'a pas sa première méthode sous lui.
    if (y + (slot.kind === 'age' ? AGE_STEP + ROW_STEP : ROW_STEP) > ROW_BOTTOM) {
      pages.push([]);
      y = ROW_TOP;
    }
    pages[pages.length - 1].push(slot);
    y += slot.kind === 'age' ? AGE_STEP : ROW_STEP;
  }
  return pages;
};

const rowsItems = (state: GameState, chapter: Chapter, slots: Slot[], number: number): Item[] => {
  const readable = isDeciphered(state, chapter.id);
  let y = ROW_TOP;
  return [
    ...heading(chapterTitle(state, chapter)),
    ...slots.flatMap((slot): Item[] => {
      const top = y;
      if (slot.kind === 'age') {
        y += AGE_STEP;
        const name = t(`whiteBook.parts.${slot.key}`);
        const text = readable ? name : babelize(name, seedOf(slot.key));
        return [{ kind: 'text', text, x: 320, y: top + 14, size: 22, align: 'center', italic: true, faded: true, spacing: 3 }];
      }
      y += ROW_STEP;
      const { figure } = slot;
      return [
        fitRow({ kind: 'text', text: figureCaption(state, chapter, figure), x: 110, y: top, size: 22, align: 'left', spacing: 2 }),
        { kind: 'dots', x1: 380, x2: 460, y: top + 17 },
        babelGold({ kind: 'text', text: figure.value(state), x: 530, y: top, size: 22, align: 'right' }),
      ];
    }),
    folio(number),
  ];
};

/** Le nom d'une ligne du relevé tient avant les points de conduite (« La Lecture Diagonale »). */
const fitRow = (item: TextItem): TextItem => {
  const width = textWidth(item);
  const room = 380 - 110 - 10;
  return width > room ? { ...item, size: Math.floor((item.size * room) / width), spacing: 1 } : item;
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
  /** Une autre action de la page est cliquée (une entrée du livre de débogage). */
  onAct?: (id: string) => void;
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
      else if (id !== 'ask') hooks.onAct?.(id);
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
/** Où tombe chaque partie du livre : chapitres (et leur relevé), puis les sceaux (introduction, planches). */
const layout = (state: GameState, offset: number) => {
  const chapters = CHAPTERS.filter((chapter) => chapterShown(state, chapter));
  const first = 2;
  // Chaque chapitre : sa page de grands chiffres, puis celles de son relevé.
  const listPages = chapters.map((chapter) => rowPages(state, chapter));
  const chapterPages = listPages.map((list) => 1 + list.length);
  const chapterStart = chapters.map((_, index) => first + chapterPages.slice(0, index).reduce((total, count) => total + count, 0));
  // Les sceaux commencent sur une page de gauche, face à leur première page de contenu : sinon, une page
  // blanche est laissée avant eux.
  const onLeft = (page: number): number => ((offset + page) % 2 === 1 ? page + 1 : page);
  const afterChapters = first + chapterPages.reduce((total, count) => total + count, 0);
  const sealsPage = onLeft(afterChapters);
  const plates: PlatePage[] = platePages(state, sealsPage + 1);
  return { chapters, listPages, chapterStart, afterChapters, sealsPage, plates };
};

/**
 * La page d'un sceau dans la liste : celle de sa planche (la page qui le porte) ; sans sceau (plusieurs à la fois),
 * l'introduction des sceaux. Pour la vision qu'on clique (ui/sealVision.ts).
 */
export const sealPage = (state: GameState, id: string | null, offset = 1): number => {
  const { sealsPage, plates } = layout(state, offset);
  return plates.find((plate) => plate.seals.some((seal) => seal.id === id))?.page ?? sealsPage;
};

/** `focus` : le sceau qu'on vient voir (une vision cliquée), en évidence sur sa planche, sa légende écrite d'office. */
export const createPages = (state: GameState, goTo: (page: number) => void, offset = 0, focus?: string): LeafPage[] => {
  const { chapters, listPages, chapterStart, afterChapters, sealsPage, plates } = layout(state, offset);
  const blankPage = (page: number): LeafPage => createLeafPage(() => [folio(page + 1)], goTo);
  const entries: Entry[] = [
    ...chapters.map((chapter, index) => ({
      title: () => chapterTitle(state, chapter),
      page: chapterStart[index],
      news: () => partHasNews(state, chapter.id),
    })),
    { title: sealsTitle, page: sealsPage, news: () => state.newSeals.length > 0 || partHasNews(state, 'seals') },
    ...plates
      .filter((plate) => plate.part === 0)
      .map((plate) => ({
        title: () => plateTitle(state, plate.plate),
        page: plate.page,
        sub: true,
        news: () => plateHasNews(state, plate.plate),
      })),
  ];
  // Sceaux nouveaux à l'ouverture du livre : ils luisent plus fort le temps de cette lecture, même une
  // fois leur planche vue (le signet, lui, s'éteint), jusqu'à ce qu'on les survole.
  const fresh = new Set(state.newSeals);
  const isFresh = (id: string): boolean => fresh.has(id) || state.newSeals.includes(id);
  return [
    createLeafPage(titleItems, goTo),
    createLeafPage(() => contentsItems(state, entries), goTo),
    ...chapters.flatMap((chapter, index) => {
      const start = chapterStart[index];
      return [
        createLeafPage(() => chapterItems(state, chapter, start + 1), goTo, { onShown: () => markPartRead(state, chapter.id) }),
        ...listPages[index].map((slots, part) => createLeafPage(() => rowsItems(state, chapter, slots, start + part + 2), goTo)),
      ];
    }),
    ...(sealsPage > afterChapters ? [blankPage(afterChapters)] : []),
    createLeafPage(() => completionItems(state, plates, sealsPage + 1), goTo, { onShown: () => markPartRead(state, 'seals') }),
    ...plates.map((plate) =>
      // Le sceau survolé, sinon celui qu'on est venu voir : sa légende, et son or plus vif.
      createLeafPage(
        ({ hovered }) => plateItems(state, plate, sealLegend(state, hovered ?? focus ?? null), isFresh, hovered ?? focus),
        goTo,
        {
          onShown: () =>
            markSealsSeen(
              state,
              plate.seals.map((seal) => seal.id),
            ),
          onHover: (id) => {
            fresh.delete(id);
            markSealsSeen(state, [id]);
          },
        },
      ),
    ),
  ];
};
