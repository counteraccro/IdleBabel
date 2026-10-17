import {
  afterLit,
  CLOSED,
  EFFECT,
  ETHERIUM_PAGES,
  PAGE_NEEDS_DRAW,
  RELIC_BRANCH,
  S,
  STARS,
  neededFor,
  type PageId,
} from '../src/data/etheriumStars';
import { DIGITAL_AGE } from '../src/data/tools';
import { relicById } from '../src/data/relics';
import { PLAYER } from './config';
import { etherNeeded } from '../src/systems/etherium';
import { countLast, newTasks, openTaskStars, type Tasks } from './taches';

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
  /**
   * La Loterie (17/10) : les jetons lâchés par la Mimic (une part, comme ses prises), joués aussitôt par le bot ; quand le
   * premier l'a été (la page de la Loterie s'ouvre). Ses tirages ne changent pas la lecture dans le simulateur.
   */
  lottery: { tokens: number; draws: number; openedAt?: number };
  /** Les tâches (simulateur/taches.ts). */
  tasks: Tasks;
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
  lottery: { tokens: 0, draws: 0 },
  tasks: newTasks(),
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
 * son alvéole et la page du Minitel ; l'Est de l'Exploration, pour la Mimic ; 5 000 Éther reçus, pour l'Atlas ; un jeton
 * joué, pour la Loterie).
 */
const open = (life: Life): Buyable[] => [
  ...STARS.filter(
    (star) =>
      !life.stars.has(star.id) &&
      PLAYER.pages.includes(star.page) &&
      !CLOSED.has(star.id) &&
      afterLit(star, (id) => life.stars.has(id)) &&
      (!neededFor(star.id) || life.stars.has(neededFor(star.id)!)) &&
      (PLAYER.cornee || star.id !== S.cornee) &&
      (PLAYER.weight || star.page !== 'weight') &&
      (!PAGE_NEEDS_DRAW.has(star.page) || life.lottery.draws > 0) &&
      life.etherReceived >= etherNeeded(star.page),
  ),
  ...openTaskStars(life),
];

type Buyable = { id: string; cost: number };

/** Son prix ; l'Âge Numérique, celui qu'essaie le simulateur s'il en donne un (--numerique). */
const starCost = (star: Buyable): number => (star.id === DIGITAL_AGE && PLAYER.digitalAge > 0 ? PLAYER.digitalAge : star.cost);

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
    countLast(life, 'ether', starCost(star));
    life.tasks.boughtAt[star.id] = life.clock;
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
  ETHERIUM_PAGES.map(
    (page) =>
      `${page} ${STARS.filter((s) => s.page === page && life.stars.has(s.id)).length}/${STARS.filter((s) => s.page === page).length}`,
  ).join(', ');
