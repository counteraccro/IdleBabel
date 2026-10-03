/** Générateur pseudo-aléatoire à graine (mulberry32) : même graine, même suite. */
export const seeded = (seed: number): (() => number) => {
  // La graine est d'abord brassée : sans ça, deux graines voisines donneraient des suites presque identiques.
  let a = seed ^ 0x9e3779b9;
  a = Math.imul(a ^ (a >>> 16), 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  a = (a ^ (a >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Graine tirée d'un texte (un identifiant) : toujours la même pour le même texte. */
export const hashText = (text: string): number => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** La graine de la partie (GameState.seed), lue à chaque tirage : réglée au démarrage (main.ts). */
let gameSeed = (): number => 0;
export const readGameSeedWith = (seed: () => number): void => {
  gameSeed = seed;
};

/**
 * Un tirage du jeu, à partir d'une clé (« le livre n° N », « la page P du livre N ») : même graine, même clé,
 * même suite, quel que soit le chemin pris pour y arriver. Graine 0 (parties d'avant les graines) : le tirage
 * d'avant, `legacy` (la clé seule, par défaut), la Bibliothèque de toujours.
 */
export const gameRandom = (key: string, legacy = hashText(key)): (() => number) => {
  const seed = gameSeed();
  return seeded(seed ? hashText(`${seed}:${key}`) : legacy);
};

/** Une nouvelle graine (jamais 0, réservé aux parties d'avant les graines). */
export const newGameSeed = (): number => crypto.getRandomValues(new Uint32Array(1))[0] || 1;

/** La graine écrite comme dans le cahier (« 3F2A9C1B »), et relue (null : illisible). */
export const seedLabel = (seed: number): string => seed.toString(16).toUpperCase().padStart(8, '0');
export const parseSeed = (label: string): number | null => (/^[0-9a-f]{1,8}$/i.test(label) ? Number.parseInt(label, 16) : null);
