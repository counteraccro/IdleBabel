import type { GameState } from './state';

/**
 * Moments marquants de la partie : ils serviront à écrire le Livre Total.
 * N'enregistrer que des « premières fois » et des événements rares.
 */
export type HistoryType = 'gameStarted' | 'firstClick' | 'firstTool' | 'firstBook' | 'strangeBook';

export interface HistoryEntry {
  type: HistoryType;
  at: number;
  /** Précision éventuelle, ex. l'identifiant de l'outil. */
  detail?: string;
}

/** Ajoute l'événement s'il n'a jamais eu lieu (même type et même précision). */
export const recordOnce = (state: GameState, type: HistoryType, detail?: string, at = Date.now()): void => {
  const exists = state.history.some((e) => e.type === type && e.detail === detail);
  if (!exists) state.history.push({ type, at, detail });
};
