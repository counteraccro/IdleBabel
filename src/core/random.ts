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
