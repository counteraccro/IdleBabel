import type { ToolId } from './tools';

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
}

export const SENTENCES: readonly SentenceDef[] = [
  // Au réveil, le livre blanc est vierge : même la première méthode est à trouver.
  { id: 'diagonal', kind: 'method', tool: 'diagonal' },
  { id: 'finger', kind: 'method', tool: 'finger' },
  { id: 'thumb', kind: 'method', tool: 'thumb' },
  { id: 'voice', kind: 'method', tool: 'voice' },
  { id: 'wide', kind: 'method', tool: 'wide' },
  { id: 'double', kind: 'method', tool: 'double' },
  { id: 'mirror', kind: 'method', tool: 'mirror' },
  { id: 'lectern', kind: 'method', tool: 'lectern' },
  { id: 'ladder', kind: 'method', tool: 'ladder' },
  { id: 'cup', kind: 'memory' },
  { id: 'shelves', kind: 'anomaly' },
  // La structure de la Bibliothèque (chiffres de Borges), qui ne tombe jamais juste.
  { id: 'thirtyOne', kind: 'anomaly' },
  { id: 'stairs', kind: 'anomaly' },
  { id: 'hallMirror', kind: 'anomaly' },
  { id: 'extraLine', kind: 'anomaly' },
  { id: 'lamps', kind: 'anomaly' },
  { id: 'passages', kind: 'anomaly' },
  { id: 'airShaft', kind: 'anomaly' },
  { id: 'symbols', kind: 'anomaly' },
  { id: 'inkStain', kind: 'anomaly' },
  { id: 'warmCloset', kind: 'anomaly' },
  // Le livre qui te parle (phrases de l'auteur, 30/09).
  { id: 'iSeeYou', kind: 'anomaly' },
  { id: 'iKnowYou', kind: 'anomaly' },
  { id: 'iKnowMe', kind: 'anomaly' },
  { id: 'never', kind: 'anomaly' },
  { id: 'almost', kind: 'anomaly' },
  { id: 'alreadyFound', kind: 'anomaly' },
  // Citations célèbres : la Bibliothèque contient aussi tout ce qui a déjà été dit (idée de l'auteur, 30/09).
  { id: 'yourFather', kind: 'anomaly' },
  { id: 'illBeBack', kind: 'anomaly' },
  { id: 'toBe', kind: 'anomaly' },
  { id: 'borgesParadise', kind: 'anomaly' },
  { id: 'sisyphus', kind: 'anomaly' },
  { id: 'theWord', kind: 'anomaly' },
  { id: 'deadPeople', kind: 'anomaly' },
  { id: 'shallNotPass', kind: 'anomaly' },
  { id: 'silence', kind: 'anomaly' },
  { id: 'ishmael', kind: 'anomaly' },
  { id: 'cogito', kind: 'anomaly' },
  { id: 'socrates', kind: 'anomaly' },
  { id: 'hell', kind: 'anomaly' },
  { id: 'proust', kind: 'anomaly' },
  { id: 'vanity', kind: 'anomaly' },
  { id: 'force', kind: 'anomaly' },
  { id: 'houston', kind: 'anomaly' },
  { id: 'precious', kind: 'anomaly' },
  { id: 'onceUpon', kind: 'anomaly' },
  { id: 'galileo', kind: 'anomaly' },
  { id: 'dice', kind: 'anomaly' },
  { id: 'veni', kind: 'anomaly' },
  { id: 'lavoisier', kind: 'anomaly' },
  { id: 'smallStep', kind: 'anomaly' },
];
