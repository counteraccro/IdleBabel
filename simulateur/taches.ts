import { CLOSED, STARS, neededFor, starById, type PageId, type Star } from '../src/data/etheriumStars';
import { TASK_STAR } from '../src/data/tasks';
import { DIGITAL_AGE } from '../src/data/tools';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { LOTTERY_STARS } from '../src/data/lottery';
import { EFFECT } from '../src/data/etheriumStars';
import { PLAYER } from './config';
import type { Life } from './vie';
import type { Run } from './partie';
import { sealsPerPlate } from './sceaux';

/**
 * Les tâches (17/10, .ai/plan-taches.md), pas encore dans le jeu : leurs étoiles, les tâches du jour et les tâches
 * « une seule fois », avec les chiffres proposés, pour les caler. Hypothèses : les tâches du jour avancent toutes en même
 * temps (lire, tourner, trouver), en temps de jeu à l'écran ; le bot prend chaque jeton aussitôt et le joue ; il garde
 * sa relique (le Crayon n'agit pas).
 */

/**
 * Les étoiles des tâches, celles du jeu (data/etheriumStars.ts) : le Nord de la Rose des vents, puis la page « Les Tâches ».
 * « Une dernière pour la route » (tasks.p3) y est, même fermée en jeu tant que son livre de fin n'est pas écrit.
 */
export const TASK_STARS: readonly Star[] = [starById(TASK_STAR.north)!, ...STARS.filter((star) => star.page === 'tasks')];
export const TASK_STAR_IDS: ReadonlySet<string> = new Set(TASK_STARS.map((star) => star.id));

/** Minutes de jeu à l'écran que demande une tâche du jour, par jeton qu'elle vaut. */
export const MINUTES_PER_TOKEN = 20;
/** Ce que vaut une tâche du jour (1, 2 ou 3 jetons), selon les étoiles du gain. */
const GAIN_ODDS = [[1], [0.6, 0.4], [0.45, 0.35, 0.2]];

/** « Une dernière pour la route » : comptés depuis son apparition, à travers les prestiges. */
export const LAST_TASK = { ether: 15_000, pages: 5e21, knowledge: 4e8 };

type Reward = { tokens?: number; reading?: number; knowledge?: number; readingBonus?: number; knowledgeBonus?: number; crayon?: true };

interface OnceTask {
  n: number;
  label: string;
  /** L'étoile qui la fait apparaître. */
  star: string;
  reward: Reward;
  /**
   * Son compte, qui ne commence qu'à son apparition (l'auteur, 17/10 : « pas avant ») : ce qu'il vaut alors est ôté ; `start`
   * remet à zéro ce qui se compte d'un coup (une série, une absence). Absent : pas suivi par le bot.
   */
  count?: (run: Run) => number;
  start?: (run: Run) => void;
  /** Ce qui était fait avant compte aussi (les reliques : l'auteur, 17/10). */
  before?: true;
  goal: number;
}

const books = (pages: number): number => pages / PAGES_PER_BOOK;
const ALL_PAGES = [...new Set(STARS.map((star) => star.page))];
const fullFigures = (life: Life): number =>
  ALL_PAGES.filter((page: PageId) => {
    const stars = STARS.filter((star) => star.page === page && !CLOSED.has(star.id));
    return stars.length > 0 && stars.every((star) => life.stars.has(star.id));
  }).length;
const fullPlates = (life: Life): number =>
  sealsPerPlate(life.seals)
    .split(', ')
    .filter((plate) => {
      const [got, all] = plate.split(' ')[1].split('/').map(Number);
      return got === all;
    }).length;
/** Exemplaires achetés de chaque méthode depuis l'apparition de la tâche 7 (à travers les prestiges) : le plus haut. */
const boughtSince = (run: Run): number =>
  Math.max(0, ...Object.entries(run.life.tasks.bought).map(([id, n]) => n - (run.life.tasks.boughtBase[id] ?? 0)));
/** Livres lus dans la partie depuis l'apparition de la tâche 17 (dans la partie où elle apparaît, ce qui était lu avant ne compte pas). */
const runBooksSince = (run: Run): number => {
  const base = run.life.tasks.runBase;
  return books(run.turned - (base && base.prestige === run.life.prestiges ? base.turned : 0));
};

export const ONCE_TASKS: readonly OnceTask[] = [
  { n: 1, label: '10 000 livres sans tourner à la main', star: 'explore.n', goal: 10_000, start: (run) => (run.turnedNoHand = 0), count: (run) => books(run.turnedNoHand), reward: { reading: 12 } },
  { n: 2, label: '10 000 pages à la main', star: 'explore.n', goal: 10_000, count: (run) => run.life.clicks, reward: { tokens: 10 } },
  { n: 3, label: '10 phrases du livre blanc', star: 'explore.n', goal: 10, reward: { knowledge: 24 } },
  { n: 4, label: 'Attrape 100 fois la Mimic', star: 'explore.n', goal: 100, count: (run) => run.life.mimic.caught, reward: { tokens: 15 } },
  { n: 5, label: '10 livres rares rangés', star: 'explore.n', goal: 10, reward: { reading: 24 } },
  { n: 6, label: 'Joue 100 jetons', star: 'explore.n', goal: 100, count: (run) => run.life.lottery.draws, reward: { tokens: 20 } },
  { n: 7, label: '500 fois la même méthode', star: 'explore.n', goal: 500, start: (run) => (run.life.tasks.boughtBase = { ...run.life.tasks.bought }), count: boughtSince, reward: { readingBonus: 0.05 } },
  { n: 8, label: '1 h ouvert sans rien toucher', star: 'explore.n', goal: 3600, start: (run) => (run.life.tasks.untouched = 0), count: (run) => run.life.tasks.untouched, reward: { reading: 12 } },
  { n: 9, label: "Reviens après 24 h d'absence", star: 'explore.n', goal: 86400, start: (run) => (run.life.tasks.longestAway = 0), count: (run) => run.life.tasks.longestAway, reward: { tokens: 15 } },
  { n: 10, label: 'Nourris-le 10 fois', star: 'explore.n', goal: 10, count: (run) => run.life.prestiges, reward: { tokens: 25 } },
  { n: 11, label: 'Les trois reliques', star: 'explore.n', goal: 3, before: true, count: (run) => run.life.relics.size + (digitalLit(run.life) ? 1 : 0), reward: { knowledge: 48 } },
  { n: 12, label: '50 étoiles allumées', star: 'explore.n', goal: 50, count: (run) => run.life.stars.size, reward: { knowledgeBonus: 0.05 } },
  { n: 13, label: 'Tous les livres qui se jouent', star: 'tasks.p1', goal: 1, reward: { reading: 48 } },
  { n: 14, label: 'Colorie 10 pages', star: 'tasks.p1', goal: 10, reward: { knowledge: 24 } },
  { n: 15, label: '30 tâches du jour', star: 'tasks.p1', goal: 30, count: (run) => run.life.tasks.dailyDone, reward: { crayon: true } },
  { n: 16, label: '100 000 livres à vie', star: 'tasks.p1', goal: 100_000, count: (run) => books(run.life.turned), reward: { tokens: 30 } },
  { n: 17, label: '10 000 livres en une partie', star: 'tasks.p2', goal: 10_000, start: (run) => (run.life.tasks.runBase = { prestige: run.life.prestiges, turned: run.turned }), count: runBooksSince, reward: { reading: 72 } },
  { n: 18, label: 'Trois figures entières', star: 'tasks.p2', goal: 3, count: (run) => fullFigures(run.life), reward: { tokens: 40 } },
  { n: 19, label: 'Une planche entière de sceaux', star: 'tasks.p2', goal: 1, count: (run) => fullPlates(run.life), reward: { readingBonus: 0.1 } },
  { n: 20, label: '10 gains de suite sans malus', star: 'tasks.p2', goal: 10, start: (run) => (run.life.tasks.winStreak = 0), count: (run) => run.life.tasks.winStreak, reward: { tokens: 50 } },
];

export interface Tasks {
  /** Le jour (minuit, heure du joueur) des tâches en cours ; leurs valeurs ; les secondes à l'écran ce jour-là. */
  day: number;
  today: number[];
  screen: number;
  dailyDone: number;
  /** Jetons rapportés : par les tâches du jour, par les tâches « une seule fois ». */
  dailyTokens: number;
  onceTokens: number;
  /** Quand chaque tâche « une seule fois » est apparue, ce que valait son compte alors, quand elle a été faite. */
  shown: Record<number, { at: number; base: number }>;
  done: Record<number, number>;
  /** Bonus pour toujours. */
  readingBonus: number;
  knowledgeBonus: number;
  crayonAt?: number;
  /** Plus longue absence d'un coup ; gains de suite sans malus à la Loterie. */
  longestAway: number;
  winStreak: number;
  /** Secondes à l'écran sans rien toucher (tâche 8). */
  untouched: number;
  /** Exemplaires achetés de chaque méthode depuis toujours, et quand la tâche 7 est apparue (tâche 7). */
  bought: Record<string, number>;
  boughtBase: Record<string, number>;
  /** La partie et ses pages tournées quand la tâche 17 est apparue. */
  runBase?: { prestige: number; turned: number };
  /** « Une dernière pour la route » : apparue, ce qu'elle a compté, faite. */
  last?: { at: number; ether: number; pages: number; knowledge: number; doneAt?: number };
  /** Quand chaque étoile des tâches a été allumée. */
  boughtAt: Record<string, number>;
}

export const newTasks = (): Tasks => ({
  day: -1,
  today: [],
  screen: 0,
  dailyDone: 0,
  dailyTokens: 0,
  onceTokens: 0,
  shown: {},
  done: {},
  readingBonus: 0,
  knowledgeBonus: 0,
  longestAway: 0,
  winStreak: 0,
  untouched: 0,
  bought: {},
  boughtBase: {},
  boughtAt: {},
});

/** Un hasard qui se répète (même tirage d'une simulation à l'autre). */
let seed = 410;
export const random = (): number => {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
};

const level = (life: Life, prefix: string): number => (life.stars.has(`${prefix}2`) ? 2 : life.stars.has(`${prefix}1`) ? 1 : 0);
const dailyCount = (life: Life): number => 3 + level(life, 'tasks.n');
const drawValue = (life: Life): number => {
  const odds = GAIN_ODDS[level(life, 'tasks.g')];
  let roll = random();
  for (let i = 0; i < odds.length; i++) if ((roll -= odds[i]) < 0) return i + 1;
  return 1;
};

/** Un jeton joué à la Loterie : la série de gains sans malus (tâche 20). */
export const drawn = (life: Life): void => {
  const luck = Math.max(0, ...Object.entries(EFFECT.lotteryLuck).map(([id, v]) => (life.stars.has(id) ? v : 0)));
  const odds = LOTTERY_STARS.luck;
  const roll = random() * 100;
  if (roll < odds.curse[luck]) life.tasks.winStreak = 0;
  else if (roll < odds.curse[luck] + odds.gain[luck] + odds.boon[luck]) life.tasks.winStreak += 1;
};

/** Ce que rendent les tâches, à la seconde ; le bot sait combien il lit et trouve par seconde en ce moment. */
type Give = { tokens: (n: number) => void; pages: (seconds: number) => void; knowledge: (seconds: number) => void };

const give = (run: Run, reward: Reward, to: Give, once: boolean): void => {
  const tasks = run.life.tasks;
  if (reward.tokens) {
    to.tokens(reward.tokens);
    if (once) tasks.onceTokens += reward.tokens;
  }
  if (reward.reading) to.pages(reward.reading * 3600);
  if (reward.knowledge) to.knowledge(reward.knowledge * 3600);
  tasks.readingBonus += reward.readingBonus ?? 0;
  tasks.knowledgeBonus += reward.knowledgeBonus ?? 0;
  if (reward.crayon) tasks.crayonAt = run.life.clock;
};

/** Le temps passe (à l'écran ou non) : minuit efface les tâches du jour ; celles qui sont faites donnent leurs jetons. */
export const tickTasks = (run: Run, seconds: number, onScreen: boolean, to: Give): void => {
  const { life } = run;
  const tasks = life.tasks;
  if (!life.stars.has('explore.n')) return;
  const day = Math.floor(life.clock / 86400);
  if (day !== tasks.day) {
    tasks.day = day;
    tasks.screen = 0;
    tasks.today = Array.from({ length: dailyCount(life) }, () => drawValue(life));
  }
  if (onScreen) tasks.screen += seconds;
  if (life.stars.has('tasks.p3')) tasks.last ??= { at: life.clock, ether: 0, pages: 0, knowledge: 0 };
  tasks.today = tasks.today.map((value) => {
    if (value < 0 || tasks.screen < value * MINUTES_PER_TOKEN * 60) return value;
    tasks.dailyDone += 1;
    tasks.dailyTokens += value;
    to.tokens(value);
    return -value;
  });
  // Les tâches « une seule fois » : regardées une fois par minute (le compte des sceaux coûte).
  if (onScreen && Math.floor(life.clock / 60) === Math.floor((life.clock - seconds) / 60)) return;
  for (const task of ONCE_TASKS) {
    if (tasks.done[task.n] !== undefined || !life.stars.has(task.star)) continue;
    if (!tasks.shown[task.n]) {
      task.start?.(run);
      tasks.shown[task.n] = { at: life.clock, base: task.before ? 0 : (task.count?.(run) ?? 0) };
    }
    if (!task.count || task.count(run) - tasks.shown[task.n].base < task.goal) continue;
    tasks.done[task.n] = life.clock;
    give(run, task.reward, to, true);
  }
};

/** « Une dernière pour la route » compte ce qui est lu, trouvé et dépensé. */
export const countLast = (life: Life, what: 'ether' | 'pages' | 'knowledge', amount: number): void => {
  const last = life.tasks.last;
  if (!last || last.doneAt !== undefined) return;
  last[what] += amount;
  if (last.ether >= LAST_TASK.ether && last.pages >= LAST_TASK.pages && last.knowledge >= LAST_TASK.knowledge) last.doneAt = life.clock;
};

/** Les étoiles des tâches que le bot peut allumer maintenant (--sans-taches : aucune). */
export const openTaskStars = (life: Life): { id: string; cost: number }[] =>
  PLAYER.tasks
    ? TASK_STARS.filter(
        (star) =>
          !life.stars.has(star.id) &&
          (!star.after || life.stars.has(star.after)) &&
          (!neededFor(star.id) || life.stars.has(neededFor(star.id)!)),
      )
    : [];

/** L'Âge Numérique est allumé : le Sablier se trouve (le 3e Âge). */
export const digitalLit = (life: Life): boolean => life.stars.has(DIGITAL_AGE);
