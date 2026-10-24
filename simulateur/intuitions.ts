import { TECHNOLOGIES } from '../src/data/technologies';
import { EFFECT, S } from '../src/data/etheriumStars';
import type { Run } from './partie';
import { PLAYER } from './config';
import { lit, product } from './vie';

/**
 * Les intuitions de l'Âge Quantique (essai du 23/10, --intuitions-quantiques) : une par méthode, ×2 par niveau, 5 niveaux,
 * dans la suite de l'Âge Numérique (l'Algorithme de Babel commence à 51,2 M).
 */
const gesture = (first: number): number[] => [1, 2, 4, 8, 16].map((step) => first * step);
const QUANTUM_GESTURES = [
  { id: 'microscopeGesture', prices: gesture(102_400_000), tool: 'microscope' },
  { id: 'entangledGesture', prices: gesture(204_800_000), tool: 'entangled' },
  { id: 'teleportationGesture', prices: gesture(409_600_000), tool: 'teleportation' },
  { id: 'groverGesture', prices: gesture(819_200_000), tool: 'grover' },
  { id: 'quantumComputerGesture', prices: gesture(1_638_400_000), tool: 'quantumComputer' },
  // Le Qubit (--qubit) : celle des Livres Intriqués ×1,25, comme le Bit.
  ...(PLAYER.qubit ? [{ id: 'qubitGesture', prices: gesture(256_000_000), tool: 'qubit' }] : []),
];

/** Les intuitions du jeu (celles de l'Âge Numérique comprises), et celles de l'Âge Quantique à l'essai. */
const ALL: readonly { id: string; prices: readonly number[]; tool?: string; growth?: number }[] = [
  ...TECHNOLOGIES,
  ...(PLAYER.quantumGestures ? QUANTUM_GESTURES : []),
];

/** Celles qui changent le rythme de la partie ; le bot laisse les autres (Flair, Brassée, Réminiscence…). */
const USEFUL = [
  'semanticFilter',
  'ariadne',
  'sentenceMemory',
  'speedReading',
  'muscleMemory',
  'returnMap',
  'deepSleep',
  'bargain',
  // Celles de la lettre (le bot en attrape dès la première partie).
  'watch',
  'heldBreath',
  'letterUnderstood',
  'flock',
];

const priceAt = (id: string, level: number): number | undefined => {
  const tech = ALL.find((t) => t.id === id)!;
  const prices = tech.prices;
  if (level < prices.length) return prices[level];
  return tech.growth ? prices[prices.length - 1] * tech.growth ** (level - prices.length + 1) : undefined;
};

/** Le bot comprend l'intuition la moins chère qu'il peut s'offrir, tant qu'il peut (celle d'une méthode : une fois retrouvée). */
export const buyIntuitions = (run: Run): void => {
  const free = PLAYER.reminiscence === 'gratuite';
  // La Réminiscence gratuite : tout revient à son meilleur niveau (celle d'une méthode, une fois la méthode retrouvée).
  if (free && run.life.reminiscence)
    for (const tech of ALL)
      if ((!tech.tool || run.unlocked.has(tech.tool)) && (run.life.bestLevels[tech.id] ?? 0) > (run.levels[tech.id] ?? 0))
        run.levels[tech.id] = run.life.bestLevels[tech.id];
  // Le bot la comprend dès qu'il peut, après son premier prestige.
  const factor = product(run.life, EFFECT.intuitions);
  if (free && !run.life.reminiscence && run.life.prestiges > 0 && run.knowledge >= 10_000 * factor) {
    run.knowledge -= 10_000 * factor;
    run.life.reminiscence = true;
  }
  for (;;) {
    let cheapest: string | undefined;
    let cheapestPrice = Infinity;
    for (const tech of ALL) {
      const useful = tech.tool ? run.unlocked.has(tech.tool) : USEFUL.includes(tech.id);
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
