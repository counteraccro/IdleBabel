/** Outils répétables : chiffres uniquement, les textes sont dans i18n/<langue>/tools.json. */
export interface ToolDefinition {
  id: ToolId;
  baseCost: number;
  pagesPerSecond: number;
}

/**
 * Âge Manuel : d'abord des techniques (le chercheur apprend à mieux lire), puis des objets (il
 * bricole de quoi lire davantage). Chacune se découvre en complétant sa phrase dans le livre blanc.
 * Cinq méthodes par Âge (décision de l'auteur, 05/10) : le Pouce, le Regard Large, le Double Feuilletage et le
 * Miroir retirés (core/removedMethods.ts). Chiffres provisoires, simulés pour garder le rythme du 04/10 : Doigt
 * vers 20 min, Voix vers 1 h 10, Lutrin vers 3 h 15, Échelle vers 14 h.
 */
export type ToolId = 'diagonal' | 'finger' | 'voice' | 'lectern' | 'ladder';

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
];
