import { modSealId, type ModText } from './modSeals';
import type { GameState } from '../core/state';

/**
 * Les tâches des mods (.ai/plan-taches.md, « Mods ») : IdleBabel.addTask. Elles s'écrivent au bout de la liste « Une seule
 * fois » du livre blanc, dès que le Nord est allumé, et se font une fois. Leur récompense est celle du mod (son texte, ce
 * qu'elle fait) : jamais un jeton de la Loterie. Rien d'elles ne compte dans le jeu (« une seule fois · n / N », sceaux,
 * « Fais 30 tâches du jour »). Leur avancement est gardé dans state.tasks.mods ; effacé si le mod est supprimé.
 */

/** Ce qu'un mod donne pour une tâche à lui. */
export interface ModTaskInput {
  id: string;
  /** La consigne (« Lis 100 livres ») : une chaîne, ou { fr, en }. */
  text: ModText;
  /** Ce qu'elle rapporte, écrit au bout de sa ligne (« 1 h de lecture ») : une chaîne, ou { fr, en }. */
  reward: ModText;
  /** Le but, et où elle en est (regardé à chaque pas du jeu) : faite quand progress(state) >= goal. */
  goal: number;
  progress: (state: GameState) => number;
  /** Appelée une fois, quand le joueur prend sa récompense (un clic sur la tâche faite). */
  give?: (state: GameState) => void;
}

export interface ModTask extends Required<Omit<ModTaskInput, 'give'>> {
  /** « mod:<mod>:<id> », comme les sceaux des mods. */
  key: string;
  mod: string;
  give?: (state: GameState) => void;
}

const tasks: ModTask[] = [];

export const modTasks = (): readonly ModTask[] => tasks;

const isText = (text: unknown): text is ModText =>
  typeof text === 'string' || (!!text && typeof text === 'object' && Object.values(text).every((value) => typeof value === 'string'));

/** Ajoute la tâche d'un mod ; refusée (false) si elle est mal formée ou déjà là. */
export const addModTask = (mod: string, input: ModTaskInput): boolean => {
  if (!input || typeof input.id !== 'string' || !input.id || !isText(input.text) || !isText(input.reward)) return false;
  if (typeof input.goal !== 'number' || !(input.goal > 0) || typeof input.progress !== 'function') return false;
  if (input.give !== undefined && typeof input.give !== 'function') return false;
  const key = modSealId(mod, input.id);
  if (tasks.some((task) => task.key === key)) return false;
  tasks.push({
    key,
    mod,
    id: input.id,
    text: input.text,
    reward: input.reward,
    goal: input.goal,
    progress: input.progress,
    give: input.give,
  });
  return true;
};

/** Où en est la tâche, entre 0 et son but (une erreur du mod : 0). */
export const modTaskCount = (state: GameState, task: ModTask): number => {
  if (state.tasks.mods[task.key]) return task.goal;
  try {
    const value = Number(task.progress(state));
    return Number.isFinite(value) ? Math.min(task.goal, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
};

/** Les tâches des mods qui atteignent leur but sont faites ; renvoie celles-là. */
export const advanceModTasks = (state: GameState, now: number): ModTask[] => {
  const finished: ModTask[] = [];
  for (const task of tasks) {
    if (state.tasks.mods[task.key] || modTaskCount(state, task) < task.goal) continue;
    state.tasks.mods[task.key] = { done: now };
    finished.push(task);
  }
  return finished;
};

/** La récompense d'une tâche de mod faite, prise au clic. Renvoie true si elle a été donnée. */
export const takeModTask = (state: GameState, key: string): boolean => {
  const done = state.tasks.mods[key];
  const task = tasks.find((one) => one.key === key);
  if (!done || done.taken || !task) return false;
  done.taken = true;
  try {
    task.give?.(state);
  } catch (error) {
    console.error(`[Idle Babel] mod « ${task.mod} », tâche « ${task.id} » :`, error);
  }
  return true;
};

/** Une tâche de mod faite attend qu'on prenne sa récompense (celles des mods chargés seulement). */
export const modTaskWaiting = (state: GameState): boolean =>
  tasks.some((task) => state.tasks.mods[task.key] && !state.tasks.mods[task.key].taken);

/** Tests : plus aucune tâche de mod. */
export const clearModTasks = (): void => {
  tasks.length = 0;
};
