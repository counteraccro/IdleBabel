import {
  CLICKS_PER_TOKEN,
  COUNT_STARS,
  DAILY_KINDS,
  DAILY_TASKS,
  GAIN_ODDS,
  GAIN_STARS,
  MINUTES_PER_TOKEN,
  RECALC_AFTER_WAKE,
  type DailyKind,
} from '../data/tasks';
import { MAX_FINDS_PER_PAGE, findChance, findKnowledge, maxTurnsPerSecond } from './knowledge';
import { pagesPerSecond } from './production';
import { PAGES_PER_BOOK, PAGES_PER_LEAF } from './books';
import { mimicUnlocked } from './etherium';
import { mimicEvery } from './mimic';
import { relicTaskLength } from './relics';
import type { DailyTask, GameState } from '../core/state';

/**
 * Les tâches du jour (.ai/plan-taches.md) : trois par jour (la branche « le nombre » en ajoute deux), tirées au hasard,
 * effacées à minuit (heure du joueur). Ce que vaut chacune est tiré : 1, 2 ou 3 jetons, d'autant plus longue. Elles
 * avancent toutes en même temps ; une tâche faite garde son jeton jusqu'au clic.
 */

/** Le jour, heure du joueur : « AAAA-MM-JJ ». */
export const dayOf = (now: number): string => {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const lit = (state: GameState, id: string): boolean => state.etherium.includes(id);

/** Les tâches du jour : trois, plus une par étoile de la branche « le nombre ». */
export const dailyCount = (state: GameState): number => DAILY_TASKS + COUNT_STARS.filter((id) => lit(state, id)).length;

/** Le niveau de la branche « le gain » : la plus haute étoile allumée. */
const gainLevel = (state: GameState): number => (lit(state, GAIN_STARS[1]) ? 2 : lit(state, GAIN_STARS[0]) ? 1 : 0);

/** Ce que vaut une tâche tirée : 1, 2 ou 3 jetons, selon la branche « le gain ». */
export const drawValue = (state: GameState, random: () => number): number => {
  const odds = GAIN_ODDS[gainLevel(state)];
  let roll = random();
  for (let i = 0; i < odds.length; i++) if ((roll -= odds[i]) < 0) return i + 1;
  return odds.length;
};

/** Ce que compte chaque modèle, depuis toujours (rien de tout ça ne baisse, prestige compris). */
const METRIC: Record<DailyKind, (state: GameState) => number> = {
  pages: (state) => state.totalPagesRead,
  clicks: (state) => state.stats.clicks,
  finds: (state) => state.stats.fragments,
  knowledge: (state) => state.lifetimeKnowledge,
  books: (state) => state.booksFinished,
  mimic: (state) => state.mimic.caught,
};

/** Pages tournées seules dans le livre en main, par seconde. */
const turnedPerSecond = (state: GameState): number =>
  state.settings.autoTurn ? Math.min(pagesPerSecond(state), maxTurnsPerSecond(state) * PAGES_PER_LEAF) : 0;

const findsPerSecond = (state: GameState): number => turnedPerSecond(state) * Math.min(MAX_FINDS_PER_PAGE, findChance(state));

/** Ce que fait chaque modèle au rythme de la partie, par seconde (null : un nombre fixe par jeton). */
const RATE: Record<DailyKind, ((state: GameState) => number) | null> = {
  pages: pagesPerSecond,
  clicks: null,
  finds: findsPerSecond,
  knowledge: (state) => findsPerSecond(state) * findKnowledge(state),
  books: (state) => turnedPerSecond(state) / PAGES_PER_BOOK,
  mimic: (state) => (mimicUnlocked(state) ? 1 / mimicEvery(state) : 0),
};

/** Un nombre rond : deux chiffres significatifs, au moins 1. */
const round = (value: number): number => {
  if (!(value > 1)) return 1;
  const unit = 10 ** Math.max(0, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / unit) * unit;
};

/** Un modèle se tire : il a un rythme (la Mimic n'est pas là sans l'Est, rien ne se trouve sans pages qui tournent). */
const drawable = (state: GameState, kind: DailyKind): boolean => {
  const rate = RATE[kind];
  return !rate || rate(state) > 0 || (kind === 'pages' && state.tasks.sinceWake < RECALC_AFTER_WAKE);
};

/**
 * Le but d'une tâche, au rythme de la partie (MINUTES_PER_TOKEN par jeton) ; 0 tant qu'il ne peut pas se calculer : « Lis
 * encore N pages » juste après un prestige (la partie repart de zéro), ou sans rythme du tout.
 */
const goalFor = (state: GameState, kind: DailyKind, value: number): number => {
  const rate = RATE[kind];
  // Le Crayon, s'il agit, raccourcit les nouvelles tâches.
  const length = relicTaskLength(state);
  if (!rate) return round(CLICKS_PER_TOKEN * value * length);
  if (kind === 'pages' && state.tasks.sinceWake < RECALC_AFTER_WAKE) return 0;
  const perSecond = rate(state);
  return perSecond > 0 ? round(perSecond * MINUTES_PER_TOKEN * 60 * value * length) : 0;
};

/** Une nouvelle tâche, d'un modèle pas encore tiré aujourd'hui si possible. */
const newTask = (state: GameState, random: () => number): DailyTask => {
  const taken = new Set(state.tasks.today.map((task) => task.kind));
  const kinds = DAILY_KINDS.filter((kind) => drawable(state, kind));
  const fresh = kinds.filter((kind) => !taken.has(kind));
  const pool = fresh.length > 0 ? fresh : kinds.length > 0 ? kinds : (['clicks'] as const);
  const kind = pool[Math.floor(random() * pool.length)];
  const value = drawValue(state, random);
  return { kind, value, goal: goalFor(state, kind, value), base: METRIC[kind](state) };
};

/** Jetons laissés sur les tâches faites et pas prises : à minuit, ils sont donnés (pas perdus). */
const leftTokens = (state: GameState): number =>
  state.tasks.today.reduce((sum, task) => sum + (task.done !== undefined && !task.taken ? task.value : 0), 0);

/**
 * Le jour : à minuit, les tâches d'hier s'effacent (leurs jetons pas pris sont donnés) et celles du jour se tirent ; une
 * étoile allumée dans la journée en ajoute. Renvoie les jetons donnés.
 */
export const refreshDay = (state: GameState, random: () => number, now: number): number => {
  const tasks = state.tasks;
  const day = dayOf(now);
  let given = 0;
  if (tasks.day !== day) {
    given = leftTokens(state);
    tasks.day = day;
    tasks.today = [];
  }
  while (tasks.today.length < dailyCount(state)) tasks.today.push(newTask(state, random));
  return given;
};

/** Où en est une tâche du jour, de 0 à 1. */
export const dailyProgress = (state: GameState, task: DailyTask): number => {
  if (task.done !== undefined) return 1;
  if (task.goal <= 0) return task.carry ?? 0;
  return Math.min(1, Math.max(0, (METRIC[task.kind](state) - task.base) / task.goal));
};

/** Ce qu'il reste à faire (le nombre écrit sur le papier, « Lis encore N pages »). */
export const dailyLeft = (state: GameState, task: DailyTask): number =>
  task.goal <= 0 ? 0 : Math.max(0, Math.ceil(task.goal - (METRIC[task.kind](state) - task.base)));

/** Les buts qui attendent (après un prestige) se calculent, et les tâches atteintes sont faites. Renvoie celles faites. */
export const advanceDaily = (state: GameState, now: number): DailyTask[] => {
  const finished: DailyTask[] = [];
  for (const task of state.tasks.today) {
    if (task.done !== undefined) continue;
    if (task.goal <= 0) {
      const goal = goalFor(state, task.kind, task.value);
      if (goal <= 0) continue;
      task.goal = goal;
      task.base = METRIC[task.kind](state) - (task.carry ?? 0) * goal;
      delete task.carry;
    }
    if (dailyProgress(state, task) < 1) continue;
    task.done = now;
    state.tasks.dailyDone += 1;
    finished.push(task);
  }
  return finished;
};

/**
 * Au prestige, les tâches du jour restent ; « Lis encore N pages » se recalcule sur la nouvelle partie (après
 * RECALC_AFTER_WAKE) : ce qui était fait reste fait.
 */
export const dailyAfterPrestige = (state: GameState): void => {
  for (const task of state.tasks.today) {
    if (task.done !== undefined || task.kind !== 'pages' || task.goal <= 0) continue;
    task.carry = dailyProgress(state, task);
    task.goal = 0;
  }
};
