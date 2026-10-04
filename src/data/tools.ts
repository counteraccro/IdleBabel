/** Outils répétables : chiffres uniquement, les textes sont dans i18n/<langue>/tools.json. */
export interface ToolDefinition {
  id: ToolId;
  baseCost: number;
  pagesPerSecond: number;
}

/**
 * Âge Manuel : d'abord des techniques (le chercheur apprend à mieux lire), puis des objets (il
 * bricole de quoi lire davantage). Chacune se découvre en complétant sa phrase dans le livre blanc.
 * Chiffres provisoires, à recalibrer. Les cinq dernières ×2 le 04/10 (l'Âge Manuel ralenti, choix de l'auteur).
 */
export type ToolId = 'diagonal' | 'finger' | 'thumb' | 'voice' | 'wide' | 'double' | 'mirror' | 'lectern' | 'ladder';

export const COST_GROWTH = 1.15;

/** Combien de méthodes un clic achète (la marque sous la ruche) : « max », tout ce que les pages permettent. */
export const BUY_LOTS = [1, 10, 100, 'max'] as const;
export type BuyLot = (typeof BUY_LOTS)[number];

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'diagonal', baseCost: 15, pagesPerSecond: 0.1 },
  { id: 'finger', baseCost: 100, pagesPerSecond: 0.5 },
  { id: 'thumb', baseCost: 600, pagesPerSecond: 2.5 },
  { id: 'voice', baseCost: 3_500, pagesPerSecond: 12 },
  { id: 'wide', baseCost: 40_000, pagesPerSecond: 55 },
  { id: 'double', baseCost: 240_000, pagesPerSecond: 250 },
  { id: 'mirror', baseCost: 1_400_000, pagesPerSecond: 1_100 },
  { id: 'lectern', baseCost: 8_000_000, pagesPerSecond: 5_000 },
  { id: 'ladder', baseCost: 50_000_000, pagesPerSecond: 22_000 },
];
