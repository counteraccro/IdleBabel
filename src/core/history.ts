import type { GameState } from './state';

/**
 * Moments marquants de la partie : ils écrivent le livre de la fin (systems/chronicle.ts les relève,
 * systems/finalBook.ts les raconte). N'enregistrer que des « premières fois » et des événements rares.
 * `debug` : une action du panneau de débogage (son libellé en précision), jamais racontée.
 */
export type HistoryType =
  | 'gameStarted'
  | 'firstClick'
  | 'firstTool'
  | 'firstBook'
  | 'strangeBook'
  | 'firstKnowledge'
  | 'memory'
  | 'firstAnomaly'
  | 'books'
  | 'pages'
  | 'rareBook'
  | 'firstSeal'
  | 'secretSeal'
  | 'firstAbsence'
  | 'debug';

export interface HistoryEntry {
  type: HistoryType;
  at: number;
  /** Précision éventuelle, ex. l'identifiant de l'outil. */
  detail?: string;
  /** Arrivé pendant une action du panneau de débogage : le livre le dit en marge. */
  debug?: true;
}

/** Pendant une action du panneau de débogage (debug/debugMark.ts) : les moments enregistrés en portent la marque. */
let debugging = false;
export const markingDebug = (on: boolean): void => {
  debugging = on;
};

/** Ajoute l'événement s'il n'a jamais eu lieu (même type et même précision). */
export const recordOnce = (state: GameState, type: HistoryType, detail?: string, at = Date.now()): void => {
  const exists = state.history.some((e) => e.type === type && e.detail === detail);
  if (!exists) state.history.push(debugging ? { type, at, detail, debug: true } : { type, at, detail });
};

/** Une action du panneau de débogage, à chaque fois : ce qui a été touché, et comment. */
export const recordDebug = (state: GameState, label: string, at = Date.now()): void => {
  state.history.push({ type: 'debug', at, detail: label, debug: true });
};
