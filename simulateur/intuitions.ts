import { TECHNOLOGIES } from '../src/data/technologies';
import type { Run } from './partie';

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
      const cost = useful ? priceAt(tech.id, run.levels[tech.id] ?? 0) : undefined;
      if (cost !== undefined && cost < cheapestPrice) [cheapest, cheapestPrice] = [tech.id, cost];
    }
    if (!cheapest || cheapestPrice > run.knowledge) return;
    run.knowledge -= cheapestPrice;
    run.levels[cheapest] = (run.levels[cheapest] ?? 0) + 1;
  }
};
