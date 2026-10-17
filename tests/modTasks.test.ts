import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { clearHooks, registerHook } from '../src/mods/hooks';
import { clearMods, registerMod, startLoading } from '../src/mods/registry';
import { addModTask, clearModTasks, modTaskCount, modTasks, takeModTask } from '../src/mods/modTasks';
import { removeMod } from '../src/mods/loader';
import { modGame } from '../src/mods/game';
import { tickTasks, taskWaiting } from '../src/systems/tasks';
import { checkSeals } from '../src/systems/seals';

vi.stubGlobal('window', new EventTarget());

afterEach(() => {
  clearHooks();
  clearMods();
  clearModTasks();
});

/** Une partie qui a allumé le Nord. */
const withNorth = () => {
  const state = createInitialState('fr');
  state.etherium.push('explore.n');
  return state;
};

/** Les tâches « une seule fois » (et celles des mods) se regardent au plus une fois par seconde : un pas plus tard. */
let clock = Date.now() + 10_000;
const step = (state: ReturnType<typeof withNorth>) => tickTasks(state, 0.1, true, (clock += 2000));

describe('Les tâches des mods', () => {
  it('refusent ce qui est mal formé, ou déjà là', () => {
    const task = { id: 'cent', text: 'Lis 100 livres', reward: '1 h', goal: 100, progress: () => 0 };
    expect(addModTask('m', task)).toBe(true);
    expect(addModTask('m', task)).toBe(false);
    expect(addModTask('m', { ...task, id: 'zero', goal: 0 })).toBe(false);
    expect(addModTask('m', { ...task, id: 'sans', progress: undefined as never })).toBe(false);
    expect(addModTask('m', { ...task, id: 'texte', text: 3 as never })).toBe(false);
    expect(modTasks().map((one) => one.key)).toEqual(['mod:m:cent']);
  });

  it('se font quand leur but est atteint (le Nord allumé), puis leur récompense se prend une fois', () => {
    const state = withNorth();
    let books = 0;
    const give = vi.fn();
    const done = vi.fn();
    registerHook('task', done);
    addModTask('m', { id: 'livres', text: { fr: 'Lis 3 livres', en: 'Read 3 books' }, reward: '?', goal: 3, progress: () => books, give });
    step(state);
    expect(state.tasks.mods).toEqual({});
    books = 3;
    step(state);
    expect(state.tasks.mods['mod:m:livres'].done).toBeDefined();
    expect(done).toHaveBeenCalledWith({ kind: 'mod', id: 'mod:m:livres' });
    expect(taskWaiting(state)).toBe(true);
    expect(takeModTask(state, 'mod:m:livres')).toBe(true);
    expect(takeModTask(state, 'mod:m:livres')).toBe(false);
    expect(give).toHaveBeenCalledTimes(1);
    expect(taskWaiting(state)).toBe(false);
  });

  it('ne comptent pas dans le jeu, et une erreur du mod ne casse rien', () => {
    const state = withNorth();
    addModTask('m', {
      id: 'casse',
      text: 'x',
      reward: 'y',
      goal: 1,
      progress: () => {
        throw new Error('non');
      },
    });
    addModTask('m', { id: 'faite', text: 'x', reward: 'y', goal: 1, progress: () => 1 });
    step(state);
    expect(modTaskCount(state, modTasks()[0])).toBe(0);
    expect(state.tasks.dailyDone).toBe(0);
    expect(Object.keys(state.tasks.once)).not.toContain('mod:m:faite');
    checkSeals(state);
    expect(Object.keys(state.seals).filter((id) => id.startsWith('onceTasks'))).toEqual([]);
    const read = modGame(state).tasks();
    expect(read.mods.map((task) => [task.id, task.done])).toEqual([
      ['mod:m:casse', false],
      ['mod:m:faite', true],
    ]);
  });

  it('n’existent pas sans le Nord', () => {
    const state = createInitialState('fr');
    addModTask('m', { id: 'faite', text: 'x', reward: 'y', goal: 1, progress: () => 1 });
    step(state);
    expect(state.tasks.mods).toEqual({});
    expect(modGame(state).tasks().open).toBe(false);
  });

  it('s’effacent quand le mod est supprimé', () => {
    const state = withNorth();
    state.mods = ['mods/m/m.js'];
    startLoading('mods/m/m.js');
    registerMod(state, 'm', {});
    startLoading(null);
    state.tasks.mods = { 'mod:m:faite': { done: 1 }, 'mod:autre:faite': { done: 1 } };
    removeMod(state, 'mods/m/m.js');
    expect(Object.keys(state.tasks.mods)).toEqual(['mod:autre:faite']);
  });
});
