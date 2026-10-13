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
  'diagonal' | 'finger' | 'voice' | 'lectern' | 'ladder' | 'cornee' | 'metronome' | 'wheel' | 'lift' | 'automaton' | 'clock';

/** L'étoile de l'Etherium qui achète l'Âge Automatique (data/etheriumStars.ts, S.age). */
export const AUTOMATIC_AGE = 'ages.auto';

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
];

/**
 * Les méthodes dans l'ordre où elles se découvrent : chacune attend la précédente (METHOD_GATE), sauf la première
 * d'un Âge, qui n'attend que la phrase de la dernière de l'Âge d'avant (l'Âge acheté suffit).
 */
export const METHOD_CHAIN: readonly ToolDefinition[] = TOOLS.filter((tool) => !tool.secret);
