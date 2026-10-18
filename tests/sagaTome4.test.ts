import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { S } from '../src/data/etheriumStars';
import { TOME_BRIBE_PAGES } from '../src/data/trueStory';
import { LAST_TASK, ONCE_TASKS, TASK_STAR } from '../src/data/tasks';
import { advanceOnce, onceCount } from '../src/systems/onceTasks';
import { takeOnce, taskWaiting } from '../src/systems/tasks';
import { findKnowledge } from '../src/systems/knowledge';
import { nextTome, tomeFound } from '../src/systems/endings';
import { SEALS } from '../src/data/seals';
import { hintSeal } from '../src/data/anomalies';
import { hintFindable } from '../src/systems/findable';
import { checkSeals } from '../src/systems/seals';
import whiteFr from '../src/i18n/fr/whiteBook.json';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import uiFr from '../src/i18n/fr/ui.json';
import uiEn from '../src/i18n/en/ui.json';

vi.stubGlobal('window', new EventTarget());

const DAY = new Date(2026, 9, 18, 12).getTime();
const road = ONCE_TASKS.find((task) => task.n === 21)!;

/** Une partie au Cadran solaire, l'étoile « Une dernière pour la route » allumée, le tome 1 acheté. */
const onTheRoad = () => {
  const state = createInitialState('fr', DAY);
  state.etherium.push('explore.n', 'tasks.p1', 'tasks.p2', TASK_STAR.last, S.trueStory);
  state.etherReceived = 20_000;
  state.ether = 19_000;
  advanceOnce(state, DAY);
  return state;
};

/** Les trois buts atteints, depuis l'apparition de la tâche. */
const reachAll = (state: ReturnType<typeof onTheRoad>) => {
  state.ether -= LAST_TASK.ether;
  state.totalPagesRead += LAST_TASK.pages;
  state.lifetimeKnowledge += LAST_TASK.knowledge;
};

describe('« Dedans », le tome 4, et « Une dernière pour la route » (18/10)', () => {
  it('neuf bribes, la dernière à la page 410, dans chaque langue ; sa dédicace', () => {
    expect(TOME_BRIBE_PAGES[3]).toHaveLength(9);
    expect(TOME_BRIBE_PAGES[3].at(-1)).toBe(410);
    for (const texts of [fr, en]) expect(texts.trueStory.tomes[2]).toHaveLength(9);
    for (const ui of [uiFr, uiEn]) expect(ui.endings.dedications[3]).toBeTruthy();
  });

  it('ses trois buts comptent depuis son apparition ; la liste ne dit pas ce qu’elle donne', () => {
    const state = onTheRoad();
    expect(state.tasks.once[21]?.bases).toEqual([1000, state.totalPagesRead, state.lifetimeKnowledge]);
    expect(road.reward).toEqual({ tome: true });
    expect(whiteFr.tasks.rewards.unknown).toBe('?');
    state.ether -= LAST_TASK.ether;
    expect(onceCount(state, road)).toBe(1);
    state.totalPagesRead += LAST_TASK.pages;
    expect(onceCount(state, road)).toBe(2);
    state.lifetimeKnowledge += LAST_TASK.knowledge - 1;
    advanceOnce(state, DAY);
    expect(state.tasks.once[21].done).toBeUndefined();
    state.lifetimeKnowledge += 1;
    advanceOnce(state, DAY);
    expect(state.tasks.once[21].done).toBe(DAY);
  });

  it('elle donne le tome suivant, qui fait trouver 15 % de Connaissance de plus', () => {
    const state = onTheRoad();
    state.sagaTomes = [2, 3];
    const before = findKnowledge(state);
    reachAll(state);
    advanceOnce(state, DAY);
    expect(taskWaiting(state)).toBe(true);
    expect(takeOnce(state, 21)).toBe(true);
    expect(tomeFound(state, 3)).toBe(true);
    expect(state.tomeToShow).toBe(3);
    expect(state.tomeFrom).toEqual({ task: 4 });
    expect(findKnowledge(state)).toBe(Math.ceil(before * 1.15));
  });

  it('sans tome à gagner, sa récompense attend', () => {
    const state = onTheRoad();
    state.etherium = state.etherium.filter((id) => id !== S.trueStory);
    reachAll(state);
    advanceOnce(state, DAY);
    expect(state.tasks.once[21].done).toBe(DAY);
    expect(nextTome(state)).toBeUndefined();
    expect(taskWaiting(state)).toBe(false);
    expect(takeOnce(state, 21)).toBe(false);
    state.etherium.push(S.trueStory);
    expect(takeOnce(state, 21)).toBe(true);
    // Toujours le suivant : ici, le tome 2.
    expect(state.tomeFrom).toEqual({ task: 2 });
  });

  it('le sceau de la tâche, nommé d’après son premier tome ; son indice attend son étoile et le tome 1', () => {
    const state = onTheRoad();
    const seal = SEALS.find((one) => one.id === 'tomeTask')!;
    expect(seal.tomeFrom).toBe('task');
    expect(hintSeal('hintTomeTask')).toBe('tomeTask');
    expect(hintFindable(state, 'hintTomeTask')).toBe(true);
    state.etherium = state.etherium.filter((id) => id !== TASK_STAR.last);
    expect(hintFindable(state, 'hintTomeTask')).toBe(false);
    state.etherium.push(TASK_STAR.last);
    reachAll(state);
    advanceOnce(state, DAY);
    takeOnce(state, 21);
    checkSeals(state, DAY);
    expect('tomeTask' in state.seals).toBe(true);
  });
});
