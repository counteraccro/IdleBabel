import { recordOnce } from '../core/history';
import { SENTENCES } from '../data/sentences';
import { isComplete } from './sentences';
import type { GameState } from '../core/state';

/** Paliers racontés par le livre de la fin : livres refermés, pages lues. */
export const BOOK_MILESTONES = [10, 100, 1000] as const;
export const PAGE_MILESTONES = [1000, 1_000_000] as const;
/** Sceaux secrets que le livre de la fin raconte (les autres n'ont pas encore de phrase). */
export const TOLD_SECRETS = ['insomnia', 'still', 'babelDigits', 'colleagues'] as const;

const MEMORIES = SENTENCES.filter((sentence) => sentence.kind === 'memory');
const ANOMALIES = SENTENCES.filter((sentence) => sentence.kind === 'anomaly');

/**
 * Relève dans la partie les moments du livre de la fin qui ne viennent pas d'un geste précis (ceux-là
 * s'enregistrent sur place : premier clic, premier outil…). Appelé à chaque tick : chacun une seule fois.
 */
export const chronicle = (state: GameState, now = Date.now()): void => {
  if (state.lifetimeKnowledge > 0) recordOnce(state, 'firstKnowledge', undefined, now);
  for (const memory of MEMORIES) if (isComplete(state, memory.id)) recordOnce(state, 'memory', memory.id, now);
  if (ANOMALIES.some((anomaly) => isComplete(state, anomaly.id))) recordOnce(state, 'firstAnomaly', undefined, now);
  for (const count of BOOK_MILESTONES) if (state.booksFinished >= count) recordOnce(state, 'books', String(count), now);
  for (const count of PAGE_MILESTONES) if (state.totalPagesRead >= count) recordOnce(state, 'pages', String(count), now);
  for (const id of Object.keys(state.rareBooks)) recordOnce(state, 'rareBook', id, now);
  const seals = Object.entries(state.seals);
  if (seals.length > 0) recordOnce(state, 'firstSeal', undefined, Math.min(...seals.map(([, at]) => at)));
  for (const id of TOLD_SECRETS) if (id in state.seals) recordOnce(state, 'secretSeal', id, state.seals[id]);
};
