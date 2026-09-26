import type { ToolId } from '../data/tools';
import type { HistoryEntry } from './history';
import type { Locale } from '../i18n';

export const SAVE_VERSION = 1;

export interface GameState {
  version: number;
  pages: number;
  tools: Record<ToolId, number>;
  locale: Locale;
  history: HistoryEntry[];
  lastTick: number;
}

export const createInitialState = (locale: Locale, now = Date.now()): GameState => ({
  version: SAVE_VERSION,
  pages: 0,
  tools: { diagonal: 0 },
  locale,
  history: [{ type: 'gameStarted', at: now }],
  lastTick: now,
});
