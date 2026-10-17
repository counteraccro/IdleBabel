import { ONCE_TASKS, TASK_STAR, type TaskReward } from '../data/tasks';
import { TOOLS } from '../data/tools';
import { advanceDaily, dailyAfterPrestige, refreshDay } from './dailyTasks';
import { advanceOnce } from './onceTasks';
import { creditMethods, gainPages, pagesPerSecond } from './production';
import { addKnowledge, findKnowledge, findChance, maxTurnsPerSecond, MAX_FINDS_PER_PAGE } from './knowledge';
import { PAGES_PER_LEAF } from './books';
import { findRelic } from './relics';
import type { GameState } from '../core/state';

/**
 * Les tâches (.ai/plan-taches.md) : elles apparaissent dans le livre blanc quand le Nord de la Rose des vents s'allume.
 * Celles du jour (systems/dailyTasks.ts) et celles qui ne se font qu'une fois (systems/onceTasks.ts) avancent ici, à
 * chaque pas de la partie ; ce qu'elles rapportent attend sur la tâche qu'on le prenne (au clic).
 */

/** Le Nord est allumé : les tâches existent. */
export const tasksOpen = (state: GameState): boolean => state.etherium.includes(TASK_STAR.north);

/** Les tâches « une seule fois » se regardent au plus une fois par tant (ms) : leurs comptes (sceaux, figures) coûtent. */
const ONCE_EVERY_MS = 1000;
let onceAt = 0;

/** Ce que suivent les tâches « une seule fois » : feuilles à la main, méthodes achetées, temps sans rien toucher. */
const follow = (state: GameState, seconds: number, onScreen: boolean): void => {
  const counters = state.tasks.counters;
  if (state.stats.clicks !== counters.clicks) {
    counters.clicks = state.stats.clicks;
    counters.noHandFrom = state.booksFinished;
  }
  for (const tool of TOOLS) {
    const owned = state.tools[tool.id];
    const before = counters.owned[tool.id] ?? 0;
    // Un prestige les remet à zéro : seuls les achats (ce qui monte) comptent.
    if (owned > before) counters.bought[tool.id] = (counters.bought[tool.id] ?? 0) + owned - before;
    counters.owned[tool.id] = owned;
  }
  if (onScreen && seconds > 0 && seconds <= 2) counters.untouched += seconds;
};

/**
 * Un pas de la partie : `seconds` écoulées, l'écran visible ou non. Minuit efface les tâches du jour ; les buts atteints
 * font les tâches. Renvoie les tâches faites (le jeton de la clé brille).
 */
export const tickTasks = (
  state: GameState,
  seconds: number,
  onScreen: boolean,
  now = Date.now(),
  random: () => number = Math.random,
): number => {
  if (!tasksOpen(state)) return 0;
  if (seconds > 0) state.tasks.sinceWake += seconds;
  state.lottery.tokens += refreshDay(state, random, now);
  follow(state, seconds, onScreen);
  let finished = advanceDaily(state, now).length;
  if (now - onceAt >= ONCE_EVERY_MS || now < onceAt) {
    onceAt = now;
    finished += advanceOnce(state, now).length;
  }
  return finished;
};

/** Le joueur a touché le jeu (souris, clavier) : « Laisse le jeu ouvert 1 h sans rien toucher » repart de zéro. */
export const taskTouched = (state: GameState): void => {
  state.tasks.counters.untouched = 0;
};

/** Le jeu était fermé tant de secondes (core/absence.ts) : la plus longue absence (« Reviens après une absence de 24 h »). */
export const taskAbsence = (state: GameState, seconds: number): void => {
  if (tasksOpen(state)) state.tasks.counters.longestAway = Math.max(state.tasks.counters.longestAway, seconds);
};

/** Un tirage de la Loterie compté : un gain ou un bonus allonge la série sans malus, un malus la casse, « rien » la laisse. */
export const taskDraw = (state: GameState, outcome: string): void => {
  const counters = state.tasks.counters;
  if (outcome === 'curse') counters.streak = 0;
  else if (outcome === 'gain' || outcome === 'boon' || outcome === 'jackpot') counters.streak += 1;
};

/** Au prestige : les tâches restent ; celles au rythme de la partie se recalculent sur la nouvelle. */
export const tasksAfterPrestige = (state: GameState): void => {
  state.tasks.sinceWake = 0;
  dailyAfterPrestige(state);
};

/** Connaissance trouvée par seconde au rythme du moment (pages qui tournent seules, chance, Connaissance par trouvaille). */
const knowledgePerSecond = (state: GameState): number =>
  (state.settings.autoTurn ? Math.min(pagesPerSecond(state), maxTurnsPerSecond(state) * PAGES_PER_LEAF) : 0) *
  Math.min(MAX_FINDS_PER_PAGE, findChance(state)) *
  findKnowledge(state);

/** Une récompense : jetons, heures de lecture ou de Connaissance au rythme du moment, bonus pour toujours. */
const give = (state: GameState, reward: TaskReward): void => {
  if (reward.tokens) state.lottery.tokens += reward.tokens;
  if (reward.readingHours) {
    const seconds = reward.readingHours * 3600;
    gainPages(state, pagesPerSecond(state) * seconds);
    creditMethods(state, seconds);
  }
  if (reward.knowledgeHours) addKnowledge(state, Math.ceil(knowledgePerSecond(state) * reward.knowledgeHours * 3600));
  state.tasks.bonus.reading += reward.readingBonus ?? 0;
  state.tasks.bonus.knowledge += reward.knowledgeBonus ?? 0;
  // Le Crayon : rangé dans la vitrine, son récit (une fois), son sceau.
  if (reward.crayon) findRelic(state, 'pencil');
};

/** Le jeton d'une tâche du jour faite, pris au clic. Renvoie ce qu'elle valait (0 : rien à prendre). */
export const takeDaily = (state: GameState, index: number): number => {
  const task = state.tasks.today[index];
  if (!task || task.done === undefined || task.taken) return 0;
  task.taken = true;
  state.lottery.tokens += task.value;
  return task.value;
};

/** La récompense d'une tâche « une seule fois » faite, prise au clic. Renvoie true si elle a été donnée. */
export const takeOnce = (state: GameState, n: number): boolean => {
  const task = state.tasks.once[n];
  const def = ONCE_TASKS.find((one) => one.n === n);
  if (!def || !task || task.done === undefined || task.taken) return false;
  task.taken = true;
  give(state, def.reward);
  return true;
};

/** Une tâche faite attend qu'on prenne ce qu'elle rapporte : le jeton de la clé brille. */
export const taskWaiting = (state: GameState): boolean =>
  state.tasks.today.some((task) => task.done !== undefined && !task.taken) ||
  Object.values(state.tasks.once).some((task) => task.done !== undefined && !task.taken);

/** Les tâches du jour pas encore faites (la légende de la pile : « 2 tâches en cours »). */
export const dailyRunning = (state: GameState): number => state.tasks.today.filter((task) => task.done === undefined).length;
