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
export const BASE_FIND_CHANCE = 0.002;

/** Chaque sceau obtenu, pour toujours (l'Exil ne les reprend pas) : la chance de trouvaille +1 %, additionné. */
export const SEAL_FIND_BONUS = 0.01;

/** Part de chaque sorte parmi les trouvailles. */
export const FIND_WEIGHTS: Record<FindKind, number> = { word: 70, piece: 25, sentence: 5 };

/**
 * Coup de chance : la toute première trouvaille arrive à coup sûr entre ces pages tournées, et c'est
 * la phrase entière de la Lecture Diagonale.
 */
export const LUCK_PAGES = { from: 15, to: 30 };

/** Part des trouvailles tirées dans la phrase de méthode en cours (le reste : n'importe quelle phrase), avant le Fil d'Ariane. */
export const TARGET_SHARE = 0.6;

/**
 * La phrase d'une méthode ne se trouve qu'une fois la méthode d'avant possédée à tant d'exemplaires
 * (décision de l'auteur, 04/10) : chaque méthode arrive quand on peut à peu près se l'offrir, de plus en
 * plus espacées (Doigt vers 20 min, Échelle vers 14 h), et la chance de trouvaille n'y change rien.
 */
export const METHOD_GATE = 25;

/**
 * Au-delà de 100 % de chance, les trouvailles en plus de la page (la première suit la règle d'avant) :
 * chacune a sa part, le reste ne rapporte que sa Connaissance (un morceau déjà écrit). Idée de l'auteur,
 * 04/10 : 554 %, c'est 5,5 fois plus de Connaissance, pas 5,5 fois plus vite le livre blanc.
 */
export const EXTRA_FIND_SHARES = { method: 0.03, hint: 0.1, memory: 0.02 } as const;

/** Loi de Redondance : part des trouvailles qui répètent un morceau déjà écrit, avant la Mémoire des phrases. */
export const DUPLICATE_SHARE = 0.2;

/** Prix en Connaissance pour deviner le dernier morceau d'une phrase. */
export const GUESS_PRICE = 10;

/** Feuilles tournées seules au plus par seconde (ui/book3d/autoTurn3d.ts), avant la Lecture rapide : la même limite hors-ligne. */
export const MAX_TURNS_PER_SECOND = 8;

/** Absence prise en compte au plus (conception §10), avant le Sommeil profond. */
export const MAX_AWAY_SECONDS = 8 * 3600;

/** Part de la lecture comptée pendant une absence, jeu fermé ou onglet caché (conception §10) : pages, livres, trouvailles ; avant la Cartographie du Retour. */
export const AWAY_SHARE = 0.5;
