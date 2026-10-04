/**
 * Intuitions (les Technologies de la conception, §5) : des choses que le chercheur finit par comprendre,
 * achetées en Connaissance, niveau après niveau. Chacune a sa page dans la partie « Intuitions » du livre
 * blanc (ui/whiteBook/intuitionPage.ts). Textes : whiteBook.intuitions.<id>. Chiffres provisoires.
 */
export interface TechnologyDef {
  id: string;
  /** Prix en Connaissance de chaque niveau, dans l'ordre. */
  prices: readonly number[];
}

/** Filtre sémantique : chaque niveau multiplie la chance qu'une page cache une trouvaille. */
export const FILTER_BONUS = 1.5;

export const TECHNOLOGIES = [{ id: 'semanticFilter', prices: [5, 50, 500, 5_000, 50_000] }] as const satisfies readonly TechnologyDef[];

export type TechnologyId = (typeof TECHNOLOGIES)[number]['id'];
