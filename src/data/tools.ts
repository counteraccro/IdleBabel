/** Outils répétables : chiffres uniquement, les textes sont dans i18n/<langue>/tools.json. */
export interface ToolDefinition {
  id: ToolId;
  baseCost: number;
  pagesPerSecond: number;
}

/**
 * Âge Manuel : d'abord des techniques (le chercheur apprend à mieux lire), puis des objets (il
 * bricole de quoi lire davantage). Chacune se découvre en complétant sa phrase dans le livre blanc.
 * Chiffres provisoires, à recalibrer.
 */
export type ToolId = 'diagonal' | 'finger' | 'thumb' | 'voice' | 'wide' | 'double' | 'mirror' | 'lectern' | 'ladder';

export const COST_GROWTH = 1.15;

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'diagonal', baseCost: 15, pagesPerSecond: 0.1 },
  { id: 'finger', baseCost: 100, pagesPerSecond: 0.5 },
  { id: 'thumb', baseCost: 600, pagesPerSecond: 2.5 },
  { id: 'voice', baseCost: 3_500, pagesPerSecond: 12 },
  { id: 'wide', baseCost: 20_000, pagesPerSecond: 55 },
  { id: 'double', baseCost: 120_000, pagesPerSecond: 250 },
  { id: 'mirror', baseCost: 700_000, pagesPerSecond: 1_100 },
  { id: 'lectern', baseCost: 4_000_000, pagesPerSecond: 5_000 },
  { id: 'ladder', baseCost: 25_000_000, pagesPerSecond: 22_000 },
];
