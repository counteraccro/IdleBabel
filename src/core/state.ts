import type { ToolId } from '../data/tools';
import type { HistoryEntry } from './history';
import type { Locale } from '../i18n';

export const SAVE_VERSION = 1;

/** Réglages du joueur : conservés quand on efface la sauvegarde. */
export interface Settings {
  /** La production fait tourner les pages du livre toute seule. */
  autoTurn: boolean;
  /** Le livre bouge doucement, tenu à bout de bras. */
  bookSway: boolean;
  /** Images par seconde affichées discrètement en bas à gauche. */
  showFps: boolean;
}

/** Chiffres de la partie, relevés en silence : le joueur ne les découvre que plus tard. */
export interface Stats {
  /** Pages feuilletées à la main. */
  clicks: number;
  /** Temps passé le jeu ouvert, en secondes (les mises en veille ne comptent pas). */
  playSeconds: number;
  /** Meilleure production atteinte, en pages par seconde. */
  bestPagesPerSecond: number;
  /** Phrases sensées apparues dans les pages. */
  fragments: number;
}

export const DEFAULT_STATS: Stats = { clicks: 0, playSeconds: 0, bestPagesPerSecond: 0, fragments: 0 };

export const DEFAULT_SETTINGS: Settings = { autoTurn: true, bookSway: true, showFps: false };

export interface GameState {
  version: number;
  /** Pages disponibles, que l'on dépense. */
  pages: number;
  /** Pages lues depuis le début de la partie : ne baisse jamais, ni en dépensant ni à l'Exil. */
  totalPagesRead: number;
  tools: Record<ToolId, number>;
  /** Pages tournées à l'écran dans le livre en main (0 à 409). */
  bookPage: number;
  /** Livres lus jusqu'au bout. */
  booksFinished: number;
  locale: Locale;
  settings: Settings;
  stats: Stats;
  history: HistoryEntry[];
  lastTick: number;
}

export const createInitialState = (locale: Locale, now = Date.now()): GameState => ({
  version: SAVE_VERSION,
  pages: 0,
  totalPagesRead: 0,
  tools: { diagonal: 0 },
  bookPage: 0,
  booksFinished: 0,
  locale,
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  history: [{ type: 'gameStarted', at: now }],
  lastTick: now,
});
