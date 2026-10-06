import { TECHNOLOGIES } from '../src/data/technologies';
import { EFFECT, S } from './etoiles';
import type { Run } from './partie';
import { lit, product } from './vie';

/** Celles qui changent le rythme de la partie ; le bot laisse les autres (Flair, Brassée, Réminiscence…). */
const USEFUL = ['semanticFilter', 'ariadne', 'sentenceMemory', 'speedReading', 'muscleMemory', 'returnMap', 'deepSleep', 'bargain'];

const priceAt = (id: string, level: number): number | undefined => {
  const tech = TECHNOLOGIES.find((t) => t.id === id)!;
  const prices: readonly number[] = tech.prices;
  if (level < prices.length) return prices[level];
  return 'growth' in tech ? prices[prices.length - 1] * tech.growth ** (level - prices.length + 1) : undefined;
};

/** Le bot comprend l'intuition la moins chère qu'il peut s'offrir, tant qu'il peut (celle d'une méthode : une fois retrouvée). */
export const buyIntuitions = (run: Run): void => {
  for (;;) {
    let cheapest: string | undefined;
    let cheapestPrice = Infinity;
    for (const tech of TECHNOLOGIES) {
      const useful = 'tool' in tech ? run.unlocked.has(tech.tool) : USEFUL.includes(tech.id);
      const base = useful ? priceAt(tech.id, run.levels[tech.id] ?? 0) : undefined;
      // La Chouette (−10 %, −25 %) ; l'Auriculaire : la Mémoire musculaire moitié prix.
      const cost = base && base * product(run.life, EFFECT.intuitions) * (tech.id === 'muscleMemory' && lit(run.life, S.pinky) ? 0.5 : 1);
      if (cost !== undefined && cost < cheapestPrice) [cheapest, cheapestPrice] = [tech.id, cost];
    }
    if (!cheapest || cheapestPrice > run.knowledge) return;
    run.knowledge -= cheapestPrice;
    run.levels[cheapest] = (run.levels[cheapest] ?? 0) + 1;
  }
};
