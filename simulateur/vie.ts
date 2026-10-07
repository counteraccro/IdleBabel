import { NEEDS_AGE, S, STARS, type PageId } from '../src/data/etheriumStars';
import { PLAYER } from './config';

/** Ce qui survit au prestige : les pages à vie, l'Éther, les étoiles allumées, la Page Cornée une fois retrouvée. */
export interface Life {
  pages: number;
  etherReceived: number;
  etherFree: number;
  stars: Set<string>;
  secretFound: boolean;
  /** Secondes écoulées depuis le début, absences comprises. */
  clock: number;
  /** La partie d'avant, pour la Porte : ses exemplaires, ses pages lues, sa Connaissance gagnée, ses intuitions. */
  previous: { owned: Record<string, number>; read: number; knowledge: number; levels: Record<string, number> };
}

export const newLife = (): Life => ({
  pages: 0,
  etherReceived: 0,
  etherFree: 0,
  stars: new Set(),
  secretFound: false,
  clock: 0,
  previous: { owned: {}, read: 0, knowledge: 0, levels: {} },
});

/** Conception §4.1 : floor(∛(pages à vie / 1 Md)), moins ce qui est déjà reçu. */
export const etherGain = (life: Life, runPages: number): number =>
  Math.floor(Math.cbrt((life.pages + runPages) / 1e9)) - life.etherReceived;

export const lit = (life: Life, id: string): boolean => life.stars.has(id);

/** Les facteurs des étoiles allumées, multipliés. */
export const product = (life: Life, effect: Record<string, number>): number =>
  Object.entries(effect).reduce((total, [id, factor]) => (life.stars.has(id) ? total * factor : total), 1);

/** Les valeurs des étoiles allumées, ajoutées. */
export const sum = (life: Life, effect: Record<string, number>): number =>
  Object.entries(effect).reduce((total, [id, value]) => (life.stars.has(id) ? total + value : total), 0);

/** Les étoiles qu'on peut allumer maintenant : leur étoile d'avant est allumée (et l'Âge, pour l'alvéole Automatique). */
const open = (life: Life) =>
  STARS.filter(
    (star) =>
      !life.stars.has(star.id) &&
      PLAYER.pages.includes(star.page) &&
      (!star.after || life.stars.has(star.after)) &&
      (!NEEDS_AGE.has(star.id) || life.stars.has(S.age)) &&
      (star.page !== 'ages' || star.id === S.age) &&
      (PLAYER.cornee || star.id !== S.cornee),
  );

/** Au réveil : le bot prend l'Âge Automatique d'abord, puis l'étoile la moins chère qu'il peut s'offrir, tant qu'il peut. */
export const spendEther = (life: Life): string[] => {
  const bought: string[] = [];
  for (;;) {
    const choices = open(life).sort((a, b) => Number(b.id === S.age) - Number(a.id === S.age) || a.cost - b.cost);
    const star = choices[0];
    if (!star || star.cost > life.etherFree) return bought;
    life.etherFree -= star.cost;
    life.stars.add(star.id);
    bought.push(star.id);
  }
};

/** Étoiles allumées sur chaque page. */
export const litPerPage = (life: Life): string =>
  (['reading', 'hands', 'knowledge', 'finds', 'away', 'start', 'memory', 'ages'] as PageId[])
    .map(
      (page) =>
        `${page} ${STARS.filter((s) => s.page === page && life.stars.has(s.id)).length}/${STARS.filter((s) => s.page === page).length}`,
    )
    .join(', ');
