import { afterLit, CLOSED, EFFECT, RELIC_BRANCH, S, STARS, neededFor, type PageId } from '../src/data/etheriumStars';
import { relicById } from '../src/data/relics';
import { DIGITAL_STARS, PLAYER, WEIGHT_STARS } from './config';

/** Ce qui survit au prestige : les pages à vie, l'Éther, les étoiles allumées, la Page Cornée une fois retrouvée. */
export interface Life {
  pages: number;
  etherReceived: number;
  etherFree: number;
  stars: Set<string>;
  secretFound: boolean;
  /** Le Bit, une fois retrouvé (comme la Page Cornée). */
  bitFound: boolean;
  /** Secondes écoulées depuis le début, absences comprises. */
  clock: number;
  prestiges: number;
  /** Ce que comptent les sceaux, depuis toujours : clics, pages lues à la main et par les méthodes, meilleure vitesse,
   * pages tournées, trouvailles, Connaissance. */
  clicks: number;
  handPages: number;
  methodPages: number;
  bestSpeed: number;
  turned: number;
  finds: number;
  knowledge: number;
  seals: Set<string>;
  /** La partie d'avant, pour la Porte : ses exemplaires, ses pages lues, sa Connaissance gagnée, ses intuitions. */
  previous: { owned: Record<string, number>; read: number; knowledge: number; levels: Record<string, number> };
  /** Les reliques trouvées (pour toujours) et celle qui agit. */
  relics: Set<string>;
  relic: string | null;
  /** Changements de relique (ses sceaux). */
  relicChanges: number;
  /** La Mimic, depuis toujours (ses sceaux) : attrapées, connaissances rendues en plus, secondes à manger. */
  mimic: { caught: number; bonus: number; seconds: number };
}

export const newLife = (): Life => ({
  pages: 0,
  etherReceived: 0,
  etherFree: 0,
  stars: new Set(),
  secretFound: false,
  bitFound: false,
  clock: 0,
  prestiges: 0,
  clicks: 0,
  handPages: 0,
  methodPages: 0,
  bestSpeed: 0,
  turned: 0,
  finds: 0,
  knowledge: 0,
  seals: new Set(),
  previous: { owned: {}, read: 0, knowledge: 0, levels: {} },
  relics: new Set(),
  relic: null,
  relicChanges: 0,
  mimic: { caught: 0, bonus: 0, seconds: 0 },
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

/**
 * Les étoiles qu'on peut allumer maintenant, comme en jeu : pas fermées, leur étoile d'avant est allumée (et l'Âge, pour
 * l'alvéole Automatique ; l'Est de l'Exploration, pour la Mimic).
 */
const open = (life: Life): Buyable[] => [
  ...STARS.filter(
    (star) =>
      !life.stars.has(star.id) &&
      PLAYER.pages.includes(star.page) &&
      (!CLOSED.has(star.id) || (star.id === 'ages.quantum' && PLAYER.digitalAge > 0 && life.stars.has(S.age))) &&
      afterLit(star, (id) => life.stars.has(id)) &&
      (!neededFor(star.id) || life.stars.has(neededFor(star.id)!)) &&
      (PLAYER.cornee || star.id !== S.cornee),
  ),
  // Celles qui allègent le poids de la Bibliothèque (--poids).
  ...(PLAYER.weight
    ? WEIGHT_STARS.filter((star) => !life.stars.has(star.id) && (!star.after || life.stars.has(star.after)))
    : []),
  // Celles de l'Âge Numérique (proposées : simulateur/config.ts), une fois l'Âge acheté.
  ...(life.stars.has('ages.quantum')
    ? DIGITAL_STARS.filter((star) => !life.stars.has(star.id) && (!star.after || life.stars.has(star.after)))
    : []),
];

type Buyable = { id: string; cost: number };

/** Son prix ; l'Âge Numérique, celui qu'essaie le simulateur (PLAYER.digitalAge). */
const starCost = (star: Buyable): number => (star.id === 'ages.quantum' ? PLAYER.digitalAge : star.cost);

/** Au réveil : le bot prend l'Âge Automatique d'abord, puis l'étoile la moins chère qu'il peut s'offrir, tant qu'il peut. */
export const spendEther = (life: Life): string[] => {
  const bought: string[] = [];
  for (;;) {
    const choices = open(life).sort((a, b) => Number(b.id === S.age) - Number(a.id === S.age) || starCost(a) - starCost(b));
    const star = choices[0];
    if (!star || starCost(star) > life.etherFree) {
      takeRelics(life);
      return bought;
    }
    life.etherFree -= starCost(star);
    life.stars.add(star.id);
    bought.push(star.id);
  }
};

/**
 * Les reliques (12/10) : l'Ouest allumé, le bot trouve vite la phrase et la relique des salles qu'il a vues (la Loupe au
 * désert ; l'Astrolabe, la nuit, avec l'Âge Automatique ; le Sablier attend le 3e Âge). Il pose l'Astrolabe s'il attrape
 * des lettres, sinon la Loupe.
 */
export const takeRelics = (life: Life): void => {
  if (!life.stars.has(S.relics)) return;
  life.relics.add('loupe');
  if (life.stars.has(S.age)) life.relics.add('astrolabe');
  const relic = life.relics.has('astrolabe') && PLAYER.letters > 0 ? 'astrolabe' : 'loupe';
  if (life.relic !== null && life.relic !== relic) life.relicChanges += 1;
  life.relic = relic;
};

/** Ce que donne la relique `id` si elle agit (au niveau de ses étoiles) ; sinon `none`. */
export const relicBonus = (life: Life, id: string, none: number): number => {
  if (life.relic !== id) return none;
  const level = Math.max(
    0,
    ...Object.entries(EFFECT.relicLevel).map(([star, value]) =>
      star.startsWith(`relics.${RELIC_BRANCH[id]}`) && life.stars.has(star) ? value : 0,
    ),
  );
  return relicById(id)!.bonus[level];
};

/** Étoiles allumées sur chaque page. */
export const litPerPage = (life: Life): string =>
  (['reading', 'hands', 'knowledge', 'finds', 'away', 'start', 'memory', 'quill', 'ages', 'explore', 'mimic', 'relics'] as PageId[])
    .map(
      (page) =>
        `${page} ${STARS.filter((s) => s.page === page && life.stars.has(s.id)).length}/${STARS.filter((s) => s.page === page).length}`,
    )
    .concat(
      PLAYER.digitalAge > 0
        ? [`numérique ${DIGITAL_STARS.filter((s) => life.stars.has(s.id)).length}/${DIGITAL_STARS.length}`]
        : [],
    )
    .concat(PLAYER.weight ? [`poids ${WEIGHT_STARS.filter((s) => life.stars.has(s.id)).length}/${WEIGHT_STARS.length}`] : [])
    .join(', ');
