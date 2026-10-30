import type { Life } from './vie';

/**
 * Les tampons de la carte de lecteur (l'auteur, 30/10 ; .ai/plan-taches.md, « Le guichet et les tampons ») : ce que
 * rapportent les tâches, jour par jour, pour caler les prix du guichet. Chiffres proposés : tâche du jour = ce qu'elle vaut,
 * niveau n d'une échelle = 5 × n, tâche unique = 15, semaine = 2 tâches × 10 + 10 si toutes (le bot est supposé les faire
 * toutes : il joue sans cesse). Le bot n'achète rien.
 */

export const STAMPS = { level: 5, once: 15, weekly: 10, weeklyTasks: 2, perfectWeek: 10 } as const;

const WEEK = 7 * 86400;

/** Tampons gagnés, jour par jour (jour 0 : le premier). */
export const earnStamps = (life: Life, n: number): void => {
  const day = Math.floor(life.clock / 86400);
  life.stamps[day] = (life.stamps[day] ?? 0) + n;
};

/** Chaque semaine finie depuis le Nord (les tâches de la semaine apparaissent avec lui) : ses tampons. */
export const tickWeeks = (life: Life, northAt: number | undefined): void => {
  if (northAt === undefined) return;
  const weeks = Math.floor((life.clock - northAt) / WEEK);
  while (life.weeksPaid < weeks) {
    life.weeksPaid += 1;
    earnStamps(life, STAMPS.weeklyTasks * STAMPS.weekly + STAMPS.perfectWeek);
  }
};

/** Tampons gagnés en tout à la fin de chaque jour donné, et la moyenne par jour depuis le jour d'avant. */
export const stampsReport = (life: Life, days: readonly number[]): string => {
  let previous = 0;
  return days
    .map((day, i) => {
      const total = life.stamps.slice(0, day).reduce((sum, n) => sum + (n ?? 0), 0);
      const perDay = (total - previous) / (day - (days[i - 1] ?? 0));
      previous = total;
      return `${day} j : ${total} (${perDay.toFixed(1)}/j)`;
    })
    .join(' · ');
};
