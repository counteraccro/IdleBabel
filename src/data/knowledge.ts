/**
 * Connaissance : chaque page du livre en main peut cacher une trouvaille — un mot, un morceau de
 * phrase, rarement une phrase entière — qui rapporte 1 point. Les trouvailles sont des morceaux des
 * phrases du livre blanc (data/sentences.ts) : elles s'y écrivent.
 */
export type FindKind = 'word' | 'piece' | 'sentence';

/** Une trouvaille : un morceau d'une phrase (`segment`), ou toute la phrase (sorte « sentence »). */
export interface Find {
  kind: FindKind;
  sentence: string;
  segment?: number;
  /** Morceau déjà écrit (Loi de Redondance) : il rapporte, mais n'écrit rien de neuf. */
  duplicate?: boolean;
}

/** Chance qu'une page tournée cache une trouvaille, avant les bonus (technologies, mutations…). */
export const BASE_FIND_CHANCE = 0.005;

/** Part de chaque sorte parmi les trouvailles. */
export const FIND_WEIGHTS: Record<FindKind, number> = { word: 70, piece: 25, sentence: 5 };

/**
 * Coup de chance : la toute première trouvaille arrive à coup sûr entre ces pages tournées, et c'est
 * la phrase entière de la Lecture Diagonale.
 */
export const LUCK_PAGES = { from: 15, to: 30 };

/** Part des trouvailles tirées dans la phrase de méthode en cours (le reste : n'importe quelle phrase). */
export const TARGET_SHARE = 0.6;

/** Loi de Redondance : part des trouvailles qui répètent un morceau déjà écrit. */
export const DUPLICATE_SHARE = 0.2;

/** Prix en Connaissance pour deviner le dernier morceau d'une phrase. */
export const GUESS_PRICE = 2;

/** Pages tournées seules au plus par seconde (ui/book3d/autoTurn3d.ts) : la même limite hors-ligne. */
export const MAX_TURNS_PER_SECOND = 8;

/** Absence prise en compte au plus (conception §10). */
export const MAX_AWAY_SECONDS = 8 * 3600;

/** Part de la lecture comptée pendant une absence, jeu fermé ou onglet caché (conception §10) : pages, livres, trouvailles. */
export const AWAY_SHARE = 0.5;
