import { PAGES_PER_BOOK } from '../src/systems/books';
import { fullFigures } from './taches';
import type { Life } from './vie';

/**
 * Les tâches par niveaux (l'auteur, 29/10 ; liste validée dans .ai/plan-taches.md, « Tâches par niveaux ») : chaque niveau
 * compte depuis son apparition, le suivant apparaît dès que le précédent est fait (le bot prend aussitôt). On note quand
 * chaque niveau est fait, jusqu'au 5e (son sceau).
 */

interface Ladder {
  n: number;
  label: string;
  star: string;
  /** Le but de chaque niveau, du premier au cinquième. */
  goals: readonly number[];
  count: (life: Life) => number;
}

const same = (goal: number): number[] => [goal, goal, goal, goal, goal];

export const LADDERS: readonly Ladder[] = [
  { n: 16, label: 'Lis N livres', star: 'tasks.p1', goals: [4_104, 41_041, 82_082, 123_123, 164_164], count: (life) => life.turned / PAGES_PER_BOOK },
  { n: 22, label: 'Trouve N de Connaissance', star: 'explore.n', goals: [410, 410_410, 410_410_410, 4_104_104_104, 41_041_041_041], count: (life) => life.knowledge },
  { n: 2, label: 'Tourne N pages à la main', star: 'explore.n', goals: same(10_000), count: (life) => life.clicks },
  { n: 4, label: 'Attrape N fois la Mimic', star: 'explore.n', goals: same(100), count: (life) => life.mimic.caught },
  { n: 6, label: 'Joue N jetons', star: 'explore.n', goals: same(100), count: (life) => life.lottery.draws },
  { n: 10, label: 'Nourris-le N fois', star: 'explore.n', goals: same(5), count: (life) => life.prestiges },
  { n: 15, label: 'Fais N tâches du jour', star: 'tasks.p1', goals: same(30), count: (life) => life.tasks.dailyDone },
  { n: 12, label: 'Allume N étoiles (finit)', star: 'explore.n', goals: same(50), count: (life) => life.stars.size },
  { n: 18, label: 'Allume N figures (finit)', star: 'tasks.p2', goals: same(3), count: (life) => fullFigures(life) },
];

export interface Levels {
  /** Ce que valait le compte à l'apparition du niveau I, et quand chaque niveau a été fait. */
  base: Record<number, number>;
  shownAt: Record<number, number>;
  doneAt: Record<number, number[]>;
}

export const newLevels = (): Levels => ({ base: {}, shownAt: {}, doneAt: {} });

/** Regardé une fois par minute, avec les tâches « une seule fois ». */
export const tickLevels = (life: Life, levels: Levels): void => {
  for (const ladder of LADDERS) {
    if (!life.stars.has(ladder.star)) continue;
    if (levels.base[ladder.n] === undefined) {
      levels.base[ladder.n] = ladder.count(life);
      levels.shownAt[ladder.n] = life.clock;
      levels.doneAt[ladder.n] = [];
    }
    const done = levels.doneAt[ladder.n];
    const counted = ladder.count(life) - levels.base[ladder.n];
    let needed = ladder.goals.slice(0, done.length + 1).reduce((sum, goal) => sum + goal, 0);
    while (done.length < ladder.goals.length && counted >= needed) {
      done.push(life.clock);
      needed += ladder.goals[done.length] ?? 0;
    }
  }
};
