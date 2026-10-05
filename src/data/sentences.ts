import type { ToolId } from './tools';
import { ANOMALIES, type AnomalyFamily } from './anomalies';

/**
 * Phrases du livre blanc. Leur texte (i18n : whiteBook.sentences.<id>) est découpé en morceaux par
 * « / » : chaque morceau se trouve dans les pages du livre en main. Un morceau d'un ou deux mots est
 * un mot (avec son article), au-delà un morceau de phrase. Même nombre de morceaux dans chaque langue.
 */
export type SentenceKind = 'method' | 'memory' | 'anomaly';

export interface SentenceDef {
  id: string;
  kind: SentenceKind;
  /** Méthode de lecture que la phrase fait découvrir, une fois complète. */
  tool?: ToolId;
  /** Famille d'une anomalie (data/anomalies.ts). */
  family?: AnomalyFamily;
}

export const SENTENCES: readonly SentenceDef[] = [
  // Au réveil, le livre blanc est vierge : même la première méthode est à trouver.
  { id: 'diagonal', kind: 'method', tool: 'diagonal' },
  { id: 'finger', kind: 'method', tool: 'finger' },
  { id: 'voice', kind: 'method', tool: 'voice' },
  { id: 'lectern', kind: 'method', tool: 'lectern' },
  { id: 'ladder', kind: 'method', tool: 'ladder' },
  { id: 'cup', kind: 'memory' },
  ...ANOMALIES,
];
