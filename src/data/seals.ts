import type { GameState } from '../core/state';
import { STRANGE_BOOK_INDEX } from '../systems/strangeBook';
import { meaningfulCovers } from '../systems/stats';
import { isComplete } from '../systems/sentences';
import { ANOMALIES, ANOMALY_FAMILIES } from './anomalies';
import { RARE_BOOKS } from './rareBooks';
import { TECHNOLOGIES } from './technologies';
import { levelOf, lockOf, maxLevel } from '../systems/technologies';
import type { ToolId } from './tools';

/**
 * Les sceaux (succès), rangés par planche dans le livre étrange. Pour en ajouter un :
 * une ligne ici, et son texte dans i18n (strangeBook.seals.<texte>) — le sigle, la place sur la
 * planche et la légende sont générés.
 */
export const PLATES = ['pages', 'books', 'fragments', 'time', 'methods', 'intuitions', 'rare', 'secrets'] as const;
export type PlateId = (typeof PLATES)[number];

export interface SealDef {
  id: string;
  plate: PlateId;
  /** Clé du texte : strangeBook.seals.<text> ; `{n}` y est remplacé par le palier. */
  text: string;
  /** Palier d'une série (le sigle de la série se complexifie d'un palier à l'autre). */
  tier?: { n: number; index: number };
  /** Sceau d'un livre rare (data/rareBooks.ts) : son titre remplace `{title}` dans le texte. */
  rareBook?: string;
  /** Sceau de l'intuition d'une méthode : le nom de la méthode remplace `{title}` dans le texte. */
  tool?: ToolId;
  reached: (state: GameState) => boolean;
}

/** Graine du sigle : celui de la série (les paliers en héritent), ou le sien pour un livre rare (tous ont le même texte). */
export const sealSeries = (seal: SealDef): string => (seal.rareBook || seal.tool ? seal.id : seal.text);

/** Une série : un sceau par palier, atteint quand `value` dépasse le palier. */
const series = (id: string, plate: PlateId, value: (state: GameState) => number, steps: number[]): SealDef[] =>
  steps.map((n, index) => ({ id: `${id}-${n}`, plate, text: id, tier: { n, index }, reached: (state) => value(state) >= n }));

/** Un sceau seul. */
const seal = (id: string, plate: PlateId, reached: (state: GameState) => boolean): SealDef => ({ id, plate, text: id, reached });

/** Un secret qui tient à un geste, pas à l'état de la partie : apposé par sealEvent (systems/seals.ts). */
const secret = (id: string): SealDef => seal(id, 'secrets', () => false);

/** Niveau d'une intuition sans fin qui lui vaut son sceau (elle n'a pas de 100 %). */
const ENDLESS_SEAL_LEVEL = 10;

/**
 * Le sceau d'une intuition, au dernier niveau compris ; une sans fin, au niveau 10. Le Flair aussi quand
 * il ne reste plus de livre rare à trouver (il ne peut plus monter). Une intuition de méthode : un texte
 * commun, le nom de la méthode dedans.
 */
const intuitionSeal = (tech: (typeof TECHNOLOGIES)[number]): SealDef => {
  const last = maxLevel(tech.id) === Infinity ? ENDLESS_SEAL_LEVEL : maxLevel(tech.id);
  const tool = 'tool' in tech ? tech.tool : undefined;
  return {
    id: `intuition-${tech.id}`,
    plate: 'intuitions',
    text: tool ? 'intuitionGesture' : `intuition-${tech.id}`,
    tool,
    reached: (s) => levelOf(s, tech.id) >= last || lockOf(s, tech.id) === 'nothingLeft',
  };
};

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
  // La découverte du livre étrange (pas un secret : il arrive à son numéro de livre).
  seal('strangeBook', 'books', (s) => s.booksFinished >= STRANGE_BOOK_INDEX),

  ...series('fragments', 'fragments', (s) => s.stats.fragments, [1, 10, 100, K]),
  // Une famille d'anomalies complète (data/anomalies.ts).
  ...ANOMALY_FAMILIES.map((family) =>
    seal(`anomalies-${family}`, 'fragments', (s) =>
      ANOMALIES.filter((anomaly) => anomaly.family === family).every((anomaly) => isComplete(s, anomaly.id)),
    ),
  ),

  ...series('playTime', 'time', (s) => s.stats.playSeconds / HOUR, [1, 10, 100]),

  ...series('diagonal', 'methods', (s) => s.tools.diagonal, [1, 10, 100, K]),

  ...TECHNOLOGIES.map(intuitionSeal),

  // Un sceau par livre rare, apposé quand il arrive en main.
  ...RARE_BOOKS.map((book): SealDef => ({
    id: `rare-${book.id}`,
    plate: 'rare',
    text: 'rareBook',
    rareBook: book.id,
    reached: (s) => book.id in s.rareBooks,
  })),

  seal('insomnia', 'secrets', () => new Date().getHours() === 3),
  seal('still', 'secrets', (s) => !s.settings.bookSway),
  // Les nombres écrits en chiffres de Babel (option « Nombres » du cahier).
  seal('babelDigits', 'secrets', (s) => s.settings.notation === 'babel'),
  // Le cahier d'options refermé sur son dos, où toutes les multiplications donnent 410.
  secret('notebookBack'),
  // Son nom, page 15 du DeathBook (ui/rareBooks/deathBook.ts).
  secret('deathBook'),
  // Son nom et son numéro, à sa place dans l'Annuaire (ui/rareBooks/directory.ts).
  secret('directory'),
  // Le premier livre, relu dans la bibliothèque jusqu'à la dernière page, et refermé (ui/library/libraryPage.ts).
  secret('reread'),
  // L'article BABEL de l'Encyclopédie, « en Hébreu confusion » (ui/rareBooks/encyclopedia/encyclopedia.ts).
  secret('babelDefinition'),
  // « Nom de Zeus ! », écrit à la main dans les notes de l'Almanach des sports (ui/rareBooks/almanac/almanac.ts).
  secret('greatScott'),
  // Un « ha ! » au crayon, barré, page 25 des Jokes de Papa (ui/rareBooks/dadJokes/dadJokes.ts).
  secret('neverLaughed'),
  // Un mot entouré au crayon, à la dernière page du Manuscrit de Voynich (ui/rareBooks/voynich/voynich.ts).
  secret('oneWord'),
  // Un livre rare lu à sa place dans le Catalogue des catalogues, ouvert dans la bibliothèque, puis pris en main
  // (systems/catalogue.ts, systems/rareBooks.ts).
  secret('trueCatalogue'),
  // Une page numérotée 410 dans le Livre de sable, lu dans la bibliothèque (ui/rareBooks/sand/sand.ts).
  secret('sandLastPage'),
  // Le seul y du grand livre du X, page 205, lu dans la bibliothèque (ui/rareBooks/bigX/bigX.ts).
  secret('foundTypo'),
  // Les deux collègues, AlexH et Oriana, trouvés tous les deux (ils travaillent ensemble, jusque dans leurs livres).
  seal('colleagues', 'secrets', (s) => 'alexH' in s.rareBooks && 'oriana' in s.rareBooks),
];
