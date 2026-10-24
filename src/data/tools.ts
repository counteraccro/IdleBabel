/** Outils répétables : chiffres uniquement, les textes sont dans i18n/<langue>/tools.json. */
export interface ToolDefinition {
  id: ToolId;
  baseCost: number;
  pagesPerSecond: number;
  /**
   * La méthode secrète de l'Âge (conception §4.3) : hors de la chaîne des méthodes (elle n'attend pas la méthode
   * d'avant, et la suivante ne l'attend pas), dernière de la ruche.
   */
  secret?: boolean;
  /**
   * L'Âge où elle se découvre (conception §3.0) : rien, l'Âge Manuel ; sinon l'étoile de l'Etherium qui achète cet
   * Âge. Avant, ni sa page du livre blanc ni son sceau dans la ruche.
   */
  age?: string;
}

/**
 * Âge Manuel : d'abord des techniques (le chercheur apprend à mieux lire), puis des objets (il
 * bricole de quoi lire davantage). Chacune se découvre en complétant sa phrase dans le livre blanc.
 * Cinq méthodes par Âge (décision de l'auteur, 05/10) : le Pouce, le Regard Large, le Double Feuilletage et le
 * Miroir retirés (core/removedMethods.ts). Simulés (13/10, 1re partie) : Doigt vers 15 min, Voix vers 1 h, Lutrin vers
 * 3 h, Échelle vers 9 h.
 */
export type ToolId =
  | 'diagonal'
  | 'finger'
  | 'voice'
  | 'lectern'
  | 'ladder'
  | 'cornee'
  | 'metronome'
  | 'wheel'
  | 'lift'
  | 'automaton'
  | 'clock'
  | 'minitel'
  | 'computer'
  | 'search'
  | 'crawler'
  | 'algorithm'
  | 'bit'
  | 'microscope'
  | 'entangled'
  | 'teleportation'
  | 'grover'
  | 'quantumComputer'
  | 'qubit';

/** L'étoile de l'Etherium qui achète l'Âge Automatique (data/etheriumStars.ts, S.age). */
export const AUTOMATIC_AGE = 'ages.auto';
/** L'étoile qui achète l'Âge Numérique (l'Âge Quantique jusqu'au 13/10 : l'id est resté). */
export const DIGITAL_AGE = 'ages.quantum';
/** L'étoile qui achète l'Âge Quantique (23/10 : 'ages.quantum' est déjà l'Âge Numérique). */
export const QUANTUM_AGE = 'ages.quantic';

/** Les Âges, dans l'ordre (aucun : l'Âge Manuel), et le nom de leur sous-partie du livre blanc (whiteBook.parts). */
export const AGES = [undefined, AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE] as const;
/** Un Âge de plus dans AGES sans sa sous-partie ne compile pas (revue de l'Alpha 3, 24/10). */
const AGE_PARTS: Readonly<Record<NonNullable<(typeof AGES)[number]>, string>> = {
  [AUTOMATIC_AGE]: 'automaticAge',
  [DIGITAL_AGE]: 'digitalAge',
  [QUANTUM_AGE]: 'quantumAge',
};
/** La sous-partie d'un Âge (`age` d'une méthode : aucun pour l'Âge Manuel) : « manualAge », « digitalAge »… */
export const agePart = (age: string | undefined): string => {
  if (age === undefined) return 'manualAge';
  const part = (AGE_PARTS as Readonly<Record<string, string>>)[age];
  if (part === undefined) throw new Error(`Âge sans sous-partie : ${age}`);
  return part;
};

export const COST_GROWTH = 1.15;

/** Combien de méthodes un clic achète (la marque sous la ruche) : « max », tout ce que les pages permettent. */
export const BUY_LOTS = [1, 10, 100, 'max'] as const;
export type BuyLot = (typeof BUY_LOTS)[number];

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'diagonal', baseCost: 15, pagesPerSecond: 0.1 },
  { id: 'finger', baseCost: 150, pagesPerSecond: 0.5 },
  // La Voix et le Lutrin resserrés (l'auteur, 13/10 : « un énorme écart entre la Voix éteinte et le Lutrin ») : 25 Voix
  // coûtaient plus que la moitié d'un Lutrin. Avant : 8 000 pour 15 /s, 4 M pour 2 000 /s.
  { id: 'voice', baseCost: 3_000, pagesPerSecond: 8 },
  { id: 'lectern', baseCost: 800_000, pagesPerSecond: 650 },
  { id: 'ladder', baseCost: 60_000_000, pagesPerSecond: 22_000 },
  // La Page Cornée, méthode secrète de l'Âge Manuel (validée le 05/10 ; codée le 07/10) : l'étoile de départ de la
  // Ruche de l'Etherium en rend le souvenir flou, sa phrase la fait retrouver.
  { id: 'cornee', baseCost: 50_000, pagesPerSecond: 5_000, secret: true },
  // L'Âge Automatique (conception §3.1 ter ; méthodes et prix choisis le 07/10, simulés : jeu « D ») : des mécanismes
  // qui lisent pour le chercheur, du plus petit à la galerie entière. Lecture divisée par deux le 13/10 (l'auteur : des
  // centaines d'Éther par prestige dans cet Âge, pas des milliers ; simulé : 5 800 Éther en 30 jours au lieu de 36 000).
  { id: 'metronome', baseCost: 250_000_000, pagesPerSecond: 50_000, age: AUTOMATIC_AGE },
  { id: 'wheel', baseCost: 4e9, pagesPerSecond: 500_000, age: AUTOMATIC_AGE },
  { id: 'lift', baseCost: 80e9, pagesPerSecond: 6_000_000, age: AUTOMATIC_AGE },
  { id: 'automaton', baseCost: 1.5e12, pagesPerSecond: 75_000_000, age: AUTOMATIC_AGE },
  { id: 'clock', baseCost: 30e12, pagesPerSecond: 1e9, age: AUTOMATIC_AGE },
  // L'Âge Numérique (méthodes choisies par l'auteur le 13/10 ; prix et lectures : essai C du simulateur, validé) : des
  // machines que le chercheur décrit sans les connaître. Lecture au plus ×100 l'Horloge, prix ×8 d'une méthode à l'autre.
  { id: 'minitel', baseCost: 6e15, pagesPerSecond: 2.5e9, age: DIGITAL_AGE },
  { id: 'computer', baseCost: 5e16, pagesPerSecond: 6e9, age: DIGITAL_AGE },
  { id: 'search', baseCost: 4e17, pagesPerSecond: 1.5e10, age: DIGITAL_AGE },
  { id: 'crawler', baseCost: 3.2e18, pagesPerSecond: 4e10, age: DIGITAL_AGE },
  { id: 'algorithm', baseCost: 2.5e19, pagesPerSecond: 1e11, age: DIGITAL_AGE },
  // Le Bit, méthode secrète de l'Âge Numérique (validé le 13/10, sur le modèle de la Page Cornée : prix entre la 2e et la
  // 3e méthode, lecture entre la 4e et la 5e) ; son étoile, la 1re de l'alvéole Numérique de la Ruche.
  { id: 'bit', baseCost: 2.56e17, pagesPerSecond: 6.4e10, secret: true, age: DIGITAL_AGE },
  // L'Âge Quantique (méthodes choisies par l'auteur le 23/10 ; prix et lectures : essai 4 du simulateur, validé le 24/10) :
  // des machines qu'on ne peut pas regarder lire. Prix ×8 d'une méthode à l'autre, lecture ~×2,7 : plus lentes exprès.
  { id: 'microscope', baseCost: 5e21, pagesPerSecond: 6.7e13, age: QUANTUM_AGE },
  { id: 'entangled', baseCost: 4e22, pagesPerSecond: 1.8e14, age: QUANTUM_AGE },
  { id: 'teleportation', baseCost: 3.2e23, pagesPerSecond: 4.8e14, age: QUANTUM_AGE },
  { id: 'grover', baseCost: 2.5e24, pagesPerSecond: 1.25e15, age: QUANTUM_AGE },
  { id: 'quantumComputer', baseCost: 2e25, pagesPerSecond: 3.3e15, age: QUANTUM_AGE },
  // Le Qubit, méthode secrète de l'Âge Quantique (validé le 24/10, essai 13 : rentabilité entre la Téléportation et Grover) ;
  // son étoile, la puce du Lustre (chandelier.chip, dans la page de l'Âge).
  { id: 'qubit', baseCost: 2.048e24, pagesPerSecond: 2e15, secret: true, age: QUANTUM_AGE },
];

/**
 * Les méthodes dans l'ordre où elles se découvrent : chacune attend la précédente (METHOD_GATE), sauf la première
 * d'un Âge, qui n'attend que la phrase de la dernière de l'Âge d'avant (l'Âge acheté suffit).
 */
export const METHOD_CHAIN: readonly ToolDefinition[] = TOOLS.filter((tool) => !tool.secret);
