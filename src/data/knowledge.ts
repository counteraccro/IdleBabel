/**
 * Connaissance : chaque page du livre en main peut cacher une trouvaille — un mot, un morceau de
 * phrase, rarement une phrase entière — qui rapporte 1 point. Textes dans i18n/<langue>/fragments.json.
 */
export type FindKind = 'word' | 'piece' | 'sentence';

/** Une trouvaille : sa sorte et sa place dans la liste de textes (la même dans toutes les langues). */
export interface Find {
  kind: FindKind;
  index: number;
}

/** Chance qu'une page tournée cache une trouvaille, avant les bonus (technologies, mutations…). */
export const BASE_FIND_CHANCE = 0.005;

/** Part de chaque sorte parmi les trouvailles. */
export const FIND_WEIGHTS: Record<FindKind, number> = { word: 70, piece: 25, sentence: 5 };

/** Liste de textes de chaque sorte (i18n : fragments.<liste>). */
export const FIND_LISTS = { word: 'words', piece: 'pieces', sentence: 'sentences' } as const satisfies Record<FindKind, string>;

/** Pages tournées seules au plus par seconde (autoTurn.ts) : la même limite hors-ligne. */
export const MAX_TURNS_PER_SECOND = 5;

/** Absence prise en compte au plus (conception §10). */
export const MAX_AWAY_SECONDS = 8 * 3600;
