/**
 * Le rythme de la Connaissance (pour la Patience, data/technologies.ts) : ce que les trouvailles ont rapporté pendant la
 * dernière minute de jeu, clics compris. Rien de gardé dans la sauvegarde : au chargement, la mesure repart de zéro (et
 * l'absence, déjà comptée avant la boucle, ne la fausse pas).
 */

/** La fenêtre de la mesure, et ce qu'il faut au moins pour qu'elle dise quelque chose (en secondes de jeu). */
const WINDOW = 60;
const AT_LEAST = 5;

let found = 0;
let bucket = { seconds: 0, knowledge: 0 };
const samples: { seconds: number; knowledge: number }[] = [];

/** Une trouvaille a rapporté tant de Connaissance (systems/knowledge.ts, gainFind). */
export const noteKnowledge = (amount: number): void => {
  found += amount;
};

/** Un pas de la boucle (core/loop.ts) : `seconds` écoulées ; la mesure se range par seconde, sur la dernière minute. */
export const trackKnowledgePace = (seconds: number): void => {
  bucket.seconds += seconds;
  bucket.knowledge += found;
  found = 0;
  if (bucket.seconds < 1) return;
  samples.push(bucket);
  bucket = { seconds: 0, knowledge: 0 };
  let total = samples.reduce((sum, sample) => sum + sample.seconds, 0);
  while (samples.length > 1 && total - samples[0].seconds >= WINDOW) total -= samples.shift()!.seconds;
};

/** La Connaissance trouvée par seconde, en ce moment ; undefined tant que la mesure est trop courte. */
export const knowledgePace = (): number | undefined => {
  const seconds = samples.reduce((sum, sample) => sum + sample.seconds, 0);
  if (seconds < AT_LEAST) return undefined;
  return samples.reduce((sum, sample) => sum + sample.knowledge, 0) / seconds;
};

/** Tests : la mesure repart de zéro. */
export const resetKnowledgePace = (): void => {
  found = 0;
  bucket = { seconds: 0, knowledge: 0 };
  samples.length = 0;
};
