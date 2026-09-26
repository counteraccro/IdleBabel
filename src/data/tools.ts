/** Outils répétables : chiffres uniquement, les textes sont dans i18n/<langue>/tools.json. */
export interface ToolDefinition {
  id: ToolId;
  baseCost: number;
  pagesPerSecond: number;
}

export type ToolId = 'diagonal';

export const COST_GROWTH = 1.15;

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'diagonal', baseCost: 15, pagesPerSecond: 0.1 },
];
