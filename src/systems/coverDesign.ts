import { LETTERS } from './babelText';
import { gameRandom, seeded } from '../core/random';
import { STRANGE_BOOK_INDEX, randomDigitText } from './strangeBook';

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
  /** Livre moderne : nom d'auteur (en symboles de Babel) et mise en page de la couverture. */
  author: string[];
  layout: number;
  /** Livre moderne : résumé au dos, et chiffres sous le code-barres. */
  blurb: string;
  barcode: string;
  /** Cote au dos : mur de l'hexagone, étagère, volume. */
  shelfMark: { wall: number; shelf: number; volume: number };
  /**
   * Titre sensé (rare) : un vrai mot glissé parmi les symboles, ou un titre entier.
   * `slot` : place du mot dans le titre ; `pick` (0 à 1) : choix dans la liste de la langue courante.
   */
  sense: { kind: 'none' | 'word' | 'title'; slot: number; pick: number };
  /** Le livre étrange (voir strangeBook.ts). */
  strange?: boolean;
  /** Un livre rare (data/rareBooks.ts) : son vrai titre sur la couverture. */
  rare?: string;
}

export const FRAME_COUNT = 4;
export const MODERN_LAYOUT_COUNT = 3;
export const ORNAMENT_COUNT = 4;
const MODERN_CHANCE = 1 / 12;
/** Provisoire, pour tester : sera équilibré plus tard. */
const WORD_CHANCE = 1 / 4;
const TITLE_CHANCE = 1 / 6;
/** Borges : quatre murs de livres par hexagone, cinq étagères par mur, trente-deux livres par étagère. */
const WALLS = 4;
const SHELVES = 5;
const VOLUMES = 32;

const between = (random: () => number, min: number, max: number): number => min + Math.floor(random() * (max - min + 1));

const word = (random: () => number): string =>
  Array.from({ length: between(random, 3, 8) }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');

const senseKind = (roll: number): CoverDesign['sense']['kind'] =>
  roll < TITLE_CHANCE ? 'title' : roll < TITLE_CHANCE + WORD_CHANCE ? 'word' : 'none';

export const coverDesign = (bookIndex: number): CoverDesign => {
  // Même numéro de livre, même couverture ; le livre étrange garde toujours la sienne.
  const random = bookIndex === STRANGE_BOOK_INDEX ? seeded(bookIndex) : gameRandom(`cover:${bookIndex}`, bookIndex);
  const title = Array.from({ length: between(random, 1, 3) }, () => word(random));
  const design: CoverDesign = {
    title,
    frame: Math.floor(random() * FRAME_COUNT),
    ornament: Math.floor(random() * ORNAMENT_COUNT),
    wear: random() ** 1.5,
    scuffs: Array.from({ length: between(random, 2, 5) }, () => ({ x: random(), y: random(), size: 0.08 + random() * 0.2 })),
    modern: random() < MODERN_CHANCE,
    shelfMark: { wall: between(random, 1, WALLS), shelf: between(random, 1, SHELVES), volume: between(random, 1, VOLUMES) },
    author: Array.from({ length: between(random, 1, 2) }, () => word(random)),
    layout: Math.floor(random() * MODERN_LAYOUT_COUNT),
    blurb: Array.from({ length: between(random, 28, 40) }, () => word(random)).join(' '),
    barcode: Array.from({ length: 13 }, () => Math.floor(random() * 10)).join(''),
    // Tiré en dernier : les couvertures déjà vues ne changent pas.
    sense: { kind: senseKind(random()), slot: Math.floor(random() * title.length), pick: random() },
  };
  return bookIndex === STRANGE_BOOK_INDEX ? strangeCover(design, random) : design;
};

/** Le livre étrange : titre doré en symboles de Babel, sans encadrement ; sa page de titre n'a que des chiffres. */
const strangeCover = (design: CoverDesign, random: () => number): CoverDesign => ({
  ...design,
  frame: 0,
  modern: false,
  strange: true,
  blurb: randomDigitText(40, random),
  sense: { kind: 'none', slot: 0, pick: 0 },
});

/** Couverture d'un livre rare : le cuir tiré de son numéro, son vrai titre, pas de livre moderne. */
export const rareCover = (design: CoverDesign, id: string): CoverDesign => ({
  ...design,
  rare: id,
  modern: false,
  sense: { kind: 'none', slot: 0, pick: 0 },
});

/** Chiffres romains, pour la cote gravée au dos. */
export const toRoman = (value: number): string => {
  const numerals: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
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

/** Cote de la Bibliothèque : mur · étagère · volume, en chiffres romains. */
export const shelfMarkText = ({ shelfMark: { wall, shelf, volume } }: CoverDesign): string =>
  `${toRoman(wall)} · ${toRoman(shelf)} · ${toRoman(volume)}`;
