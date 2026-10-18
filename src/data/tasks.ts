/**
 * Les tâches (l'auteur, 17/10/2026 ; .ai/plan-taches.md, simulateur/taches.ts) : celles du jour, tirées chaque jour, et
 * celles qui ne se font qu'une fois. Leurs chiffres sont ceux validés après la simulation du 17/10.
 */

/** Les tâches du jour, sans étoile ; la branche « le nombre » en ajoute une, puis deux. */
export const DAILY_TASKS = 3;

/** Minutes de la partie que demande une tâche du jour, par jeton qu'elle vaut. */
export const MINUTES_PER_TOKEN = 20;

/** Ce que vaut une tâche du jour (1, 2 ou 3 jetons) : ses chances, selon le niveau de la branche « le gain ». */
export const GAIN_ODDS: readonly (readonly number[])[] = [[1], [0.6, 0.4], [0.45, 0.35, 0.2]];

/** Après un prestige, les tâches qui suivent le rythme de la partie se recalculent après tant de secondes. */
export const RECALC_AFTER_WAKE = 5 * 60;

/**
 * Les modèles des tâches du jour (validés par l'auteur le 17/10) : ce qu'elles comptent. Celles « au rythme » se calent sur
 * ce que fait la partie en ce moment (MINUTES_PER_TOKEN par jeton) ; les autres ont un nombre fixe par jeton.
 */
export const DAILY_KINDS = ['pages', 'clicks', 'finds', 'knowledge', 'books', 'mimic'] as const;
export type DailyKind = (typeof DAILY_KINDS)[number];

/** Feuilles tournées à la main qu'il faut, par jeton. */
export const CLICKS_PER_TOKEN = 600;

/** Une récompense de tâche « une seule fois » (heures de lecture ou de Connaissance au rythme du moment). */
export interface TaskReward {
  tokens?: number;
  readingHours?: number;
  knowledgeHours?: number;
  /** Bonus pour toujours (gardés au prestige) : part de lecture, part de Connaissance en plus. */
  readingBonus?: number;
  knowledgeBonus?: number;
  /** La relique du Crayon. */
  crayon?: true;
  /** Le tome suivant de « L'histoire de Babel » (« Une dernière pour la route ») ; la liste ne le dit pas : « ? ». */
  tome?: true;
}

/** Les étoiles de la branche « le nombre » (une tâche du jour de plus chacune) et de la branche « le gain » (son niveau). */
export const COUNT_STARS = ['tasks.n4', 'tasks.n5'] as const;
export const GAIN_STARS = ['tasks.g2', 'tasks.g3'] as const;

/** La branche « une seule fois » de la page « Les Tâches » : l'étoile qui fait apparaître chaque groupe de tâches. */
export const TASK_STAR = { north: 'explore.n', once1: 'tasks.p1', once2: 'tasks.p2', last: 'tasks.p3' } as const;

export interface OnceTaskDef {
  /** Son numéro dans la liste validée (1 à 20) : ses textes, tasks.once.<n>. */
  n: number;
  /** L'étoile qui la fait apparaître. */
  star: string;
  goal: number;
  reward: TaskReward;
}

/** Les vingt tâches « une seule fois » (liste validée le 17/10) : ce qu'elles comptent est dans systems/onceTasks.ts. */
export const ONCE_TASKS: readonly OnceTaskDef[] = [
  { n: 1, star: TASK_STAR.north, goal: 10_000, reward: { readingHours: 12 } },
  { n: 2, star: TASK_STAR.north, goal: 10_000, reward: { tokens: 10 } },
  { n: 3, star: TASK_STAR.north, goal: 10, reward: { knowledgeHours: 24 } },
  { n: 4, star: TASK_STAR.north, goal: 100, reward: { tokens: 15 } },
  { n: 5, star: TASK_STAR.north, goal: 10, reward: { readingHours: 24 } },
  { n: 6, star: TASK_STAR.north, goal: 100, reward: { tokens: 20 } },
  { n: 7, star: TASK_STAR.north, goal: 500, reward: { readingBonus: 0.05 } },
  { n: 8, star: TASK_STAR.north, goal: 3600, reward: { readingHours: 12 } },
  { n: 9, star: TASK_STAR.north, goal: 24 * 3600, reward: { tokens: 15 } },
  { n: 10, star: TASK_STAR.north, goal: 10, reward: { tokens: 25 } },
  { n: 11, star: TASK_STAR.north, goal: 3, reward: { knowledgeHours: 48 } },
  { n: 12, star: TASK_STAR.north, goal: 50, reward: { knowledgeBonus: 0.05 } },
  // « Finis tous les livres qui se jouent » : le lapin, les dark patterns, le livre-jeu, le coloriage.
  { n: 13, star: TASK_STAR.once1, goal: 4, reward: { readingHours: 48 } },
  // « Colorie les neuf dessins du cahier » (l'auteur, 17/10 : au lieu de « 10 pages », le cahier n'en a que neuf).
  { n: 14, star: TASK_STAR.once1, goal: 9, reward: { knowledgeHours: 24 } },
  { n: 15, star: TASK_STAR.once1, goal: 30, reward: { crayon: true } },
  { n: 16, star: TASK_STAR.once1, goal: 100_000, reward: { tokens: 30 } },
  { n: 17, star: TASK_STAR.once2, goal: 10_000, reward: { readingHours: 72 } },
  { n: 18, star: TASK_STAR.once2, goal: 3, reward: { tokens: 40 } },
  { n: 19, star: TASK_STAR.once2, goal: 1, reward: { readingBonus: 0.1 } },
  { n: 20, star: TASK_STAR.once2, goal: 10, reward: { tokens: 50 } },
  // « Une dernière pour la route » (l'auteur, 18/10) : ses trois buts (LAST_TASK) ; son compte, ceux qui sont atteints.
  { n: 21, star: TASK_STAR.last, goal: 3, reward: { tome: true } },
];

/**
 * Les trois buts de « Une dernière pour la route », comptés depuis son apparition, à travers les prestiges (validés par
 * l'auteur le 18/10, d'après la simulation du 17/10 : milieu de partie, fin de l'Âge Numérique) : l'Éther versé dans
 * l'Etherium, les pages lues, la Connaissance trouvée.
 */
export const LAST_TASK = { ether: 15_000, pages: 5e21, knowledge: 400e6 } as const;
