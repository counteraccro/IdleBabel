import { messages } from '../i18n';

/**
 * Simulation provisoire : une page sur 8 contient une phrase sensée.
 * Plus tard, les fragments suivront la Connaissance trouvée (conception §8).
 */
const FRAGMENT_CHANCE = 1 / 8;

export const rollFragment = (random: () => number = Math.random): string | undefined => {
  if (random() >= FRAGMENT_CHANCE) return undefined;
  const samples = messages().fragments.samples;
  return samples[Math.floor(random() * samples.length)];
};
