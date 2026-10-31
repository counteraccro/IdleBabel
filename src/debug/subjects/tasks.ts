import { TASK_STAR } from '../../data/tasks';
import { dailyLeft } from '../../systems/dailyTasks';
import { tasksOpen } from '../../systems/tasks';
import { addStamps } from '../../systems/stamps';
import { chips } from '../debugControls';
import type { DebugSubject } from './subject';

/** Les tâches (systems/tasks.ts) et leurs tampons (systems/stamps.ts) : ouvrir le Nord, finir les tâches du jour, des tampons. */
export const TASK_SUBJECT: DebugSubject = {
  id: 'resources:tasks',
  chapter: 'resources',
  name: 'Les tâches',
  description: 'Allumer le Nord, finir les tâches du jour, tamponner la carte de lecteur.',
  peek: (state) => `${state.tasks.stamps.balance} tampon(s), carte n° ${state.tasks.stamps.card}`,
  build: (kit, state) => {
    kit.row(
      'Le Nord',
      chips([['L’allumer', () => void (tasksOpen(state) || state.etherium.push(TASK_STAR.north))]]),
      'Les tâches apparaissent dans le livre blanc (partie V).',
    );
    kit.row(
      'Aujourd’hui',
      chips([
        [
          'Tout finir',
          () => {
            for (const task of state.tasks.today) if (task.done === undefined && task.goal > 0) task.base -= dailyLeft(state, task);
          },
        ],
        ['Demain', () => (state.tasks.day = null)],
      ]),
      '« Demain » efface les tâches du jour (leurs tampons pas pris sont donnés) et en tire d’autres.',
    );
    kit.row(
      'Tamponner',
      chips([
        ['+1', () => addStamps(state, 1, Date.now())],
        ['+15', () => addStamps(state, 15, Date.now())],
        [
          'Remplir la carte',
          () => {
            while (state.tasks.stamps.cells.length < 24) addStamps(state, 1 + (state.tasks.stamps.cells.length % 3), Date.now());
          },
        ],
      ]),
      'Un tampon dateur sur la carte, le solde monte.',
    );
    kit.number(
      'Solde',
      () => state.tasks.stamps.balance,
      (value) => (state.tasks.stamps.balance = value),
    );
  },
};
