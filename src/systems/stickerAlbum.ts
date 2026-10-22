import { RARE_BOOKS } from '../data/rareBooks';
import { coverDesign, type CoverDesign } from './coverDesign';
import { STRANGE_BOOK_INDEX } from './strangeBook';
import type { GameState } from '../core/state';

/**
 * L'album d'autocollants « Les Couvertures de Babel » (maquette .ai/maquette-album-autocollants.html, validée le 22/10) :
 * chaque case attend une sorte de couverture ; le premier livre lu qui lui correspond la remplit, les suivants sont des
 * doubles. Les couvertures se déduisent de la graine et du numéro du livre : rien n'est enregistré, l'album se refait en
 * passant les livres lus en revue (scanAlbum), par petits bouts.
 */

/** Les sortes de cases, dans l'ordre de l'album ; leurs noms sont dans i18n (rareBooks.stickerAlbum). */
export type AlbumPart =
  'leathers' | 'corners' | 'ornaments' | 'rolls' | 'half' | 'modern' | 'comics' | 'titles' | 'words' | 'rares' | 'rarest' | 'dates';

export interface AlbumSlot {
  /** Numéro de l'autocollant, à partir de 1. */
  number: number;
  part: AlbumPart;
  /** Rang dans sa partie. */
  rank: number;
  /** Une couverture ordinaire : le livre n° `book` en est-il une ? */
  test?: (design: CoverDesign, book: number) => boolean;
  /** Un livre rare : rempli quand il a été trouvé. */
  rare?: string;
  /** Une grande date : le livre n° `at` (0 : le premier). */
  at?: number;
}

/** Les sept cuirs (book/bindings.ts) : un livre sur sept, chacun le sien. */
export const LEATHERS = 7;
/** Les éditions modernes : trois mises en page (coverDesign.ts), quatre toiles (bindings.ts). */
export const MODERN_LAYOUTS = 3;
export const MODERN_COLORS = 4;
/** Les titres et les mots qui ont un sens (i18n covers.titles et covers.words : autant dans chaque langue). */
export const SENSE_TITLES = 8;
export const SENSE_WORDS = 16;
export const ALBUMS = 12;

/** Une reliure de cuir entière (ni moderne, ni demi-reliure, ni le livre étrange). */
const isLeather = (design: CoverDesign): boolean => !design.modern && !design.strange && !!design.details && !design.details.half;
const kind = (design: CoverDesign): string => design.details?.kind ?? 'none';
const senseRank = (design: CoverDesign, count: number): number => Math.floor(design.sense.pick * count);

/**
 * Les introuvables : une couverture précise (cuir, fleuron, fer d'angle, roulette, parfois un titre ou un cartouche), de la
 * moins rare (~1 livre sur 4 000) à la plus rare (~1 sur 500 000), mesuré sur 500 000 livres.
 */
export interface Rarest {
  leather: number;
  ornament: number;
  corner: number;
  roll: number;
  title?: number;
  cartouche?: number;
}
export const RAREST: readonly Rarest[] = [
  { leather: 2, ornament: 3, corner: 1, roll: 3, cartouche: 2 },
  { leather: 3, ornament: 2, corner: 0, roll: 0, cartouche: 1 },
  { leather: 4, ornament: 7, corner: 0, roll: 0, title: 2 },
  { leather: 6, ornament: 6, corner: 2, roll: 1, title: 4 },
  { leather: 5, ornament: 5, corner: 3, roll: 2, title: 0 },
  { leather: 1, ornament: 4, corner: 2, roll: 1, title: 3 },
  { leather: 5, ornament: 7, corner: 0, roll: 0, title: 1, cartouche: 0 },
  { leather: 0, ornament: 1, corner: 1, roll: 2, title: 5, cartouche: 0 },
];

const isRarest =
  ({ leather, ornament, corner, roll, title, cartouche }: Rarest) =>
  (design: CoverDesign, book: number): boolean =>
    isLeather(design) &&
    book % LEATHERS === leather &&
    design.details!.ornament === ornament &&
    design.details!.corner === corner &&
    design.details!.roll === roll &&
    (title === undefined || (design.sense.kind === 'title' && senseRank(design, SENSE_TITLES) === title)) &&
    (cartouche === undefined || design.details!.cartouche === cartouche);

/** Les grandes dates : le premier livre, le livre étrange, puis tous les ordres de grandeur. */
export const DATES: readonly number[] = [0, STRANGE_BOOK_INDEX, 9, 99, 999, 9_999, 99_999, 999_999];

/** Les livres rares en autocollants brillants : tous, sauf celui de débogage. */
export const ALBUM_RARES: readonly string[] = RARE_BOOKS.map((book) => book.id).filter((id) => id !== 'debug');

const range = (count: number): number[] => Array.from({ length: count }, (_, i) => i);

const PARTS: [AlbumPart, Omit<AlbumSlot, 'number' | 'part' | 'rank'>[]][] = [
  ['leathers', range(LEATHERS).map((k) => ({ test: (d, book) => isLeather(d) && book % LEATHERS === k }))],
  ['corners', range(4).map((k) => ({ test: (d) => isLeather(d) && d.details!.corner === k }))],
  ['ornaments', range(8).map((k) => ({ test: (d) => isLeather(d) && d.details!.ornament === k }))],
  ['rolls', range(4).map((k) => ({ test: (d) => isLeather(d) && d.details!.roll === k }))],
  [
    'half',
    range(8).map((k) => ({
      test: (d) => !d.modern && !!d.details?.half && d.details.marble === k >> 1 && d.details.marbleKind === (k & 1),
    })),
  ],
  [
    'modern',
    range(MODERN_LAYOUTS * MODERN_COLORS).map((k) => ({
      test: (d, book) =>
        d.modern && kind(d) === 'none' && d.layout === Math.floor(k / MODERN_COLORS) && book % MODERN_COLORS === k % MODERN_COLORS,
    })),
  ],
  ['comics', range(ALBUMS).map((k) => ({ test: (d) => kind(d) === 'comic' && d.details!.album === k + 1 }))],
  ['titles', range(SENSE_TITLES).map((k) => ({ test: (d) => d.sense.kind === 'title' && senseRank(d, SENSE_TITLES) === k }))],
  ['words', range(SENSE_WORDS).map((k) => ({ test: (d) => d.sense.kind === 'word' && senseRank(d, SENSE_WORDS) === k }))],
  ['rares', ALBUM_RARES.map((rare) => ({ rare }))],
  ['rarest', RAREST.map((rarest) => ({ test: isRarest(rarest) }))],
  ['dates', DATES.map((at) => ({ at }))],
];

export const ALBUM_SLOTS: readonly AlbumSlot[] = PARTS.flatMap(([part, slots]) =>
  slots.map((slot, rank) => ({ ...slot, part, rank, number: 0 })),
).map((slot, i) => ({ ...slot, number: i + 1 }));

/** Les cases d'une partie, dans l'ordre. */
export const partSlots = (part: AlbumPart): AlbumSlot[] => ALBUM_SLOTS.filter((slot) => slot.part === part);

const SCANNED = ALBUM_SLOTS.filter((slot) => slot.test);

/** Les livres lus passés en revue : pour chaque case à tester, le premier livre qui la remplit et ses doubles. */
interface Scan {
  seed: number;
  /** Livres passés en revue : 0 à done − 1. */
  done: number;
  first: Map<number, number>;
  doubles: Map<number, number>;
}
let scan: Scan = { seed: -1, done: 0, first: new Map(), doubles: new Map() };

/** Les livres où un livre rare a été trouvé : leur couverture est la sienne, pas une couverture ordinaire. */
const rareIndexes = (state: GameState): Set<number> => new Set(Object.values(state.rareBooks));

/**
 * Passe en revue au plus `limit` livres lus de plus ; true quand tous le sont. Une autre partie (graine) ou un livre
 * qui a reculé : on repart du premier.
 */
export const scanAlbum = (state: GameState, limit = Infinity): boolean => {
  if (scan.seed !== state.seed || scan.done > state.booksFinished)
    scan = { seed: state.seed, done: 0, first: new Map(), doubles: new Map() };
  const end = Math.min(state.booksFinished, scan.done + limit);
  if (scan.done >= end) return scan.done >= state.booksFinished;
  const rares = rareIndexes(state);
  for (let book = scan.done; book < end; book++) {
    if (book === STRANGE_BOOK_INDEX || rares.has(book)) continue;
    const design = coverDesign(book);
    for (const slot of SCANNED) {
      if (!slot.test!(design, book)) continue;
      if (scan.first.has(slot.number)) scan.doubles.set(slot.number, (scan.doubles.get(slot.number) ?? 0) + 1);
      else scan.first.set(slot.number, book);
    }
  }
  scan.done = end;
  return scan.done >= state.booksFinished;
};

/** Livres passés en revue à la fois : ~7 ms. */
export const ALBUM_STEP = 400;

/** L'autocollant d'une case : le livre d'où il vient (rien : la case est vide) et ses doubles. */
export const albumSticker = (state: GameState, slot: AlbumSlot): { book?: number; doubles: number } => {
  if (slot.rare) return { book: state.rareBooks[slot.rare], doubles: 0 };
  if (slot.at !== undefined) return { book: slot.at < state.booksFinished ? slot.at : undefined, doubles: 0 };
  if (scan.seed !== state.seed) return { doubles: 0 };
  return { book: scan.first.get(slot.number), doubles: scan.doubles.get(slot.number) ?? 0 };
};

/** Le livre rare trouvé au livre n° `book`, s'il y en a un. */
export const rareAt = (state: GameState, book: number): string | undefined =>
  Object.keys(state.rareBooks).find((id) => state.rareBooks[id] === book);
