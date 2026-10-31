import { ONCE_TASKS, onceStamps } from '../data/tasks';
import type { OnceTask, StampsState } from './state';

/**
 * Les tampons, arrivés le 31/10/2026 à la place des jetons et des heures de lecture (.ai/plan-taches.md) : une partie
 * d'avant a déjà pris la récompense de certaines tâches « une seule fois ». Elle reçoit une fois leurs tampons (le
 * niveau I d'une échelle, 15 pour une tâche unique), sans tampon sur la carte : elle commence neuve.
 */
export const payDoneTasks = (once: Record<string, OnceTask> | undefined): StampsState => {
  const paid = ONCE_TASKS.filter((def) => once?.[def.n]?.taken).reduce((sum, def) => sum + onceStamps(def), 0);
  return { balance: paid, earned: paid, card: 1, cells: [] };
};
