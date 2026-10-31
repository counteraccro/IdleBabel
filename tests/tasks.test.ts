import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { CLICKS_PER_TOKEN, RECALC_AFTER_WAKE } from '../src/data/tasks';
import { dailyCount, dailyProgress, dayOf, drawValue } from '../src/systems/dailyTasks';
import { advanceOnce, onceCount, onceGoal, onceLevel } from '../src/systems/onceTasks';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { ONCE_TASKS, levelsDone } from '../src/data/tasks';
import { takeDaily, takeOnce, taskDraw, taskTouched, tasksAfterPrestige, taskWaiting, tickTasks } from '../src/systems/tasks';
import { pagesPerSecond } from '../src/systems/production';
import { findKnowledge } from '../src/systems/knowledge';
import { pageOpen, starOpen } from '../src/systems/etherium';
import { starById } from '../src/data/etheriumStars';
import { checkSeals } from '../src/systems/seals';
import { relicTaskLength } from '../src/systems/relics';
import { addStamps } from '../src/systems/stamps';
import { payDoneTasks } from '../src/core/stampsPaid';

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

  it('valent 1 tampon sans étoile, puis jusqu’à 2 et 3', () => {
    expect(drawValue(withNorth(), () => 0.99)).toBe(1);
    expect(drawValue(withNorth(['tasks.g2']), () => 0.99)).toBe(2);
    expect(drawValue(withNorth(['tasks.g2', 'tasks.g3']), () => 0.99)).toBe(3);
    expect(drawValue(withNorth(['tasks.g2', 'tasks.g3']), () => 0.1)).toBe(1);
  });

  it('se font, et leurs tampons se prennent au clic : un tampon dateur sur la carte de lecteur', () => {
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
    expect(takeDaily(state, at, DAY + 2000)).toBe(task.value);
    expect(state.lottery.tokens).toBe(0);
    expect(state.tasks.stamps).toEqual({ balance: task.value, earned: task.value, card: 1, cells: [{ at: DAY + 2000, n: task.value }] });
    expect(takeDaily(state, at)).toBe(0);
    expect(taskWaiting(state)).toBe(false);
  });

  it('« Lis encore N pages » : 20 minutes de la production par tampon', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY, () => 0);
    const pages = state.tasks.today.find((task) => task.kind === 'pages')!;
    expect(pages.goal / (pagesPerSecond(state) * 20 * 60)).toBeCloseTo(1, 1);
  });

  it('à minuit, elles s’effacent : des tampons pas pris sont donnés, à leur date, les autres tâches se tirent', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY, clicksOnly);
    const task = state.tasks.today[0];
    task.done = DAY;
    tickTasks(state, 0.1, true, DAY + 24 * 3600 * 1000, clicksOnly);
    expect(state.tasks.stamps.balance).toBe(task.value);
    expect(state.tasks.stamps.cells).toEqual([{ at: DAY, n: task.value }]);
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

  it('faites, leur récompense attend le clic : des tampons (5 au niveau I d’une échelle, 15 unique), bonus pour toujours', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY);
    state.stats.clicks = 10_000;
    tickTasks(state, 0.1, true, DAY + 2000);
    expect(state.tasks.once[2].done).toBeDefined();
    expect(takeOnce(state, 2, DAY + 3000)).toBe(true);
    expect(state.lottery.tokens).toBe(0);
    expect(state.tasks.stamps.balance).toBe(5);
    expect(takeOnce(state, 2)).toBe(false);

    state.tasks.once[1].done = DAY;
    const before = state.pages;
    takeOnce(state, 1, DAY + 4000);
    expect(state.pages).toBe(before);
    expect(state.tasks.stamps.balance).toBe(20);
    expect(state.tasks.stamps.cells.map((cell) => cell.n)).toEqual([5, 15]);

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

describe("La page « Les Tâches » de l'Etherium", () => {
  it('le Nord coûte 2 Éther et ouvre la page ; « Une dernière pour la route » s’ouvre après p2 (18/10)', () => {
    const state = createInitialState('fr', DAY);
    state.ether = 1000;
    state.etherReceived = 1000;
    expect(pageOpen(state, 'tasks')).toBe(false);
    expect(starOpen(state, 'tasks.n4')).toBe(false);
    expect(starById('explore.n')?.cost).toBe(2);
    expect(starOpen(state, 'explore.n')).toBe(true);
    state.etherium.push('explore.n');
    expect(pageOpen(state, 'tasks')).toBe(true);
    expect(['tasks.n4', 'tasks.g2', 'tasks.p1'].every((id) => starOpen(state, id))).toBe(true);
    expect(starOpen(state, 'tasks.n5')).toBe(false);
    state.etherium.push('tasks.p1');
    expect(starOpen(state, 'tasks.p3')).toBe(false);
    state.etherium.push('tasks.p2');
    expect(starOpen(state, 'tasks.p3')).toBe(true);
  });
});

describe('Les sceaux des tâches', () => {
  it('tâches du jour faites 1, 10… 1 000 ; une seule fois : une, la moitié, toutes', () => {
    const state = withNorth();
    state.tasks.dailyDone = 50;
    for (let n = 1; n <= 10; n++) state.tasks.once[n] = { at: DAY, base: 0, done: DAY };
    checkSeals(state, DAY);
    expect(['dailyTasks-1', 'dailyTasks-10', 'dailyTasks-50', 'onceTasks-1', 'onceTasks-10'].every((id) => id in state.seals)).toBe(true);
    expect('dailyTasks-100' in state.seals || 'onceTasks-21' in state.seals).toBe(false);
  });
});

describe('Le Crayon', () => {
  it('se gagne avec « Fais 30 tâches du jour » : rangé, il agit s’il est le premier', () => {
    const state = withNorth(['tasks.p1']);
    state.tasks.once[15] = { at: DAY, base: 0, done: DAY };
    expect(takeOnce(state, 15)).toBe(true);
    expect(state.relics.found.pencil).toBeDefined();
    expect(state.relics.active).toBe('pencil');
  });

  it('raccourcit les nouvelles tâches du jour : −25 %, puis −35 % et −50 % avec ses étoiles', () => {
    const plain = withNorth();
    tickTasks(plain, 0.1, true, DAY, clicksOnly);
    const withPencil = withNorth();
    withPencil.relics.found.pencil = DAY;
    withPencil.relics.active = 'pencil';
    tickTasks(withPencil, 0.1, true, DAY, clicksOnly);
    const clicks = (state: typeof plain) => state.tasks.today.find((task) => task.kind === 'clicks')!.goal;
    expect(clicks(withPencil)).toBe(clicks(plain) * 0.75);
    withPencil.etherium.push('relics.p1', 'relics.p2');
    expect(relicTaskLength(withPencil)).toBe(0.5);
  });

  it('ne compte pas dans « Trouve les trois reliques »', () => {
    const state = withNorth();
    state.relics.found = { loupe: DAY, pencil: DAY };
    // Les tâches « une seule fois » se regardent au plus une fois par seconde.
    tickTasks(state, 0.1, true, DAY + 60_000);
    expect(onceCount(state, def(11))).toBe(1);
  });
});

describe('Les tampons', () => {
  it('une carte pleine (24 cases) est rangée, une neuve la remplace ; le solde continue', () => {
    const state = withNorth();
    for (let i = 0; i < 25; i++) addStamps(state, 2, DAY + i);
    expect(state.tasks.stamps.card).toBe(2);
    expect(state.tasks.stamps.cells).toEqual([{ at: DAY + 24, n: 2 }]);
    expect(state.tasks.stamps.balance).toBe(50);
    expect(state.tasks.stamps.earned).toBe(50);
  });

  it('une partie d’avant les tampons reçoit une fois ceux de ses tâches « une seule fois » prises', () => {
    const once = {
      2: { at: DAY, base: 0, done: DAY, taken: true },
      8: { at: DAY, base: 0, done: DAY, taken: true },
      9: { at: DAY, base: 0, done: DAY },
    };
    expect(payDoneTasks(once)).toEqual({ balance: 20, earned: 20, card: 1, cells: [] });
    expect(payDoneTasks(undefined).balance).toBe(0);
  });
});

describe('Les tâches par niveaux (29/10)', () => {
  it('les paliers validés : livres 4 104, 41 041, puis +41 041 ; Connaissance « 410… » ; nourrir 5', () => {
    expect([1, 2, 3, 4].map((level) => def(16).levels!(level))).toEqual([4_104, 41_041, 82_082, 123_123]);
    expect([1, 2, 3, 4, 5].map((level) => def(22).levels!(level))).toEqual([410, 410_410, 410_410_410, 4_104_104_104, 41_041_041_041]);
    expect(def(10).levels!(7)).toBe(5);
    expect(def(7).levels).toBeUndefined();
    expect(def(7).goal).toBe(410);
  });

  it('un niveau fait, pris : 5 × son niveau en tampons, et le suivant s’ouvre à zéro', () => {
    const state = withNorth();
    tickTasks(state, 0.1, true, DAY);
    state.stats.clicks = 10_000;
    tickTasks(state, 0.1, true, DAY + 2000);
    expect(takeOnce(state, 2, DAY + 3000)).toBe(true);
    expect(onceLevel(state, def(2))).toBe(2);
    expect(state.tasks.once[2].done).toBeUndefined();
    expect(onceCount(state, def(2))).toBe(0);
    state.stats.clicks = 20_000;
    tickTasks(state, 0.1, true, DAY + 5000);
    expect(takeOnce(state, 2, DAY + 6000)).toBe(true);
    expect(state.tasks.stamps.cells.map((cell) => cell.n)).toEqual([5, 10]);
    expect(onceLevel(state, def(2))).toBe(3);
    expect(levelsDone(state.tasks.once[2])).toBe(2);
  });

  it('le bonus pour toujours au niveau I seulement', () => {
    const state = withNorth();
    state.tasks.once[12] = { at: DAY, base: 0, done: DAY };
    takeOnce(state, 12, DAY);
    expect(state.tasks.bonus.knowledge).toBeCloseTo(0.05);
    state.tasks.once[12].done = DAY;
    takeOnce(state, 12, DAY);
    expect(state.tasks.bonus.knowledge).toBeCloseTo(0.05);
    expect(state.tasks.stamps.balance).toBe(5 + 10);
  });

  it('une partie d’avant les niveaux : une échelle prise ouvre son niveau II', () => {
    const state = withNorth();
    state.tasks.once[4] = { at: DAY, base: 0, done: DAY, taken: true };
    state.mimic.caught = 40;
    advanceOnce(state, DAY + 60_000);
    expect(onceLevel(state, def(4))).toBe(2);
    expect(onceCount(state, def(4))).toBe(0);
  });

  it('une échelle qui finit demande ce qui reste, puis s’arrête', () => {
    const state = withNorth();
    const left = 3;
    state.rareBooks = Object.fromEntries(RARE_BOOKS.slice(left).map((book) => [book.id, DAY])) as typeof state.rareBooks;
    advanceOnce(state, DAY + 60_000);
    expect(onceGoal(state, def(5))).toBe(left);
    for (const book of RARE_BOOKS.slice(0, left)) state.rareBooks[book.id] = DAY;
    advanceOnce(state, DAY + 120_000);
    expect(takeOnce(state, 5, DAY + 130_000)).toBe(true);
    expect(onceLevel(state, def(5))).toBe(1);
    expect(state.tasks.once[5].taken).toBe(true);
  });
});
