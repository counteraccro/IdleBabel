import { LAST_TASK, ONCE_TASKS, type OnceTaskDef } from '../data/tasks';
import { CLOSED, STARS } from '../data/etheriumStars';
import { SENTENCES } from '../data/sentences';
import { SEALS } from '../data/seals';
import { ROOM_RELICS } from '../data/relics';
import { isComplete } from './sentences';
import { drawingsDone } from './coloring';
import { mimicUnlocked, relicsUnlocked } from './etherium';
import { COLORING_ID } from './coloring';
import { RABBIT_ID } from './rabbit';
import { DARK_PATTERNS_ID } from './darkPatterns';
import { ENDLESS_BOOK_ID } from './endlessBook';
import type { GameState, OnceTask } from '../core/state';

/**
 * Les tâches « une seule fois » (data/tasks.ts) : hors du quota du jour, toutes en même temps. Chacune reste en lettres de
 * Babel tant que le joueur n'a pas rencontré ce dont elle parle ; écrite en clair, elle apparaît, et son compte commence
 * là, jamais avant (l'auteur, 17/10 : « pas avant ») : ce qui était déjà fait ne compte pas, les séries et l'absence
 * repartent de zéro. Sauf les reliques des salles et les livres qui se jouent, et le coloriage (ceux d'avant comptent).
 */

const lit = (state: GameState, id: string): boolean => state.etherium.includes(id);

/** Les livres qui se jouent, et ce qui dit qu'ils sont finis (leur sceau). */
const PLAYABLE: readonly [string, string][] = [
  [RABBIT_ID, 'rabbitHome'],
  [DARK_PATTERNS_ID, 'escaped'],
  [ENDLESS_BOOK_ID, 'endlessEnding'],
  [COLORING_ID, 'coloringAll'],
];

/** Les phrases du livre blanc complétées. */
const completeSentences = (state: GameState): string[] =>
  SENTENCES.filter((sentence) => isComplete(state, sentence.id)).map((sentence) => sentence.id);

/** Les figures entières de l'Etherium : chaque page dont toutes les étoiles qui s'allument le sont. */
export const fullFigures = (state: GameState): number => {
  const pages = new Map<string, boolean>();
  for (const star of STARS) {
    if (CLOSED.has(star.id)) continue;
    pages.set(star.page, (pages.get(star.page) ?? true) && lit(state, star.id));
  }
  return [...pages.values()].filter(Boolean).length;
};

/** Les planches de sceaux remplies (celles du jeu, sans les mods). */
export const fullPlates = (state: GameState): number => {
  const plates = new Map<string, boolean>();
  for (const seal of SEALS) plates.set(seal.plate, (plates.get(seal.plate) ?? true) && seal.id in state.seals);
  return [...plates.values()].filter(Boolean).length;
};

/** Ce que compte « Une dernière pour la route », depuis toujours : l'Éther versé, les pages lues, la Connaissance trouvée. */
const roadTotals = (state: GameState): number[] => [
  Math.max(0, state.etherReceived - state.ether),
  state.totalPagesRead,
  state.lifetimeKnowledge,
];

/** Les buts de « Une dernière pour la route » atteints depuis son apparition (0 à 3). */
export const roadReached = (state: GameState, task: OnceTask): number => {
  const goals = [LAST_TASK.ether, LAST_TASK.pages, LAST_TASK.knowledge];
  return roadTotals(state).filter((total, index) => total - (task.bases?.[index] ?? total) >= goals[index]).length;
};

interface Counting {
  /** Son compte, depuis toujours (on en ôte ce qu'il valait à son apparition). */
  count: (state: GameState, task: OnceTask) => number;
  /** Ce qu'elle fait à son apparition (une série, une absence qui repart de zéro). */
  start?: (state: GameState, task: OnceTask) => void;
  /** Ce qui était fait avant compte aussi (l'auteur, 17/10 : les reliques, les livres qui se jouent, le coloriage). */
  before?: true;
  /** Le joueur a rencontré ce dont elle parle : elle s'écrit en clair. Sans : dès son étoile. */
  met?: (state: GameState) => boolean;
}

const COUNTING: Record<number, Counting> = {
  // Livres finis depuis la dernière feuille tournée à la main.
  1: {
    count: (state) => state.booksFinished - state.tasks.counters.noHandFrom,
    start: (state) => (state.tasks.counters.noHandFrom = state.booksFinished),
    before: true,
  },
  2: { count: (state) => state.stats.clicks },
  3: {
    count: (state, task) => {
      const ids = (task.ids ??= []);
      for (const id of completeSentences(state)) if (!ids.includes(id) && !task.skip?.includes(id)) ids.push(id);
      return ids.length;
    },
    start: (state, task) => {
      task.ids = [];
      task.skip = completeSentences(state);
    },
    before: true,
  },
  4: { count: (state) => state.mimic.caught, met: mimicUnlocked },
  5: { count: (state) => Object.keys(state.rareBooks).length, met: (state) => Object.keys(state.rareBooks).length > 0 },
  6: { count: (state) => state.lottery.draws, met: (state) => state.lottery.draws > 0 || state.lottery.tokens > 0 },
  // Exemplaires achetés d'une même méthode, à travers les prestiges.
  7: {
    count: (state) => Math.max(0, ...Object.values(state.tasks.counters.bought).map((n) => n ?? 0)),
    start: (state) => (state.tasks.counters.bought = {}),
    before: true,
  },
  8: { count: (state) => state.tasks.counters.untouched, start: (state) => (state.tasks.counters.untouched = 0), before: true },
  9: { count: (state) => state.tasks.counters.longestAway, start: (state) => (state.tasks.counters.longestAway = 0), before: true },
  10: { count: (state) => state.exiles },
  11: {
    count: (state) => ROOM_RELICS.filter(({ id }) => state.relics.found[id] !== undefined).length,
    before: true,
    met: (state) => relicsUnlocked(state) || Object.keys(state.relics.found).length > 0,
  },
  12: { count: (state) => state.etherium.length },
  13: {
    count: (state) => PLAYABLE.filter(([, seal]) => seal in state.seals).length,
    before: true,
    met: (state) => PLAYABLE.some(([book]) => book in state.rareBooks),
  },
  14: { count: drawingsDone, before: true, met: (state) => COLORING_ID in state.rareBooks },
  15: { count: (state) => state.tasks.dailyDone },
  16: { count: (state) => state.booksFinished },
  // Livres finis dans la partie : depuis son apparition, puis depuis le début de chaque partie d'après.
  17: {
    count: (state, task) => state.booksFinished - (state.wake.book === task.wakeBook ? task.base : Math.max(0, state.wake.book - 1)),
    start: (state, task) => {
      task.wakeBook = state.wake.book;
      task.base = state.booksFinished;
    },
    before: true,
  },
  18: { count: fullFigures },
  19: { count: fullPlates },
  20: {
    count: (state) => state.tasks.counters.streak,
    start: (state) => (state.tasks.counters.streak = 0),
    before: true,
    met: (state) => state.lottery.draws > 0,
  },
  // « Une dernière pour la route » : ses trois buts, comptés depuis son apparition, à travers les prestiges.
  21: { count: roadReached, start: (state, task) => (task.bases = roadTotals(state)), before: true },
};

/** La tâche est là (son étoile allumée), en Babel ou en clair. */
export const onceShown = (state: GameState, def: OnceTaskDef): boolean => lit(state, def.star);

/** Elle s'écrit en clair : son étoile, et ce dont elle parle, rencontré. */
export const onceMet = (state: GameState, def: OnceTaskDef): boolean => onceShown(state, def) && (COUNTING[def.n].met?.(state) ?? true);

/** Où en est son compte (0 avant son apparition). */
export const onceCount = (state: GameState, def: OnceTaskDef): number => {
  const task = state.tasks.once[def.n];
  if (!task) return 0;
  if (task.done !== undefined) return def.goal;
  const counting = COUNTING[def.n];
  return Math.min(def.goal, Math.max(0, counting.count(state, task) - (counting.before ? 0 : task.base)));
};

/** Les tâches qui s'écrivent en clair apparaissent (leur compte commence) ; celles qui atteignent leur but sont faites. */
export const advanceOnce = (state: GameState, now: number): OnceTaskDef[] => {
  const finished: OnceTaskDef[] = [];
  for (const def of ONCE_TASKS) {
    let task = state.tasks.once[def.n];
    if (task?.done !== undefined) continue;
    if (!task) {
      if (!onceMet(state, def)) continue;
      const counting = COUNTING[def.n];
      task = { at: now, base: 0 };
      if (!counting.before) task.base = counting.count(state, task);
      counting.start?.(state, task);
      state.tasks.once[def.n] = task;
    }
    if (onceCount(state, def) < def.goal) continue;
    task.done = now;
    finished.push(def);
  }
  return finished;
};
