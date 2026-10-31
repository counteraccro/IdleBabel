import { WEEKLY_GOALS, WEEKLY_KINDS, WEEKLY_STAMPS, WEEKLY_TASKS, WEEK_BONUS, WEEK_STAR, type WeeklyKind } from '../data/tasks';
import { SENTENCES } from '../data/sentences';
import { RARE_BOOKS } from '../data/rareBooks';
import { CLOSED, STARS } from '../data/etheriumStars';
import { PUZZLES_ID } from '../data/puzzles';
import { dayOf } from './dailyTasks';
import { addStamps } from './stamps';
import { isComplete } from './sentences';
import { COLORING_ID, drawingsDone } from './coloring';
import { mimicUnlocked } from './etherium';
import type { GameState, WeeklyTask } from '../core/state';

/**
 * Les tâches de la semaine (data/tasks.ts ; maquette validée .ai/maquette-guichet.html) : tirées le lundi à minuit, heure
 * du joueur, parmi ce qu'il a rencontré ; effacées le dimanche soir (leurs tampons pas pris sont donnés). Une fiche
 * épinglée en face d'« Aujourd'hui » ; un clic dessus prend les tampons de celles qui sont faites.
 */

/** Le lundi de la semaine de `now`, heure du joueur. */
export const weekOf = (now: number): string => {
  const date = new Date(now);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dayOf(date.getTime());
};

/** Les jours qu'il reste à la semaine, aujourd'hui compris (7 le lundi, 1 le dimanche). */
export const weekDaysLeft = (now: number): number => 7 - ((new Date(now).getDay() + 6) % 7);

const lit = (state: GameState, id: string): boolean => state.etherium.includes(id);

/** Les tâches de la semaine : deux, une troisième avec l'étoile « la semaine ». */
export const weeklyCount = (state: GameState): number => WEEKLY_TASKS + (lit(state, WEEK_STAR) ? 1 : 0);

const sentencesDone = (state: GameState): number => SENTENCES.filter((sentence) => isComplete(state, sentence.id)).length;
const rareFound = (state: GameState): number => Object.keys(state.rareBooks).length;

/** Ce que compte chaque modèle, depuis toujours (rien ne baisse). « daily » compte ses jours à part. */
const METRIC: Record<WeeklyKind, (state: GameState, task: WeeklyTask) => number> = {
  daily: (_state, task) => task.days?.length ?? 0,
  letters: (state) => state.letters,
  mimic: (state) => state.mimic.caught,
  grids: (state) => state.puzzles.solved,
  coloring: drawingsDone,
  rare: rareFound,
  sentence: sentencesDone,
  feed: (state) => state.exiles,
  star: (state) => state.etherium.length,
  boons: (state) => state.tasks.counters.boons,
  clicks: (state) => state.stats.clicks,
};

/** Un modèle se tire si le joueur a rencontré ce dont il parle, et qu'il reste à faire. */
const DRAWABLE: Record<WeeklyKind, (state: GameState, now: number) => boolean> = {
  // Cinq jours de tâches du jour : il faut qu'il en reste cinq à la semaine.
  daily: (_state, now) => weekDaysLeft(now) >= WEEKLY_GOALS.daily[0],
  letters: (state) => state.letters > 0,
  mimic: mimicUnlocked,
  grids: (state) => PUZZLES_ID in state.rareBooks,
  coloring: (state) => COLORING_ID in state.rareBooks && drawingsDone(state) < 9,
  rare: (state) => rareFound(state) > 0 && rareFound(state) < RARE_BOOKS.length,
  sentence: (state) => sentencesDone(state) > 0 && sentencesDone(state) < SENTENCES.length,
  feed: (state) => state.exiles > 0,
  star: (state) => STARS.some((star) => !CLOSED.has(star.id) && !lit(state, star.id)),
  boons: (state) => state.lottery.draws > 0,
  clicks: () => true,
};

/** Une nouvelle tâche, d'un modèle pas encore tiré cette semaine. */
const newTask = (state: GameState, random: () => number, now: number): WeeklyTask => {
  const taken = new Set(state.tasks.week.tasks.map((task) => task.kind));
  const pool = WEEKLY_KINDS.filter((kind) => !taken.has(kind) && DRAWABLE[kind](state, now));
  const kind = pool.length > 0 ? pool[Math.floor(random() * pool.length)] : 'clicks';
  const [low, high] = WEEKLY_GOALS[kind];
  const step = kind === 'clicks' ? 100 : 1;
  const goal = low + step * Math.floor(random() * ((high - low) / step + 1));
  const task: WeeklyTask = { kind, goal, base: 0 };
  if (kind === 'daily') task.days = [];
  task.base = METRIC[kind](state, task);
  return task;
};

/** Toutes les tâches de la semaine sont faites. */
export const weekComplete = (state: GameState): boolean =>
  state.tasks.week.tasks.length > 0 && state.tasks.week.tasks.every((task) => task.done !== undefined);

/** Les tampons qui attendent sur la fiche : ceux des tâches faites, et les 10 de plus si toutes le sont. */
const waitingStamps = (state: GameState): { at: number; n: number }[] => {
  const week = state.tasks.week;
  const cells = week.tasks.filter((task) => task.done !== undefined && !task.taken).map((task) => ({ at: task.done!, n: WEEKLY_STAMPS }));
  if (weekComplete(state) && !week.bonusTaken) cells.push({ at: Math.max(...week.tasks.map((task) => task.done!)), n: WEEK_BONUS });
  return cells;
};

/** Des tampons attendent sur la fiche de la semaine. */
export const weekWaiting = (state: GameState): boolean => waitingStamps(state).length > 0;

/** Un clic sur la fiche : les tampons qui y attendent sont pris. Renvoie combien. */
export const takeWeek = (state: GameState, now = Date.now()): number => {
  const cells = waitingStamps(state);
  for (const cell of cells) addStamps(state, cell.n, now);
  const week = state.tasks.week;
  for (const task of week.tasks) if (task.done !== undefined) task.taken = true;
  if (weekComplete(state)) week.bonusTaken = true;
  return cells.reduce((sum, cell) => sum + cell.n, 0);
};

/**
 * La semaine : le lundi, celles de la semaine passée s'effacent (leurs tampons pas pris sont donnés, à leur date) et
 * celles de la semaine se tirent ; l'étoile « la semaine » allumée en cours de semaine en ajoute une.
 */
export const refreshWeek = (state: GameState, random: () => number, now: number): void => {
  const week = state.tasks.week;
  const start = weekOf(now);
  if (week.start !== start) {
    for (const cell of waitingStamps(state)) addStamps(state, cell.n, cell.at);
    state.tasks.week = { start, tasks: [] };
  }
  const tasks = state.tasks.week.tasks;
  while (tasks.length < weeklyCount(state)) tasks.push(newTask(state, random, now));
};

/** Où en est une tâche de la semaine. */
export const weeklyCountOf = (state: GameState, task: WeeklyTask): number =>
  task.done !== undefined ? task.goal : Math.min(task.goal, Math.max(0, METRIC[task.kind](state, task) - task.base));

/** Les tâches de la semaine atteintes sont faites ; un jour où toutes les tâches du jour l'ont été compte. Renvoie celles faites. */
export const advanceWeekly = (state: GameState, now: number): WeeklyTask[] => {
  const today = state.tasks.today;
  const allToday = today.length > 0 && today.every((task) => task.done !== undefined);
  const finished: WeeklyTask[] = [];
  for (const task of state.tasks.week.tasks) {
    if (task.done !== undefined) continue;
    if (task.kind === 'daily' && allToday && state.tasks.day && !task.days?.includes(state.tasks.day))
      (task.days ??= []).push(state.tasks.day);
    if (weeklyCountOf(state, task) < task.goal) continue;
    task.done = now;
    state.tasks.weeklyDone += 1;
    finished.push(task);
  }
  if (finished.length > 0 && weekComplete(state)) state.tasks.perfectWeeks += 1;
  return finished;
};
