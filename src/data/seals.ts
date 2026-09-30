import type { GameState } from '../core/state';
import { STRANGE_BOOK_INDEX } from '../systems/strangeBook';
import { meaningfulCovers } from '../systems/stats';

/**
 * Les sceaux (succès), rangés par planche dans le livre étrange. Pour en ajouter un :
 * une ligne ici, et son texte dans i18n (strangeBook.seals.<texte>) — le sigle, la place sur la
 * planche et la légende sont générés.
 */
export const PLATES = ['pages', 'books', 'fragments', 'time', 'methods', 'secrets'] as const;
export type PlateId = (typeof PLATES)[number];

export interface SealDef {
  id: string;
  plate: PlateId;
  /** Clé du texte : strangeBook.seals.<text> ; `{n}` y est remplacé par le palier. */
  text: string;
  /** Palier d'une série (le sigle de la série se complexifie d'un palier à l'autre). */
  tier?: { n: number; index: number };
  reached: (state: GameState) => boolean;
}

/** Une série : un sceau par palier, atteint quand `value` dépasse le palier. */
const series = (id: string, plate: PlateId, value: (state: GameState) => number, steps: number[]): SealDef[] =>
  steps.map((n, index) => ({ id: `${id}-${n}`, plate, text: id, tier: { n, index }, reached: (state) => value(state) >= n }));

/** Un sceau seul. */
const seal = (id: string, plate: PlateId, reached: (state: GameState) => boolean): SealDef => ({ id, plate, text: id, reached });

/** Un secret qui tient à un geste, pas à l'état de la partie : apposé par sealEvent (systems/seals.ts). */
const secret = (id: string): SealDef => seal(id, 'secrets', () => false);

const K = 1_000;
const M = 1_000_000;
const G = 1_000_000_000;
const HOUR = 3600;

export const SEALS: readonly SealDef[] = [
  ...series('pagesRead', 'pages', (s) => s.totalPagesRead, [1, 100, 10 * K, M, G, K * G]),
  ...series('clicks', 'pages', (s) => s.stats.clicks, [100, K, 10 * K, 100 * K]),
  ...series('stock', 'pages', (s) => s.pages, [K, M, G]),
  ...series('speed', 'pages', (s) => s.stats.bestPagesPerSecond, [1, 10, K, M]),

  ...series('booksFinished', 'books', (s) => s.booksFinished, [1, 10, 100, K, 10 * K]),
  ...series('meaningfulCovers', 'books', meaningfulCovers, [1, 10, 100]),

  ...series('fragments', 'fragments', (s) => s.stats.fragments, [1, 10, 100, K]),

  ...series('playTime', 'time', (s) => s.stats.playSeconds / HOUR, [1, 10, 100]),

  ...series('diagonal', 'methods', (s) => s.tools.diagonal, [1, 10, 100, K]),

  seal('strangeBook', 'secrets', (s) => s.booksFinished >= STRANGE_BOOK_INDEX),
  seal('insomnia', 'secrets', () => new Date().getHours() === 3),
  seal('still', 'secrets', (s) => !s.settings.bookSway),
  // Les nombres écrits en chiffres de Babel (option « Nombres » du cahier).
  seal('babelDigits', 'secrets', (s) => s.settings.notation === 'babel'),
  // Le cahier d'options refermé sur son dos, où toutes les multiplications donnent 410.
  secret('notebookBack'),
];
