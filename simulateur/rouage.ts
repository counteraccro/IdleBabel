import { STARS } from '../src/data/etheriumStars';
import { GEAR_AGES, GEAR_EVERY } from '../src/data/gear';
import { PLAYER } from './config';
import { BIT, QUBIT, SECRET, type Method } from './methodes';
import { allMethods, pagesPerSecond, price, rate, type Run } from './partie';

/**
 * Le Rouage (19/10, .ai/idee-rouage.md), avec les étoiles du jeu (page « gear » de data/etheriumStars.ts, data/gear.ts) :
 * ouvert par l'Âge Numérique, il achète seul les méthodes des Âges dont l'étoile est allumée, à sa cadence, la plus
 * rentable comme le bot (jamais une secrète), au lot du joueur (PLAYER.rouageLot), et rien pendant l'absence. Le bot
 * allume ses étoiles comme les autres (simulateur/vie.ts) ; --sans-rouage les lui retire.
 */
export const GEAR_STARS = STARS.filter((star) => star.page === 'gear');

/** Ce que le Rouage a acheté depuis toujours : ses achats, et les méthodes qu'ils ont pris. */
export const gearLog = { bought: 0, lots: 0 };
const clock = new WeakMap<Run, number>();

const coveredAges = (life: Run['life']): Set<string> =>
  new Set(
    Object.entries(GEAR_AGES)
      .filter(([id]) => life.stars.has(id))
      .map(([, age]) => age),
  );

const cadence = (life: Run['life']): number =>
  Math.min(
    ...Object.entries(GEAR_EVERY)
      .filter(([id]) => life.stars.has(id))
      .map(([, every]) => every),
  );

/**
 * Une fois : la méthode la plus rentable des Âges couverts, comme le bot (son prix sur ce qu'elle lit, plus l'attente pour
 * se l'offrir), au lot du joueur ; si elle n'est pas encore payable, il attend (19/10 : prendre la moins chère de celles
 * qu'il peut payer vidait les pages sur les vieilles méthodes, −45 % d'Éther). false s'il n'a rien pris.
 */
const buyOnce = (run: Run, ages: Set<string>): boolean => {
  const income = Math.max(pagesPerSecond(run), 1);
  let best: Method | undefined;
  let bestScore = Infinity;
  for (const method of allMethods(run)) {
    if (method === SECRET || method === BIT || method === QUBIT || !run.unlocked.has(method.id) || !ages.has(method.age ?? '')) continue;
    const cost = price(run, method);
    const score = cost / rate(run, method) + Math.max(0, cost - run.pages) / income;
    if (score < bestScore) [best, bestScore] = [method, score];
  }
  if (!best || price(run, best) > run.pages) return false;
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
  return true;
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
