import type { OnceTask } from '../core/state';

/**
 * Les tâches (l'auteur, 17/10/2026 ; .ai/plan-taches.md, simulateur/taches.ts) : celles du jour, tirées chaque jour, et
 * celles qui ne se font qu'une fois. Leurs chiffres sont ceux validés après la simulation du 17/10.
 */

/** Le même but à chaque niveau (les compteurs lents). */
const same = (goal: number) => (): number => goal;

/** Les livres lus (validés le 30/10) : 4 104, 41 041, puis 41 041 de plus à chaque niveau (82 082, 123 123…). */
const books = (level: number): number => (level === 1 ? 4_104 : 41_041 * (level - 1));

/**
 * La Connaissance (validée le 30/10) : « 410 410 410… » coupé à 3, 6, 9 chiffres (×1 000 par niveau), puis un chiffre de
 * plus à chaque niveau (×10) : 410 · 410 410 · 410 410 410 · 4 104 104 104 · 41 041 041 041…
 */
const knowledge = (level: number): number => Number('410'.repeat(level + 4).slice(0, level <= 3 ? 3 * level : level + 6));

/** Les tâches du jour, sans étoile ; la branche « le nombre » en ajoute une, puis deux. */
export const DAILY_TASKS = 3;

/** Minutes de la partie que demande une tâche du jour, par tampon qu'elle vaut. */
export const MINUTES_PER_TOKEN = 20;

/** Ce que vaut une tâche du jour (1, 2 ou 3 tampons) : ses chances, selon le niveau de la branche « le gain ». */
export const GAIN_ODDS: readonly (readonly number[])[] = [[1], [0.6, 0.4], [0.45, 0.35, 0.2]];

/** Après un prestige, les tâches qui suivent le rythme de la partie se recalculent après tant de secondes. */
export const RECALC_AFTER_WAKE = 5 * 60;

/**
 * Les modèles des tâches du jour (validés par l'auteur le 17/10) : ce qu'elles comptent. Celles « au rythme » se calent sur
 * ce que fait la partie en ce moment (MINUTES_PER_TOKEN par jeton) ; les autres ont un nombre fixe par jeton.
 */
export const DAILY_KINDS = ['pages', 'clicks', 'finds', 'knowledge', 'books', 'mimic', 'grids'] as const;
export type DailyKind = (typeof DAILY_KINDS)[number];

/** Feuilles tournées à la main qu'il faut, par jeton. */
export const CLICKS_PER_TOKEN = 600;

/**
 * Grilles du livre de jeux à résoudre, par jeton (« Résoudre une grille », validée par l'auteur le 20/10 : 1, 2 ou 3
 * grilles selon les jetons) ; tirée seulement quand le livre est trouvé.
 */
export const GRIDS_PER_TOKEN = 1;

/**
 * Ce que rapporte une tâche « une seule fois », en plus de ses tampons (l'auteur, 22/10 : plus de jetons ; 29/10 : plus
 * d'heures de lecture ni de Connaissance, des tampons). Les bonus pour toujours restent, au niveau I seulement.
 */
export interface TaskReward {
  /** Bonus pour toujours (gardés au prestige) : part de lecture, part de Connaissance en plus. */
  readingBonus?: number;
  knowledgeBonus?: number;
  /** La relique du Crayon. */
  crayon?: true;
  /** Le tome suivant de « L'histoire de Babel » (« Une dernière pour la route ») ; la liste ne le dit pas : « ? ». */
  tome?: true;
}

/**
 * Les tampons d'une tâche (validés le 30/10, .ai/plan-taches.md, « Le guichet et les tampons ») : une tâche du jour en
 * vaut autant que son tirage (1, 2 ou 3) ; le niveau n d'une échelle, 5 × n ; une tâche unique, 15.
 */
export const LEVEL_STAMPS = 5;
export const UNIQUE_STAMPS = 15;

/** Les étoiles de la branche « le nombre » (une tâche du jour de plus chacune) et de la branche « le gain » (son niveau). */
export const COUNT_STARS = ['tasks.n4', 'tasks.n5'] as const;
export const GAIN_STARS = ['tasks.g2', 'tasks.g3'] as const;

/** La branche « une seule fois » de la page « Les Tâches » : l'étoile qui fait apparaître chaque groupe de tâches. */
export const TASK_STAR = { north: 'explore.n', once1: 'tasks.p1', once2: 'tasks.p2', last: 'tasks.p3' } as const;

export interface OnceTaskDef {
  /** Son numéro dans la liste validée (1 à 22) : ses textes, tasks.onceTasks.<n>. */
  n: number;
  /** L'étoile qui la fait apparaître. */
  star: string;
  goal: number;
  /** Son avancement se compte en minutes ou en heures (son but est en secondes) ; sinon tel quel. */
  unit?: 'minutes' | 'hours';
  /**
   * Une échelle (l'auteur, 29/10 : les tâches par niveaux) : le but de chaque niveau (1, 2…) ; faite, son niveau suivant
   * s'ouvre. Sans : une tâche unique (son but, `goal`).
   */
  levels?: (level: number) => number;
  reward: TaskReward;
}

/**
 * Les tâches « une seule fois » (liste validée le 17/10, échelles le 29/10) : ce qu'elles comptent est dans
 * systems/onceTasks.ts.
 */
export const ONCE_TASKS: readonly OnceTaskDef[] = [
  { n: 1, star: TASK_STAR.north, goal: 10_000, reward: {} },
  { n: 2, star: TASK_STAR.north, goal: 10_000, levels: same(10_000), reward: {} },
  // Les phrases, les livres rares, les étoiles, les figures : des échelles qui finissent (systems/onceTasks.ts, `left`).
  { n: 3, star: TASK_STAR.north, goal: 10, levels: same(10), reward: {} },
  { n: 4, star: TASK_STAR.north, goal: 100, levels: same(100), reward: {} },
  { n: 5, star: TASK_STAR.north, goal: 10, levels: same(10), reward: {} },
  { n: 6, star: TASK_STAR.north, goal: 100, levels: same(100), reward: {} },
  // 410 au lieu de 500 (l'auteur, 29/10).
  { n: 7, star: TASK_STAR.north, goal: 410, reward: { readingBonus: 0.05 } },
  { n: 8, star: TASK_STAR.north, goal: 3600, unit: 'minutes', reward: {} },
  { n: 9, star: TASK_STAR.north, goal: 24 * 3600, unit: 'hours', reward: {} },
  // Nourris-le : 5 par niveau (validé le 30/10 ; 10 était trop lent).
  { n: 10, star: TASK_STAR.north, goal: 5, levels: same(5), reward: {} },
  // Les reliques des salles (ROOM_RELICS) : quatre depuis la Boussole (24/10).
  { n: 11, star: TASK_STAR.north, goal: 4, reward: {} },
  { n: 12, star: TASK_STAR.north, goal: 50, levels: same(50), reward: { knowledgeBonus: 0.05 } },
  // « Finis tous les livres qui se jouent » : le lapin, les dark patterns, le livre-jeu, le coloriage.
  { n: 13, star: TASK_STAR.once1, goal: 4, reward: {} },
  // « Colorie les neuf dessins du cahier » (l'auteur, 17/10 : au lieu de « 10 pages », le cahier n'en a que neuf).
  { n: 14, star: TASK_STAR.once1, goal: 9, reward: {} },
  { n: 15, star: TASK_STAR.once1, goal: 30, levels: same(30), reward: { crayon: true } },
  { n: 16, star: TASK_STAR.once1, goal: books(1), levels: books, reward: {} },
  { n: 17, star: TASK_STAR.once2, goal: 10_000, reward: {} },
  { n: 18, star: TASK_STAR.once2, goal: 3, levels: same(3), reward: {} },
  { n: 19, star: TASK_STAR.once2, goal: 1, reward: { readingBonus: 0.1 } },
  { n: 20, star: TASK_STAR.once2, goal: 10, reward: {} },
  // « Une dernière pour la route » (l'auteur, 18/10) : ses trois buts (LAST_TASK) ; son compte, ceux qui sont atteints.
  { n: 21, star: TASK_STAR.last, goal: 3, reward: { tome: true } },
  // « Trouve N de Connaissance » (l'auteur, 29/10 : nouvelle, une échelle).
  { n: 22, star: TASK_STAR.north, goal: knowledge(1), levels: knowledge, reward: {} },
];

/** Les tampons d'une tâche « une seule fois » faite, à ce niveau (5 × le niveau d'une échelle, 15 pour une unique). */
export const onceStamps = (def: OnceTaskDef, level = 1): number => (def.levels ? LEVEL_STAMPS * level : UNIQUE_STAMPS);

/**
 * Les trois buts de « Une dernière pour la route », comptés depuis son apparition, à travers les prestiges (validés par
 * l'auteur le 18/10, d'après la simulation du 17/10 : milieu de partie, fin de l'Âge Numérique) : l'Éther versé dans
 * l'Etherium, les pages lues, la Connaissance trouvée.
 */
export const LAST_TASK = { ether: 15_000, pages: 5e21, knowledge: 400e6 } as const;

/** Les niveaux faits d'une tâche « une seule fois » (une tâche unique : 0 ou 1). */
export const levelsDone = (task: OnceTask | undefined): number => (task ? (task.level ?? 1) - 1 + (task.done !== undefined ? 1 : 0) : 0);

/**
 * Les tâches de la semaine (validées le 30/10, .ai/plan-taches.md) : deux, tirées le lundi à minuit (heure du joueur) parmi
 * ce que le joueur a rencontré, effacées le dimanche soir ; une troisième avec l'étoile « la semaine » du Cadran solaire.
 * Chacune vaut 10 tampons, et 10 de plus si toutes sont faites.
 */
export const WEEKLY_TASKS = 2;
export const WEEK_STAR = 'tasks.w3';
export const WEEKLY_STAMPS = 10;
export const WEEK_BONUS = 10;

/** Les modèles des tâches de la semaine (l'auteur, 30/10 ; le 11e, les pages à la main, ajouté par lui). */
export const WEEKLY_KINDS = [
  'daily',
  'letters',
  'mimic',
  'grids',
  'coloring',
  'rare',
  'sentence',
  'feed',
  'star',
  'boons',
  'clicks',
] as const;
export type WeeklyKind = (typeof WEEKLY_KINDS)[number];

/** Le but de chaque modèle, tiré dans sa fourchette (les pages à la main par centaines). */
export const WEEKLY_GOALS: Record<WeeklyKind, readonly [number, number]> = {
  daily: [5, 5],
  letters: [20, 40],
  mimic: [10, 20],
  grids: [3, 5],
  coloring: [1, 1],
  rare: [1, 1],
  sentence: [1, 1],
  feed: [1, 2],
  star: [1, 1],
  boons: [3, 3],
  clicks: [1_000, 2_000],
};
