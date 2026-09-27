import { LETTERS } from './babelText';

/** Couverture d'un livre de la Bibliothèque, tirée de son numéro : toujours la même pour un livre donné. */
export interface CoverDesign {
  /** Titre doré : des « mots » en symboles de Babel, qui ne disent rien du contenu (Borges). */
  title: string[];
  /** Modèle d'encadrement (0 : aucun) et de fleuron. */
  frame: number;
  ornament: number;
  /** Usure du cuir, de 0 (neuf) à 1 (des siècles de mains). */
  wear: number;
  /** Taches et éraflures : positions en fraction de la couverture. */
  scuffs: { x: number; y: number; size: number }[];
  /** Parfois, un livre qui semble moderne : la Bibliothèque contient tous les livres possibles. */
  modern: boolean;
  /** Cote au dos : mur de l'hexagone, étagère, volume. */
  shelfMark: { wall: number; shelf: number; volume: number };
}

export const FRAME_COUNT = 4;
export const ORNAMENT_COUNT = 4;
const MODERN_CHANCE = 1 / 12;
/** Borges : quatre murs de livres par hexagone, cinq étagères par mur, trente-deux livres par étagère. */
const WALLS = 4;
const SHELVES = 5;
const VOLUMES = 32;

/** Générateur pseudo-aléatoire à graine (mulberry32) : même numéro de livre, même couverture. */
const seeded = (seed: number): (() => number) => {
  // Le numéro est d'abord brassé : sans ça, deux livres voisins auraient des couvertures presque identiques.
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

const between = (random: () => number, min: number, max: number): number => min + Math.floor(random() * (max - min + 1));

const word = (random: () => number): string =>
  Array.from({ length: between(random, 3, 8) }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');

export const coverDesign = (bookIndex: number): CoverDesign => {
  const random = seeded(bookIndex);
  return {
    title: Array.from({ length: between(random, 1, 3) }, () => word(random)),
    frame: Math.floor(random() * FRAME_COUNT),
    ornament: Math.floor(random() * ORNAMENT_COUNT),
    wear: random() ** 1.5,
    scuffs: Array.from({ length: between(random, 2, 5) }, () => ({ x: random(), y: random(), size: 0.08 + random() * 0.2 })),
    modern: random() < MODERN_CHANCE,
    shelfMark: { wall: between(random, 1, WALLS), shelf: between(random, 1, SHELVES), volume: between(random, 1, VOLUMES) },
  };
};

/** Chiffres romains, pour la cote gravée au dos. */
export const toRoman = (value: number): string => {
  const numerals: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = value;
  let result = '';
  for (const [amount, numeral] of numerals) {
    while (rest >= amount) {
      result += numeral;
      rest -= amount;
    }
  }
  return result;
};
