import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { CLICKS_PER_TOKEN, RECALC_AFTER_WAKE } from '../src/data/tasks';
import { dailyCount, dailyProgress, dayOf, drawValue } from '../src/systems/dailyTasks';
import { onceCount } from '../src/systems/onceTasks';
import { ONCE_TASKS } from '../src/data/tasks';
import { takeDaily, takeOnce, taskDraw, taskTouched, tasksAfterPrestige, taskWaiting, tickTasks } from '../src/systems/tasks';
import { pagesPerSecond } from '../src/systems/production';
import { findKnowledge } from '../src/systems/knowledge';

vi.stubGlobal('window', new EventTarget());

const DAY = new Date(2026, 9, 17, 12).getTime();
const def = (n: number) => ONCE_TASKS.find((task) => task.n === n)!;

/** Une partie qui a allumé le Nord, lit, et dont les tâches au rythme de la partie se calculent déjà. */
const withNorth = (stars: string[] = []) => {
  const state = createInitialState('fr', DAY);
  state.etherium.push('explore.n', ...stars);
  state.tools.diagonal = 10;
  state.tasks.sinceWake = RECALC_AFTER_WAKE;
  return state;
};

/** Le premier tirage ne donne que des feuilles à tourner (le hasard choisit le premier modèle tirable : « clicks »). */
const clicksOnly = () => 0.2;

describe('Les tâches du jour', () => {
  it("n'existent pas avant le Nord", () => {
    const state = createInitialState('fr', DAY);
    tickTasks(state, 0.1, true, DAY);
    expect(state.tasks.today).toEqual([]);
  });

  it('trois par jour, puis quatre et cinq avec la branche « le nombre »', () => {
    expect(dailyCount(withNorth())).toBe(3);
    expect(dailyCount(withNorth(['tasks.n4']))).toBe(4);
    expect(dailyCount(withNorth(['tasks.n4', 'tasks.n5']))).toBe(5);
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY);
    expect(state.tasks.today).toHaveLength(3);
    expect(state.tasks.day).toBe(dayOf(DAY));
    // Une étoile allumée dans la journée en ajoute une.
    state.etherium.push('tasks.n4');
    tickTasks(state, 0.1, true, DAY + 1000);
    expect(state.tasks.today).toHaveLength(4);
  });

  it('valent 1 jeton sans étoile, puis jusqu’à 2 et 3', () => {
    expect(drawValue(withNorth(), () => 0.99)).toBe(1);
    expect(drawValue(withNorth(['tasks.g2']), () => 0.99)).toBe(2);
    expect(drawValue(withNorth(['tasks.g2', 'tasks.g3']), () => 0.99)).toBe(3);
    expect(drawValue(withNorth(['tasks.g2', 'tasks.g3']), () => 0.1)).toBe(1);
  });

  it('se font, et leur jeton se prend au clic', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY);
    const index = state.tasks.today.findIndex((task) => task.kind === 'clicks');
    const task =
      index >= 0 ? state.tasks.today[index] : { ...state.tasks.today[0], kind: 'clicks' as const, goal: CLICKS_PER_TOKEN, base: 0 };
    if (index < 0) state.tasks.today[0] = task;
    const at = Math.max(0, index);
    expect(task.goal).toBe(CLICKS_PER_TOKEN * task.value);
    state.stats.clicks = task.base + task.goal / 2;
    expect(dailyProgress(state, task)).toBeCloseTo(0.5);
    state.stats.clicks = task.base + task.goal;
    tickTasks(state, 0.1, true, DAY + 1000);
    expect(state.tasks.today[at].done).toBeDefined();
    expect(state.tasks.dailyDone).toBe(1);
    expect(taskWaiting(state)).toBe(true);
    expect(takeDaily(state, at)).toBe(task.value);
    expect(state.lottery.tokens).toBe(task.value);
    expect(takeDaily(state, at)).toBe(0);
    expect(taskWaiting(state)).toBe(false);
  });

  it('« Lis encore N pages » : 20 minutes de la production par jeton', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY, () => 0);
    const pages = state.tasks.today.find((task) => task.kind === 'pages')!;
    expect(pages.goal / (pagesPerSecond(state) * 20 * 60)).toBeCloseTo(1, 1);
  });

  it('à minuit, elles s’effacent : un jeton pas pris est donné, les autres tâches se tirent', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY, clicksOnly);
    const task = state.tasks.today[0];
    task.done = DAY;
    tickTasks(state, 0.1, true, DAY + 24 * 3600 * 1000, clicksOnly);
    expect(state.lottery.tokens).toBe(task.value);
    expect(state.tasks.today).toHaveLength(3);
    expect(state.tasks.today.every((one) => one.done === undefined)).toBe(true);
  });

  it('au prestige, « Lis encore N pages » se recalcule sur la nouvelle partie, ce qui était fait reste fait', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY, () => 0);
    const pages = state.tasks.today.find((task) => task.kind === 'pages')!;
    state.totalPagesRead = pages.base + pages.goal / 4;
    tasksAfterPrestige(state);
    expect(pages.goal).toBe(0);
    expect(dailyProgress(state, pages)).toBeCloseTo(0.25);
    state.tools.diagonal = 100;
    tickTasks(state, RECALC_AFTER_WAKE, true, DAY + 1000);
    expect(pages.goal).toBeGreaterThan(0);
    expect(dailyProgress(state, pages)).toBeCloseTo(0.25);
  });
});

describe('Les tâches « une seule fois »', () => {
  it('comptent depuis leur apparition seulement', () => {
    const state = withNorth();
    state.stats.clicks = 5000;
    tickTasks(state, 0.1, true, DAY);
    expect(onceCount(state, def(2))).toBe(0);
    state.stats.clicks = 6000;
    expect(onceCount(state, def(2))).toBe(1000);
  });

  it('restent en Babel tant que ce dont elles parlent n’est pas rencontré (la Mimic, sans l’Est)', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY);
    expect(state.tasks.once[4]).toBeUndefined();
    state.etherium.push('explore.e');
    state.mimic.caught = 7;
    tickTasks(state, 0.1, true, DAY + 2000);
    expect(state.tasks.once[4]).toBeDefined();
    expect(onceCount(state, def(4))).toBe(0);
  });

  it('les reliques trouvées avant comptent', () => {
    const state = withNorth();
    state.relics.found = { loupe: DAY, astrolabe: DAY };
    tickTasks(state, 0.1, true, DAY);
    expect(onceCount(state, def(11))).toBe(2);
  });

  it('« sans rien toucher » et « sans malus » repartent de zéro', () => {
    const state = withNorth(['tasks.p1', 'tasks.p2']);
    // Elle apparaît au premier pas : son compte part de là.
    tickTasks(state, 0.1, true, DAY - 5000);
    for (let i = 0; i < 30; i++) tickTasks(state, 1, true, DAY + 2000 + i * 1000);
    expect(onceCount(state, def(8))).toBeCloseTo(30, 0);
    taskTouched(state);
    expect(onceCount(state, def(8))).toBe(0);
    state.lottery.draws = 1;
    tickTasks(state, 0.1, true, DAY + 40_000);
    taskDraw(state, 'gain');
    taskDraw(state, 'boon');
    taskDraw(state, 'nothing');
    expect(onceCount(state, def(20))).toBe(2);
    taskDraw(state, 'curse');
    expect(onceCount(state, def(20))).toBe(0);
  });

  it('faites, leur récompense attend le clic : jetons, heures de lecture, bonus pour toujours', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY);
    state.stats.clicks = 10_000;
    tickTasks(state, 0.1, true, DAY + 2000);
    expect(state.tasks.once[2].done).toBeDefined();
    const tokens = state.lottery.tokens;
    expect(takeOnce(state, 2)).toBe(true);
    expect(state.lottery.tokens).toBe(tokens + 10);
    expect(takeOnce(state, 2)).toBe(false);

    state.tasks.once[1].done = DAY;
    const before = state.pages;
    takeOnce(state, 1);
    expect(state.pages - before).toBeCloseTo(pagesPerSecond(state) * 12 * 3600, 0);

    const reading = pagesPerSecond(state);
    const knowledge = findKnowledge(state);
    state.tasks.once[7].done = DAY;
    takeOnce(state, 7);
    expect(pagesPerSecond(state)).toBeCloseTo(reading * 1.05);
    state.tasks.bonus.knowledge = 1;
    expect(findKnowledge(state)).toBe(Math.ceil(knowledge * 2));
  });

  it('« Lis 10 000 livres en une seule partie » : depuis son apparition, puis depuis le début de la partie d’après', () => {
    const state = withNorth(['tasks.p2']);
    state.booksFinished = 300;
    state.wake.book = 101;
    tickTasks(state, 0.1, true, DAY);
    state.booksFinished = 350;
    expect(onceCount(state, def(17))).toBe(50);
    state.wake.book = 401;
    state.booksFinished = 420;
    expect(onceCount(state, def(17))).toBe(20);
  });
});
