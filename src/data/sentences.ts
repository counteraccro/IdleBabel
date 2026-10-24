import { AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE, type ToolId } from './tools';
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
  /**
   * Une méthode secrète : sa phrase n'existe pour le chercheur qu'une fois cette étoile de l'Etherium allumée (le
   * souvenir flou), et le prestige ne la fait jamais oublier.
   */
  secret?: string;
  /** L'étoile de l'Etherium qui achète l'Âge de sa méthode : avant, la phrase n'existe pas pour le chercheur. */
  age?: string;
}

export const SENTENCES: readonly SentenceDef[] = [
  // Au réveil, le livre blanc est vierge : même la première méthode est à trouver.
  { id: 'diagonal', kind: 'method', tool: 'diagonal' },
  { id: 'finger', kind: 'method', tool: 'finger' },
  { id: 'voice', kind: 'method', tool: 'voice' },
  { id: 'lectern', kind: 'method', tool: 'lectern' },
  { id: 'ladder', kind: 'method', tool: 'ladder' },
  { id: 'cornee', kind: 'method', tool: 'cornee', secret: 'memory.m0' },
  { id: 'metronome', kind: 'method', tool: 'metronome', age: AUTOMATIC_AGE },
  { id: 'wheel', kind: 'method', tool: 'wheel', age: AUTOMATIC_AGE },
  { id: 'lift', kind: 'method', tool: 'lift', age: AUTOMATIC_AGE },
  { id: 'automaton', kind: 'method', tool: 'automaton', age: AUTOMATIC_AGE },
  { id: 'clock', kind: 'method', tool: 'clock', age: AUTOMATIC_AGE },
  { id: 'minitel', kind: 'method', tool: 'minitel', age: DIGITAL_AGE },
  { id: 'computer', kind: 'method', tool: 'computer', age: DIGITAL_AGE },
  { id: 'search', kind: 'method', tool: 'search', age: DIGITAL_AGE },
  { id: 'crawler', kind: 'method', tool: 'crawler', age: DIGITAL_AGE },
  { id: 'algorithm', kind: 'method', tool: 'algorithm', age: DIGITAL_AGE },
  { id: 'bit', kind: 'method', tool: 'bit', secret: 'memory.n0', age: DIGITAL_AGE },
  { id: 'microscope', kind: 'method', tool: 'microscope', age: QUANTUM_AGE },
  { id: 'entangled', kind: 'method', tool: 'entangled', age: QUANTUM_AGE },
  { id: 'teleportation', kind: 'method', tool: 'teleportation', age: QUANTUM_AGE },
  { id: 'grover', kind: 'method', tool: 'grover', age: QUANTUM_AGE },
  { id: 'quantumComputer', kind: 'method', tool: 'quantumComputer', age: QUANTUM_AGE },
  { id: 'qubit', kind: 'method', tool: 'qubit', secret: 'chandelier.chip', age: QUANTUM_AGE },
  { id: 'cup', kind: 'memory' },
  ...ANOMALIES,
];
