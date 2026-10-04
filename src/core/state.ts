import type { Notation } from './format';
import { TOOLS, type ToolId } from '../data/tools';
import type { HistoryEntry } from './history';
import type { Locale } from '../i18n';
import type { Find } from '../data/knowledge';
import type { PartId } from '../data/decipher';
import { newGameSeed } from './random';

export const SAVE_VERSION = 1;

/** Réglages du joueur : conservés quand on efface la sauvegarde. */
export interface Settings {
  /** La production fait tourner les pages du livre toute seule. */
  autoTurn: boolean;
  /** Le livre bouge doucement, tenu à bout de bras. */
  bookSway: boolean;
  /** Images par seconde affichées discrètement en bas à gauche. */
  showFps: boolean;
  /** Pas d'effet de flou (chiffres du livre étrange qui se réécrivent). */
  reduceBlur: boolean;
  /** Flèches ‹ › sous les livres pour tourner les pages (sinon : clic sur la page, touches ← →). */
  pageArrows: boolean;
  /** Façon d'écrire les grands nombres (core/format.ts). */
  notation: Notation;
}

/** Chiffres de la partie, relevés en silence : le joueur ne les découvre que plus tard. */
export interface Stats {
  /** Pages feuilletées à la main. */
  clicks: number;
  /** Temps passé le jeu ouvert, en secondes (les mises en veille ne comptent pas). */
  playSeconds: number;
  /** Meilleure production atteinte, en pages par seconde. */
  bestPagesPerSecond: number;
  /** Trouvailles (mots, morceaux de phrase, phrases) apparues dans les pages. */
  fragments: number;
}

export const DEFAULT_STATS: Stats = { clicks: 0, playSeconds: 0, bestPagesPerSecond: 0, fragments: 0 };

export const DEFAULT_SETTINGS: Settings = {
  autoTurn: true,
  bookSway: true,
  showFps: false,
  reduceBlur: false,
  pageArrows: false,
  notation: 'full',
};

export interface GameState {
  version: number;
  /** Pages disponibles, que l'on dépense. */
  pages: number;
  /** Pages lues depuis le début de la partie : ne baisse jamais, ni en dépensant ni à l'Exil. */
  totalPagesRead: number;
  tools: Record<ToolId, number>;
  /** Pages lues à l'écran dans le livre en main (0 à 408, deux par feuille tournée). */
  bookPage: number;
  /** Livres lus jusqu'au bout. */
  booksFinished: number;
  locale: Locale;
  /** Nom du joueur, demandé à l'arrivée (welcome.ts) : sur l'étiquette du cahier, et plus tard dans les textes. */
  playerName: string;
  settings: Settings;
  stats: Stats;
  /** Connaissance à dépenser : chaque trouvaille en rapporte un point. */
  knowledge: number;
  /** Connaissance trouvée pendant ce cycle (seuil d'Exil) : ne baisse pas en dépensant. */
  cycleKnowledge: number;
  /** Connaissance trouvée depuis le début de la partie : ne baisse jamais, ni à l'Exil. */
  lifetimeKnowledge: number;
  /** Mots, morceaux de phrase et phrases trouvés, dans l'ordre. */
  finds: Find[];
  /** Livre blanc : morceaux écrits de chaque phrase (data/sentences.ts), gardés pour toujours. */
  written: Record<string, number[]>;
  /**
   * Parties du Grand Livre lisibles d'office : payées du temps où elles s'achetaient (gardées pour toujours),
   * ou toutes, au débogage.
   */
  deciphered: PartId[];
  /** Parties du Grand Livre déjà vues en clair : une partie lisible qui n'y est pas porte une étoile. */
  partsRead: PartId[];
  /** Sceaux obtenus (voir data/seals.ts), avec leur date. */
  seals: Record<string, number>;
  /**
   * Livres rares trouvés (data/rareBooks.ts) et le numéro du livre où chacun l'a été. Uniques : jamais
   * retrouvés, et gardés à l'Exil (la bibliothèque personnelle n'est jamais remise à zéro).
   */
  rareBooks: Record<string, number>;
  /**
   * Livres rares que le joueur a vus écrits, à leur place, dans le Catalogue des catalogues lu dans la
   * bibliothèque (systems/catalogue.ts) : s'il en prend un ensuite, un sceau secret.
   */
  catalogueSpotted: string[];
  /** Sceaux obtenus que le joueur n'a pas encore vus dans le livre étrange. */
  newSeals: string[];
  /** Livres de la bibliothèque que le joueur y a déjà vus (systems/library.ts) : au-delà, la clé brille. */
  libraryBooksSeen: number;
  history: HistoryEntry[];
  /** Moments de lore (data/lore.ts) déclenchés mais pas encore lus : montrés dès que possible, même après un rechargement. */
  lorePending: string[];
  /** Moments de lore déjà lus : chacun ne se raconte qu'une fois. */
  loreSeen: string[];
  lastTick: number;
  /**
   * La graine de la partie (core/random.ts, gameRandom) : les couvertures, le texte des pages, les livres rares
   * et les trouvailles en sont tirés. Cachée : seul le cahier d'options l'écrit, pour la donner (débogage).
   * 0 : une partie d'avant les graines (la Bibliothèque de toujours).
   */
  seed: number;
}

export const createInitialState = (locale: Locale, now = Date.now(), seed = newGameSeed()): GameState => ({
  version: SAVE_VERSION,
  pages: 0,
  totalPagesRead: 0,
  tools: Object.fromEntries(TOOLS.map((tool) => [tool.id, 0])) as Record<ToolId, number>,
  bookPage: 0,
  booksFinished: 0,
  locale,
  playerName: '',
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  knowledge: 0,
  cycleKnowledge: 0,
  lifetimeKnowledge: 0,
  finds: [],
  written: {},
  deciphered: [],
  partsRead: [],
  seals: {},
  rareBooks: {},
  catalogueSpotted: [],
  newSeals: [],
  libraryBooksSeen: 0,
  history: [{ type: 'gameStarted', at: now }],
  lorePending: [],
  loreSeen: [],
  lastTick: now,
  seed,
});
