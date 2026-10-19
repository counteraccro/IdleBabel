import { AUTOMATIC_AGE, DIGITAL_AGE } from '../src/data/tools';
import { PLAYER } from './config';
import { BIT, SECRET, type Method } from './methodes';
import type { Life } from './vie';
import { allMethods, price, rate, type Run } from './partie';

/**
 * Le Rouage (19/10, .ai/idee-rouage.md, maquette .ai/maquette-rouage.html), pas encore dans le jeu : une page de
 * l'Etherium, ouverte par l'Âge Numérique, qui achète seule les méthodes. L'axe : l'Âge Manuel, une méthode toutes les
 * 10 s ; les dents de gauche : les Âges suivants ; celles de droite : la cadence. Il achète la plus rentable (jamais une
 * secrète), au lot du joueur (PLAYER.rouageLot), et rien pendant l'absence.
 */
interface GearStar {
  id: string;
  after?: string;
  cost: number;
  /** L'Âge dont il achète les méthodes ('' : le Manuel). */
  age?: string;
  /** Secondes entre deux achats (0 : dès qu'il peut). */
  every?: number;
}

export const GEAR_STARS: GearStar[] = [
  { id: 'gear.c', cost: 20, age: '', every: 10 },
  { id: 'gear.a2', after: 'gear.c', cost: 30, age: AUTOMATIC_AGE },
  { id: 'gear.a3', after: 'gear.a2', cost: 120, age: DIGITAL_AGE },
  { id: 'gear.t1', after: 'gear.c', cost: 40, every: 5 },
  { id: 'gear.t2', after: 'gear.t1', cost: 100, every: 2 },
  { id: 'gear.t3', after: 'gear.t2', cost: 250, every: 1 },
  { id: 'gear.t4', after: 'gear.t3', cost: 600, every: 0 },
];

// --rouage=c:20,a2:30,… : d'autres prix, pour essayer.
const priceOption = process.argv.find((arg) => arg.startsWith('--rouage='))?.split('=')[1];
for (const part of priceOption?.split(',') ?? []) {
  const [id, cost] = part.split(':');
  const star = GEAR_STARS.find((s) => s.id === `gear.${id}`);
  if (star) star.cost = Number(cost);
}

/** Les étoiles du Rouage qu'on peut allumer : l'Âge Numérique acheté, l'étoile d'avant allumée. */
export const openGearStars = (life: Life): { id: string; cost: number }[] =>
  PLAYER.rouage && life.stars.has(DIGITAL_AGE)
    ? GEAR_STARS.filter((star) => !life.stars.has(star.id) && (!star.after || life.stars.has(star.after)))
    : [];

/** Ce que le Rouage a fait depuis toujours, et quand chaque étoile s'est allumée. */
export const gearLog = { bought: 0, lots: 0, hand: 0 };
const clock = new WeakMap<Run, number>();

const coveredAges = (life: Life): Set<string> =>
  new Set(GEAR_STARS.filter((star) => star.age !== undefined && life.stars.has(star.id)).map((star) => star.age!));

const cadence = (life: Life): number =>
  Math.min(...GEAR_STARS.filter((star) => star.every !== undefined && life.stars.has(star.id)).map((star) => star.every!));

/** Une fois : la méthode la plus rentable des Âges couverts (comme le bot), au lot du joueur ; false s'il n'a rien pu prendre. */
const buyOnce = (run: Run, ages: Set<string>): boolean => {
  let best: Method | undefined;
  let bestScore = Infinity;
  for (const method of allMethods(run)) {
    if (method === SECRET || method === BIT || !run.unlocked.has(method.id) || !ages.has(method.age ?? '')) continue;
    const cost = price(run, method);
    if (cost > run.pages) continue;
    const score = cost / rate(run, method);
    if (score < bestScore) [best, bestScore] = [method, score];
  }
  if (!best) return false;
  const lot = PLAYER.rouageLot;
  let count = 0;
  while ((lot === 'max' || count < lot) && price(run, best) <= run.pages) {
    run.pages -= price(run, best);
    run.owned[best.id] = (run.owned[best.id] ?? 0) + 1;
    run.firstBought[best.id] ??= run.t;
    count += 1;
  }
  gearLog.bought += count;
  gearLog.lots += 1;
  return count > 0;
};

/** Le Rouage tourne pendant `seconds` de jeu à l'écran. */
export const turnGear = (run: Run, seconds: number): void => {
  if (!run.life.stars.has('gear.c')) return;
  const ages = coveredAges(run.life);
  const every = cadence(run.life);
  if (every === 0) {
    while (buyOnce(run, ages));
    return;
  }
  let t = (clock.get(run) ?? 0) + seconds;
  while (t >= every) {
    t -= every;
    if (!buyOnce(run, ages)) {
      t = 0;
      break;
    }
  }
  clock.set(run, t);
};
