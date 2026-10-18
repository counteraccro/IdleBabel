import type { Notation } from './format';
import type { TechnologyId } from '../data/technologies';
import { TOOLS, type BuyLot, type ToolId } from '../data/tools';
import type { HistoryEntry } from './history';
import type { Locale } from '../i18n';
import { noFinds, type FindCounts } from './countedFinds';
import type { PartId } from '../data/decipher';
import { newGameSeed } from './random';
import type { SceneId } from '../scene/scenes';
import type { RelicId } from '../data/relics';
import { RECALC_AFTER_WAKE, type DailyKind } from '../data/tasks';
import type { LotteryBoonId, LotteryCurseId, LotteryEffectId, OutcomeId } from '../data/lottery';

export const SAVE_VERSION = 1;

/** Réglages du joueur : conservés quand on efface la sauvegarde. */
export interface Settings {
  /** La production fait tourner les pages du livre toute seule. */
  autoTurn: boolean;
  /** Le livre bouge doucement, tenu à bout de bras. */
  bookSway: boolean;
  /** Images par seconde affichées discrètement en bas à gauche. */
  showFps: boolean;
  /** Pas d'effet de flou (chiffres du livre étrange qui se réécrivent). */
  reduceBlur: boolean;
  /** Flèches ‹ › sous les livres pour tourner les pages (sinon : clic sur la page, touches ← →). */
  pageArrows: boolean;
  /** Façon d'écrire les grands nombres (core/format.ts). */
  notation: Notation;
  /** Combien de méthodes un clic achète (choisi sous la ruche). */
  buyLot: BuyLot;
  /** Le fond gardé quel que soit l'Âge (cahier, page du décor), ou null : le fond suit l'Âge. */
  scene: SceneId | null;
}

/** Chiffres de la partie, relevés en silence : le joueur ne les découvre que plus tard. */
export interface Stats {
  /** Pages feuilletées à la main. */
  clicks: number;
  /** Temps passé le jeu ouvert, en secondes (les mises en veille ne comptent pas). */
  playSeconds: number;
  /** Meilleure production atteinte, en pages par seconde. */
  bestPagesPerSecond: number;
  /** Trouvailles (mots, morceaux de phrase, phrases) apparues dans les pages. */
  fragments: number;
}

/** La Mimic : sa présence se sauvegarde (elle ne part jamais d'elle-même), et ses comptes, pour toujours. */
export interface MimicState {
  /** Quand elle est apparue (ms) ; null : aucune Mimic. */
  at: number | null;
  /** Sa place : « salle:numéro » (data/mimic.ts), ou null tant qu'elle n'en a pas (ou au bord de l'écran). */
  spot: string | null;
  /** Le numéro de sa reliure (un livre ordinaire). */
  book: number;
  /** Les connaissances qu'elle a avalées. */
  eaten: number;
  /** Mimics attrapées, depuis toujours. */
  caught: number;
  /** Connaissances rendues en plus (le bonus seul), depuis toujours. */
  bonus: number;
  /** Secondes passées à manger, celles des Mimics attrapées (absences comprises). */
  seconds: number;
}

/** Les reliques (systems/relics.ts) : gardées pour toujours, prestige compris. */
export interface RelicsState {
  /** Les reliques trouvées, et quand (ms). */
  found: Partial<Record<RelicId, number>>;
  /** Celle qui agit (une seule à la fois) ; null : aucune. */
  active: RelicId | null;
  /** Plus de changement avant ce moment (ms, temps réel : les absences comptent). */
  lockedUntil: number;
  /** Changements de relique, depuis toujours (ses sceaux). */
  changes: number;
}

/** Un bonus ou un malus de la Loterie en cours (data/lottery.ts) : temps réel, les absences comptent. */
export interface LotteryEffect {
  id: LotteryEffectId;
  /** Heure de fin (ms). */
  end: number;
  /** Sa durée entière (ms), ajouts compris : le cercle du médaillon. */
  total: number;
  /** La méthode visée (le ×10, la méthode arrêtée). */
  method?: ToolId;
}

/** La Mimic dorée de la Loterie (un malus) : elle mange tout ce qui est gagné, puis s'en va sans rien rendre. */
export interface GoldenMimic {
  /** Elle s'en va à ce moment (ms). */
  until: number;
  /** Sa durée entière (ms), ajouts compris : le cercle du médaillon (absente des sauvegardes d'avant le 16/10). */
  total?: number;
  /** Sa reliure (un livre ordinaire, doré). */
  book: number;
  /** Sa place (« salle:numéro »), comme la Mimic. */
  spot: string | null;
  /** Ce qu'elle a mangé. */
  pages: number;
  knowledge: number;
  /** Les coups reçus (on ne peut pas la tuer). */
  strikes: number;
}

/**
 * Un tirage dont les rouleaux tournent encore (systems/lottery.ts) : le jeton est parti, le résultat est choisi ; il
 * compte à l'arrêt des rouleaux, même si on a quitté la bibliothèque ou le jeu entre-temps.
 */
export interface PendingDraw {
  /** Le levier a été tiré à ce moment (ms). */
  at: number;
  outcome: OutcomeId;
  reels: [number, number, number];
  boon?: LotteryBoonId;
  curse?: LotteryCurseId;
  method?: ToolId;
}

/** La Loterie (systems/lottery.ts) : gardée au prestige ; les jetons ne s'achètent jamais. */
export interface LotteryState {
  tokens: number;
  effects: LotteryEffect[];
  golden: GoldenMimic | null;
  /** Tirages, depuis toujours. */
  draws: number;
  /** Le tirage en cours (absent des sauvegardes d'avant le 16/10). */
  pending?: PendingDraw | null;
}

/** Une tâche du jour (systems/dailyTasks.ts) : ce qu'elle compte, d'où, jusqu'où. */
export interface DailyTask {
  kind: DailyKind;
  /** Ce qu'elle vaut : 1, 2 ou 3 jetons. */
  value: number;
  /** Ce qu'il faut compter ; 0 : pas encore calculé (une tâche au rythme de la partie, juste après un prestige). */
  goal: number;
  /** Ce que valait son compte quand elle a commencé (ou quand son but a été recalculé). */
  base: number;
  /** La part déjà faite quand son but attend d'être recalculé (après un prestige). */
  carry?: number;
  /** Faite à ce moment (ms) ; son jeton attend le clic (`taken`). */
  done?: number;
  taken?: boolean;
}

/** Une tâche « une seule fois » apparue (systems/onceTasks.ts) : son compte part de là. */
export interface OnceTask {
  /** Apparue (écrite en clair) à ce moment (ms). */
  at: number;
  /** Ce que valait son compte alors. */
  base: number;
  /** Les phrases complétées depuis (tâche 3), celles qui l'étaient déjà ; la partie et ses livres (tâche 17). */
  ids?: string[];
  skip?: string[];
  wakeBook?: number;
  done?: number;
  /** Sa récompense prise (au clic). */
  taken?: boolean;
}

/** Les tâches (systems/tasks.ts), gardées au prestige. */
export interface TasksState {
  /** Le jour des tâches du jour (date locale « AAAA-MM-JJ ») ; null : jamais tirées. */
  day: string | null;
  today: DailyTask[];
  /** Tâches du jour faites, depuis toujours. */
  dailyDone: number;
  /** Les tâches « une seule fois » apparues, par numéro. */
  once: Record<string, OnceTask>;
  /** Bonus pour toujours gagnés : part de lecture, part de Connaissance en plus. */
  bonus: { reading: number; knowledge: number };
  /** Secondes de la partie depuis le dernier réveil (les tâches au rythme de la partie s'y recalculent). */
  sinceWake: number;
  /** Ce que suivent les tâches « une seule fois » (comptés depuis leur apparition). */
  counters: TaskCounters;
  /** Les tâches des mods faites (src/mods/modTasks.ts), par « mod:<mod>:<id> » ; effacées si le mod est supprimé. */
  mods: Record<string, { done: number; taken?: boolean }>;
}

export interface TaskCounters {
  /** Livres finis à la dernière page tournée à la main, et les feuilles tournées à la main alors (tâche 1). */
  noHandFrom: number;
  clicks: number;
  /** Secondes à l'écran sans rien toucher (tâche 8), plus longue absence (tâche 9), gains de suite sans malus (tâche 20). */
  untouched: number;
  longestAway: number;
  streak: number;
  /** Exemplaires achetés de chaque méthode (tâche 7), et ce qu'on en avait au dernier regard. */
  bought: Partial<Record<ToolId, number>>;
  owned: Partial<Record<ToolId, number>>;
}

export const noTasks = (): TasksState => ({
  day: null,
  today: [],
  dailyDone: 0,
  once: {},
  bonus: { reading: 0, knowledge: 0 },
  // Une partie qui n'a pas encore fait de prestige depuis les tâches : son rythme est déjà là.
  sinceWake: RECALC_AFTER_WAKE,
  counters: { noHandFrom: 0, clicks: 0, untouched: 0, longestAway: 0, streak: 0, bought: {}, owned: {} },
  mods: {},
});

export const NO_LOTTERY: LotteryState = { tokens: 0, effects: [], golden: null, draws: 0, pending: null };

export const NO_RELICS: RelicsState = { found: {}, active: null, lockedUntil: 0, changes: 0 };

export const NO_MIMIC: MimicState = { at: null, spot: null, book: 0, eaten: 0, caught: 0, bonus: 0, seconds: 0 };

export const DEFAULT_STATS: Stats = { clicks: 0, playSeconds: 0, bestPagesPerSecond: 0, fragments: 0 };

export const DEFAULT_SETTINGS: Settings = {
  autoTurn: true,
  bookSway: true,
  showFps: false,
  reduceBlur: false,
  pageArrows: false,
  notation: 'full',
  buyLot: 1,
  scene: null,
};

export interface GameState {
  version: number;
  /** Pages disponibles, que l'on dépense. */
  pages: number;
  /** Pages lues depuis le tout début : ne baisse jamais, ni en dépensant ni au prestige (l'Éther en vient). */
  totalPagesRead: number;
  tools: Record<ToolId, number>;
  /** Pages lues par chaque méthode depuis le dernier réveil (ses sceaux) ; le prestige les remet à zéro. */
  methodPages: Partial<Record<ToolId, number>>;
  /** Pages lues par les méthodes depuis toujours (production et absence) : le prestige ne les reprend pas. */
  pagesByMethods: number;
  /** Pages lues à la main (clics) depuis toujours : le prestige ne les reprend pas. */
  pagesByHand: number;
  /** Pages lues à l'écran dans le livre en main (0 à 408, deux par feuille tournée). */
  bookPage: number;
  /** Livres lus jusqu'au bout. */
  booksFinished: number;
  locale: Locale;
  /** Nom du joueur, demandé à l'arrivée (welcome.ts) : sur l'étiquette du cahier, et plus tard dans les textes. */
  playerName: string;
  settings: Settings;
  stats: Stats;
  /** Connaissance à dépenser : chaque trouvaille en rapporte un point. */
  knowledge: number;
  /** Connaissance trouvée pendant ce cycle (seuil d'Exil) : ne baisse pas en dépensant. */
  cycleKnowledge: number;
  /** Connaissance trouvée depuis le début de la partie : ne baisse jamais, ni à l'Exil. */
  lifetimeKnowledge: number;
  /** Mots, morceaux de phrase et phrases trouvés, dans l'ordre. */
  findCounts: FindCounts;
  /** Livre blanc : morceaux écrits de chaque phrase (data/sentences.ts), gardés pour toujours. */
  written: Record<string, number[]>;
  /**
   * Parties du Grand Livre lisibles d'office : payées du temps où elles s'achetaient (gardées pour toujours),
   * ou toutes, au débogage.
   */
  deciphered: PartId[];
  /** Parties du Grand Livre déjà vues en clair : une partie lisible qui n'y est pas porte une étoile. */
  partsRead: PartId[];
  /** Sceaux obtenus (voir data/seals.ts), avec leur date. */
  seals: Record<string, number>;
  /**
   * Livres rares trouvés (data/rareBooks.ts) et le numéro du livre où chacun l'a été. Uniques : jamais
   * retrouvés, et gardés à l'Exil (la bibliothèque personnelle n'est jamais remise à zéro).
   */
  rareBooks: Record<string, number>;
  /**
   * Pages du Catalogue des catalogues lues dans la bibliothèque (systems/catalogue.ts) : à vingt, un sceau secret.
   */
  catalogueRead: number[];
  /** Pièges des « Dark patterns par l'exemple » déjoués (systems/darkPatterns.ts) : les cinq, un sceau secret. */
  darkPatternsFoiled: number[];
  /** Prises du Lapin blanc dans « Le Lapin de garenne » (systems/rabbit.ts) : à trois, il rentre (un sceau secret). */
  rabbitCaught: number;
  /**
   * Les couleurs de « Colorie la Bibliothèque » (systems/coloring.ts) : pour chaque dessin, la couleur de chaque zone
   * coloriée. Gardées au prestige.
   */
  coloring: Record<string, Record<string, string>>;
  /** La Mimic (systems/mimic.ts) : celle qui est là, et ce qu'en comptent les sceaux. */
  mimic: MimicState;
  /** Les reliques (systems/relics.ts) : trouvées, celle qui agit, le délai avant d'en changer. */
  relics: RelicsState;
  /** La Loterie : jetons, bonus et malus en cours, la Mimic dorée. */
  lottery: LotteryState;
  /** Les tâches : celles du jour, celles « une seule fois », leurs bonus pour toujours. */
  tasks: TasksState;
  /**
   * Les tomes 2 à 11 de « L'histoire de Babel » trouvés (leur numéro), gardés au prestige. Le tome 1 s'achète dans
   * l'Etherium (S.trueStory). Aucun ne se trouve encore en jouant : seulement par le débogage (« Tout débloquer »).
   */
  sagaTomes: number[];
  /** Sceaux obtenus que le joueur n'a pas encore vus dans le livre étrange. */
  newSeals: string[];
  /** Livres de la bibliothèque que le joueur y a déjà vus (systems/library.ts) : au-delà, la clé brille. */
  libraryBooksSeen: number;
  history: HistoryEntry[];
  /** Moments de lore (data/lore.ts) déclenchés mais pas encore lus : montrés dès que possible, même après un rechargement. */
  lorePending: string[];
  /** Moments de lore déjà lus : chacun ne se raconte qu'une fois. */
  loreSeen: string[];
  /** Intuitions comprises (data/technologies.ts), achetées en Connaissance : leur niveau. */
  technologies: Partial<Record<TechnologyId, number>>;
  /** Le niveau le plus haut atteint par chaque intuition, tous cycles confondus : la Réminiscence y remonte. */
  technologiesBest: Partial<Record<TechnologyId, number>>;
  /**
   * Réminiscence (systems/reminiscence.ts ; une intuition permanente) : `on`, laissée faire (note au crayon
   * de la partie « Intuitions »).
   */
  reminiscence: { on: boolean };
  /** Prestiges faits (le premier fait apparaître la Réminiscence ; systems/prestige.ts). */
  exiles: number;
  /** Éther à dépenser dans l'Etherium (data/etherium.ts) : reçu au prestige, gardé s'il n'est pas dépensé. */
  ether: number;
  /** Éther reçu depuis toujours : le prochain prestige rapporte ce que méritent les pages à vie, moins ceci. */
  etherReceived: number;
  /** Étoiles allumées dans l'Etherium (data/etheriumStars.ts), pour toujours : « page.étoile ». */
  etherium: string[];
  /** Au réveil d'un prestige, l'Etherium est en main ; refermé, il disparaît (jusqu'au prochain). */
  etheriumInHand: boolean;
  /**
   * Lettres attrapées depuis toujours (systems/letter.ts) : le prestige ne les reprend pas. Dès la première, les
   * intuitions de la lettre se voient dans le livre blanc.
   */
  letters: number;
  /** Visions de sceau cliquables qui ont dit qu'on peut les toucher (ui/sealVision.ts) : trois, ou une fois cliquée. */
  visionHints: number;
  /**
   * Le dernier réveil (systems/prestige.ts) : les pages lues à vie à ce moment (la partie d'après se compte de là,
   * pour la Porte), et le numéro du premier livre pris ensuite (la Poignée) ; -1 : jamais réveillé.
   */
  wake: { pages: number; book: number; clicks: number; stars: number };
  lastTick: number;
  /**
   * Les mods (src/mods) chargés à chaque visite, dans l'ordre : leur adresse, ou leur chemin dans le jeu pour ceux de
   * la liste (public/mods/mods.json). Effacer la sauvegarde les supprime tous (seuls les réglages restent).
   */
  mods: string[];
  /** Les mods de `mods` désactivés (case décochée au cahier) : gardés dans la liste, mais plus chargés. */
  modsOff: string[];
  /**
   * Le nom que s'est donné chaque mod de `mods` (registerMod), par son adresse : de quoi effacer ses données quand il est
   * supprimé, même s'il n'a pas été chargé à cette visite.
   */
  modNames: Record<string, string>;
  /** Ce que chaque mod a rendu à la dernière sauvegarde (son `save()`), par son nom : rendu à son `load()`. */
  modData: Record<string, string>;
  /** Les options de chaque mod réglées au cahier (registerMod `options`), par son nom : gardées comme les réglages. */
  modOptions: Record<string, Record<string, string | boolean>>;
  /** Quand le premier mod a été chargé (ms) ; null : jamais. Pour toujours, même s'il est retiré (le sceau « Triche »). */
  modded: number | null;
  /**
   * La graine de la partie (core/random.ts, gameRandom) : les couvertures, le texte des pages, les livres rares
   * et les trouvailles en sont tirés. Cachée : seul le cahier d'options l'écrit, pour la donner (débogage).
   * 0 : une partie d'avant les graines (la Bibliothèque de toujours).
   */
  seed: number;
}

export const createInitialState = (locale: Locale, now = Date.now(), seed = newGameSeed()): GameState => ({
  version: SAVE_VERSION,
  pages: 0,
  totalPagesRead: 0,
  tools: Object.fromEntries(TOOLS.map((tool) => [tool.id, 0])) as Record<ToolId, number>,
  methodPages: {},
  pagesByMethods: 0,
  pagesByHand: 0,
  bookPage: 0,
  booksFinished: 0,
  locale,
  playerName: '',
  settings: { ...DEFAULT_SETTINGS },
  stats: { ...DEFAULT_STATS },
  knowledge: 0,
  cycleKnowledge: 0,
  lifetimeKnowledge: 0,
  findCounts: noFinds(),
  written: {},
  deciphered: [],
  partsRead: [],
  seals: {},
  rareBooks: {},
  catalogueRead: [],
  darkPatternsFoiled: [],
  rabbitCaught: 0,
  coloring: {},
  mimic: { ...NO_MIMIC },
  relics: { ...NO_RELICS, found: {} },
  lottery: { ...NO_LOTTERY, effects: [] },
  tasks: noTasks(),
  sagaTomes: [],
  newSeals: [],
  libraryBooksSeen: 0,
  history: [{ type: 'gameStarted', at: now }],
  lorePending: [],
  loreSeen: [],
  technologies: {},
  technologiesBest: {},
  reminiscence: { on: true },
  exiles: 0,
  ether: 0,
  etherReceived: 0,
  etherium: [],
  etheriumInHand: false,
  letters: 0,
  visionHints: 0,
  wake: { pages: 0, book: -1, clicks: 0, stars: 0 },
  lastTick: now,
  mods: [],
  modsOff: [],
  modNames: {},
  modData: {},
  modOptions: {},
  modded: null,
  seed,
});
