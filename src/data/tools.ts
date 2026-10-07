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
}

/**
 * Âge Manuel : d'abord des techniques (le chercheur apprend à mieux lire), puis des objets (il
 * bricole de quoi lire davantage). Chacune se découvre en complétant sa phrase dans le livre blanc.
 * Cinq méthodes par Âge (décision de l'auteur, 05/10) : le Pouce, le Regard Large, le Double Feuilletage et le
 * Miroir retirés (core/removedMethods.ts). Chiffres provisoires, simulés pour garder le rythme du 04/10 : Doigt
 * vers 20 min, Voix vers 1 h 10, Lutrin vers 3 h 15, Échelle vers 14 h.
 */
export type ToolId = 'diagonal' | 'finger' | 'voice' | 'lectern' | 'ladder' | 'cornee';

export const COST_GROWTH = 1.15;

/** Combien de méthodes un clic achète (la marque sous la ruche) : « max », tout ce que les pages permettent. */
export const BUY_LOTS = [1, 10, 100, 'max'] as const;
export type BuyLot = (typeof BUY_LOTS)[number];

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'diagonal', baseCost: 15, pagesPerSecond: 0.1 },
  { id: 'finger', baseCost: 150, pagesPerSecond: 0.5 },
  { id: 'voice', baseCost: 8_000, pagesPerSecond: 15 },
  { id: 'lectern', baseCost: 4_000_000, pagesPerSecond: 2_000 },
  { id: 'ladder', baseCost: 60_000_000, pagesPerSecond: 22_000 },
  // La Page Cornée, méthode secrète de l'Âge Manuel (validée le 05/10 ; codée le 07/10) : l'étoile de départ de la
  // Ruche de l'Etherium en rend le souvenir flou, sa phrase la fait retrouver.
  { id: 'cornee', baseCost: 50_000, pagesPerSecond: 5_000, secret: true },
];

/** Les méthodes dans l'ordre où elles se découvrent : chacune attend la précédente (METHOD_GATE). */
export const METHOD_CHAIN: readonly ToolDefinition[] = TOOLS.filter((tool) => !tool.secret);
