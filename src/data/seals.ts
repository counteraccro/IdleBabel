import type { GameState } from '../core/state';
import { STRANGE_BOOK_INDEX } from '../systems/strangeBook';
import { meaningfulCovers } from '../systems/stats';
import { isComplete } from '../systems/sentences';
import { fullyDeciphered } from '../systems/decipher';
import { pagesPerSecond } from '../systems/production';
import { SENTENCES } from './sentences';
import { ETHERIUM_PAGES, STARS } from './etheriumStars';
import { ANOMALIES, ANOMALY_FAMILIES } from './anomalies';
import { RARE_BOOKS } from './rareBooks';
import { TECHNOLOGIES } from './technologies';
import { levelOf, lockOf, maxLevel } from '../systems/technologies';
import { AUTOMATIC_AGE, TOOLS, type ToolId } from './tools';

/**
 * Les sceaux (succès), rangés par planche dans le livre étrange. Pour en ajouter un :
 * une ligne ici, et son texte dans i18n (strangeBook.seals.<texte>) — le sigle, la place sur la
 * planche et la légende sont générés.
 */
export const PLATES = ['pages', 'books', 'fragments', 'time', 'methods', 'intuitions', 'etherium', 'rare', 'secrets'] as const;
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
  /** Sceau d'une méthode (planche « Méthodes ») : chacune a sa page, son nom en sous-titre ; `all`, toutes à la fois. */
  method?: ToolId | 'all';
  /** Une phrase à lui, au palier de sa série : strangeBook.seals.<text>.<index> (la liste de la série). */
  phrases?: boolean;
  reached: (state: GameState) => boolean;
}

/** Graine du sigle : celui de la série (les paliers en héritent), ou le sien pour un livre rare (tous ont le même texte). */
export const sealSeries = (seal: SealDef): string => (seal.rareBook || seal.tool ? seal.id : seal.text);

/** Une série : un sceau par palier, atteint quand `value` dépasse le palier. */
const series = (id: string, plate: PlateId, value: (state: GameState) => number, steps: number[]): SealDef[] =>
  steps.map((n, index) => ({ id: `${id}-${n}`, plate, text: id, tier: { n, index }, reached: (state) => value(state) >= n }));

/** Les chiffres d'un nombre de pages, tous écrits (jamais « 1e+21 »). */
const wholeDigits = (value: number): string => (Number.isFinite(value) ? BigInt(Math.floor(value)).toString() : '');

/** Un sceau seul. */
const seal = (id: string, plate: PlateId, reached: (state: GameState) => boolean): SealDef => ({ id, plate, text: id, reached });

/** Un sceau qui tient à un moment, pas à l'état de la partie : apposé par sealEvent (systems/seals.ts). */
const event = (id: string, plate: PlateId): SealDef => seal(id, plate, () => false);

/** Un secret qui tient à un geste : apposé par sealEvent. */
const secret = (id: string): SealDef => event(id, 'secrets');

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
const DAY = 24 * HOUR * 1000;
/** Jours depuis l'arrivée dans la Bibliothèque (le début de la partie), absences comprises. */
const daysSinceArrival = (state: GameState): number => {
  const started = state.history.find((entry) => entry.type === 'gameStarted')?.at;
  return started === undefined ? 0 : (Date.now() - started) / DAY;
};
/** Paliers des pages lues par une méthode, en multiples de son prix de base (même difficulté pour toutes). */
const METHOD_PAGES_STEPS = [10, 1e3, 1e5, 1e7, 1e9, 1e12];
/** Les volumes de méthodes : un à neuf livres de 410 achats. */
const VOLUMES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const BOOK_PAGES = 410;
/**
 * Puissances de dix de `step` en `step` (exposants), de 10^from à 10^to : écrites « 1e24 » plutôt que calculées
 * (10 ** 23 n'est pas tout à fait 1e23), pour des paliers ronds.
 */
const powers = (step: number, from: number, to: number): number[] =>
  Array.from({ length: (to - from) / step + 1 }, (_, index) => Number(`1e${from + index * step}`));
/** Pages par seconde : 1, 10… 10⁸, puis 10¹⁰, 10¹²… 10³⁰. */
const SPEED_STEPS = [...powers(1, 0, 8), ...powers(2, 10, 30)];

export const SEALS: readonly SealDef[] = [
  // Pages lues et pages en réserve, prolongées le 08/10 (revue des sceaux) : jusqu'à 10³⁰ comme la vitesse, et 10³⁶
  // comme le prix des dernières méthodes.
  ...series('pagesRead', 'pages', (s) => s.totalPagesRead, [1, 100, 10 * K, M, G, K * G, ...powers(3, 15, 30)]),
  ...series('clicks', 'pages', (s) => s.stats.clicks, [100, K, 10 * K, 100 * K]),
  ...series('stock', 'pages', (s) => s.pages, [K, M, G, ...powers(3, 12, 36)]),
  // Pages lues depuis toujours, que le prestige ne reprend pas (idée de l'auteur, 05/10), une phrase par palier :
  // par les méthodes, de mille en mille jusqu'à 10³⁰ ; à la main, de dix en dix jusqu'à 10⁵, puis de mille en mille
  // jusqu'à 10³⁰ (08/10 : un clic rapporte aussi une part de la production).
  ...[
    ...series('pagesByMethods', 'pages', (s) => s.pagesByMethods, powers(3, 0, 30)),
    ...series('pagesByHand', 'pages', (s) => s.pagesByHand, [...powers(1, 0, 5), ...powers(3, 6, 30)]),
  ].map((seal): SealDef => ({ ...seal, phrases: true })),
  // La meilleure vitesse de la vie (idée de l'auteur, 05/10) : de dix en dix jusqu'à 10⁸, puis de cent en cent jusqu'à 10³⁰.
  ...series('speed', 'pages', (s) => s.stats.bestPagesPerSecond, SPEED_STEPS),

  ...series('booksFinished', 'books', (s) => s.booksFinished, [1, 10, 100, K, 10 * K, 50 * K]),
  ...series('meaningfulCovers', 'books', meaningfulCovers, [1, 10, 100]),
  // La découverte du livre étrange (pas un secret : il arrive à son numéro de livre).
  seal('strangeBook', 'books', (s) => s.booksFinished >= STRANGE_BOOK_INDEX),
  // Le Grand Livre lu en entier : toutes ses parties déchiffrées, chapitre Éther compris.
  seal('strangeBookRead', 'books', fullyDeciphered),

  ...series('fragments', 'fragments', (s) => s.stats.fragments, [1, 10, 100, K]),
  // Une famille d'anomalies complète (data/anomalies.ts).
  ...ANOMALY_FAMILIES.map((family) =>
    seal(`anomalies-${family}`, 'fragments', (s) =>
      ANOMALIES.filter((anomaly) => anomaly.family === family).every((anomaly) => isComplete(s, anomaly.id)),
    ),
  ),
  // Le livre blanc : une première phrase entière, puis toutes à la fois (les phrases des méthodes s'oublient au prestige).
  seal('firstSentence', 'fragments', (s) => SENTENCES.some((sentence) => isComplete(s, sentence.id))),
  seal('whiteBookFull', 'fragments', (s) => SENTENCES.every((sentence) => isComplete(s, sentence.id))),

  ...series('playTime', 'time', (s) => s.stats.playSeconds / HOUR, [1, 10, 100, K]),
  ...series('daysSinceArrival', 'time', daysSinceArrival, [7, 30, 365]),
  // Une absence d'au moins huit heures (core/absence.ts).
  event('fullNight', 'time'),

  // Exemplaires possédés dans une même partie (le prestige les remet à zéro), les mêmes paliers pour chaque méthode
  // (décision de l'auteur, 05/10) : 25, le moment où elle ouvre la suivante ; 500 coûte de 10³² pages (Diagonale)
  // à 10³⁹ (Échelle) : fait pour la très longue partie, comme les derniers succès de Cookie Clicker.
  ...TOOLS.flatMap((tool) =>
    [
      ...series(tool.id, 'methods', (s) => s.tools[tool.id], [1, 25, 50, 100, 150, 500]),
      // Pages qu'elle a lues depuis le début de la partie : son prix de base × 10, 10³, 10⁵, 10⁷, 10⁹, 10¹² (05/10).
      ...series(
        `${tool.id}Pages`,
        'methods',
        (s) => s.methodPages[tool.id] ?? 0,
        METHOD_PAGES_STEPS.map((step) => tool.baseCost * step),
      ),
    ].map((seal) => ({ ...seal, method: tool.id })),
  ),
  // Méthodes achetées dans la partie (toutes possédées : on ne revend pas), par volumes de 410 (les pages d'un livre
  // de Babel), jusqu'à neuf : 3 690 à la fois, pour la très longue partie (05/10).
  ...series(
    'methodsBought',
    'methods',
    (s) => TOOLS.reduce((sum, tool) => sum + s.tools[tool.id], 0),
    VOLUMES.map((volume) => volume * BOOK_PAGES),
  ).map((seal): SealDef => ({ ...seal, method: 'all' })),

  ...TECHNOLOGIES.map(intuitionSeal),
  ...series('knowledgeFound', 'intuitions', (s) => s.lifetimeKnowledge, [1, 100, 10 * K, M]),

  // L'Etherium (revue des sceaux, 08/10) : prestiges, Éther reçu, étoiles, chaque constellation entière, les Âges.
  ...series('prestiges', 'etherium', (s) => s.exiles, [1, 5, 10, 25, 100]),
  ...series('etherReceived', 'etherium', (s) => s.etherReceived, [1, 10, 100, K, 10 * K, 100 * K, M]),
  ...series('starsLit', 'etherium', (s) => s.etherium.length, [1, 10, 25, STARS.length]),
  ...ETHERIUM_PAGES.map((page) =>
    seal(`constellation-${page}`, 'etherium', (s) =>
      STARS.filter((star) => star.page === page).every((star) => s.etherium.includes(star.id)),
    ),
  ),
  seal('automaticAge', 'etherium', (s) => s.etherium.includes(AUTOMATIC_AGE)),

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
  // Vingt pages du Catalogue des catalogues lues dans la bibliothèque, à la recherche d'un cadeau de Noël
  // (systems/catalogue.ts).
  secret('trueCatalogue'),
  // Une page numérotée 410 dans le Livre de sable, lu dans la bibliothèque (ui/rareBooks/sand/sand.ts).
  secret('sandLastPage'),
  // Le seul y du grand livre du X, page 205, lu dans la bibliothèque (ui/rareBooks/bigX/bigX.ts).
  secret('foundTypo'),
  // Les deux collègues, AlexH et Oriana, trouvés tous les deux (ils travaillent ensemble, jusque dans leurs livres).
  seal('colleagues', 'secrets', (s) => 'alexH' in s.rareBooks && 'oriana' in s.rareBooks),
  // L'Etherium refermé sans y allumer une étoile (systems/prestige.ts, closeEtherium).
  secret('emptyEtherium'),
  // Toute une partie, d'un réveil au prestige suivant, sans tourner une page à la main (systems/prestige.ts).
  secret('noHands'),
  // 410 dans le nombre des pages en réserve (1 410 523…), compteur au repos : rien ne lit (demande de l'auteur, 08/10).
  seal('exactly410', 'secrets', (s) => pagesPerSecond(s) === 0 && wholeDigits(s.pages).includes(String(BOOK_PAGES))),
];
