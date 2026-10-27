/**
 * Les curiosités (idée de l'auteur, 26/10 ; .ai/plan-curiosites.md) : des livres ni rares ni communs, qui arrivent en lisant
 * (une par heure de jeu au plus). Chacun a un rang (F à A, S seulement par restauration) et quatre pièces (derrière, dos,
 * devant, page de garde), chacune dans un état (médiocre, usagé, bon, neuf) ; il donne un bonus selon sa famille et son rang,
 * réduit ou grandi par son état. Au lutrin (trois places), il agit. Détruit, il devient de la matière : des pages de réemploi
 * (pour monter le rang d'un autre) et des pièces aux tiroirs (pour en restaurer d'autres). Chiffres de l'essai 3 du simulateur
 * (simulateur/atelier.ts), validé par l'auteur le 27/10, et de la maquette validée (.ai/maquette-atelier-interface.html).
 */

/** Les rangs, F à S (S : un livre nommé, monté avec un set de pièces S). */
export const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;
export const RANK_A = 5;
export const RANK_S = 6;
/** Le rang à l'arrivée (F à A ; S jamais tiré). */
export const RANK_ODDS = [41, 25, 15, 10, 6, 3] as const;
/** Les pages de réemploi que donne un livre détruit, selon son rang. */
export const RANK_PAGES = [1, 2, 4, 8, 16, 32, 64] as const;
/** Les pages de réemploi pour monter d'un rang (F→E… B→A ; essai 2 : le prix doublé). */
export const RANK_COST = [4, 8, 16, 32, 64] as const;
/** Monter un set de quatre pièces S sur un livre de rang A (essai 3). */
export const SET_PAGES = 64;

/** Les quatre pièces, dans l'ordre du livre déplié sur le pupitre. */
export const PARTS = ['back', 'spine', 'front', 'endpaper'] as const;
export type PieceId = (typeof PARTS)[number];

/** Les états : médiocre, usagé, bon, neuf. */
export const STATES = 4;
export const NEW = 3;
/** L'état du livre à l'arrivée ; ses pièces, un cran autour (± 1). */
export const STATE_ODDS = [35, 35, 25, 5] as const;
export const PIECE_SPREAD = [-1, 0, 0, 1] as const;
/** La part du bonus qui agit, selon l'état du livre (la moyenne de ses pièces, arrondie vers le bas). */
export const STATE_FACTOR = [0.4, 0.7, 1, 1.3] as const;
/** Une pièce S arrive « en piteux état » : jamais neuve. */
export const S_STATE_ODDS = [60, 30, 10, 0] as const;

/** Une pièce sur quatre s'abîme en sortant d'un livre (la main sûre : moins) ; une médiocre abîmée tombe en miettes. */
export const DAMAGE = [1 / 4, 1 / 6, 1 / 10] as const;
/** Au démontage, une pièce ordinaire sur deux tombe en miettes (essai 2), en plus du risque de s'abîmer. */
export const KEEP_ORDINARY = 1 / 2;
/** Une pièce S dans une curiosité : 1 sur 10, 1 sur 7, 1 sur 5 (le flair). */
export const S_CHANCE = [1 / 10, 1 / 7, 1 / 5] as const;
/** Une curiosité au plus toutes les tant de minutes de jeu (l'arrivage). */
export const ARRIVAL_MINUTES = [60, 45, 30] as const;
/** Une pièce sur tant arrive un cran au-dessus (l'œil du libraire) : jamais, une sur 5, une sur 3. */
export const BETTER_PIECE = [0, 1 / 5, 1 / 3] as const;

/** Remplacer une pièce par une du tiroir : selon l'état posé (médiocre → neuf), en minutes. */
export const MOUNT_MINUTES = [30, 60, 120, 240] as const;
/** Restaurer une pièce S d'un cran : selon son état (médiocre → bon), en minutes ; l'établi : −25 %, −50 %. */
export const RESTORE_MINUTES = [120, 240, 480] as const;
export const RESTORE_TIME = [1, 0.75, 0.5] as const;
/** Restaurer une pièce S prend deux pièces ordinaires du même type (les moins bonnes) et des pages, selon son état. */
export const RESTORE_PIECES = 2;
export const RESTORE_PAGES = [8, 16, 32] as const;
/** Les places de l'établi : deux, trois avec la troisième presse. */
export const PRESSES = 2;

/** Le chariot : dix places ; un cadenas protège un livre (neuf au plus : une place tourne toujours). */
export const CART_PLACES = 10;
export const LOCKS = 9;
/** La pile des livres à pièce S, couchée sur le chariot : six se voient, puis un papier dit combien il en reste. */
export const TOP_PILE = 6;
/** Le lutrin : trois places. */
export const LECTERN_PLACES = 3;

/**
 * Le pilon (l'auteur, 27/10, à la place de l'usure) : les pièces ordinaires des tiroirs y deviennent de l'Éther pour le
 * prochain prestige. Points par état ; 100 points = +1 %, au plus +5 % ; il repart à zéro au prestige.
 */
export const PULP_POINTS = [1, 2, 3, 4] as const;
export const PULP_PER_PERCENT = 100;
export const PULP_MAX_PERCENT = 5;
/** Le stock gardé par tiroir, au-delà duquel le surplus part tout seul au pilon (-1 : tout garder). */
export const PULP_KEEP = 10;
export const PULP_KEEP_CHOICES = [-1, 0, 5, 10, 20, 50] as const;

/** Les familles de bonus (le sujet d'une curiosité) ; chacune a sa force à chaque rang, F à S. */
export const FAMILIES = ['pages', 'click', 'finds', 'knowledge', 'price', 'letter', 'boons', 'mimic', 'away', 'ether'] as const;
export type FamilyId = (typeof FAMILIES)[number];
/**
 * Les valeurs du tableau (en pour cent ; la Mimic, en points de ce qu'elle rend en plus). Le prix des méthodes baisse ;
 * l'Éther ne sort jamais en F ni en E.
 */
export const FAMILY_VALUES: Record<FamilyId, readonly number[]> = {
  pages: [2, 4, 6, 9, 13, 18, 25],
  click: [10, 20, 35, 50, 75, 110, 150],
  finds: [3, 6, 10, 15, 20, 27, 35],
  knowledge: [3, 6, 10, 15, 20, 27, 35],
  price: [1, 2, 3, 5, 7, 9, 12],
  letter: [4, 8, 12, 18, 25, 35, 45],
  boons: [5, 10, 15, 20, 30, 40, 50],
  mimic: [2, 4, 6, 10, 14, 20, 30],
  away: [3, 6, 10, 15, 20, 27, 35],
  ether: [0, 0, 1, 2, 3, 5, 7],
};
/** Une curiosité d'Éther est au moins D. */
export const ETHER_FROM_RANK = 2;
/** Le 2e bonus d'un livre A est au niveau C ; le malus d'un B, d'un A, d'un S (en pour cent, ou en points). */
export const SECOND_BONUS_RANK = 3;
export const MALUS: Readonly<Record<number, number>> = { 4: 5, 5: 8, 6: 12 };
/** Un livre S : ses bonus d'un tiers en moins (essai 2), le 1er au niveau S, le 2e au niveau B. */
export const S_BONUS = 2 / 3;
export const S_SECOND_RANK = 4;

/**
 * Les huit livres S (l'auteur, 26/10 : « un livre rare raté », une belle couverture presque réelle, illisible dedans) : des
 * classiques détournés, du domaine public, et des titres qui sonnent vrais. Leur titre : atelier.sets.<n> ; la teinte de
 * leur cuir ; leurs deux bonus et leur malus.
 */
export interface CuriositySet {
  hue: number;
  bonus: FamilyId;
  second: FamilyId;
  malus: FamilyId;
}
export const SETS: readonly CuriositySet[] = [
  // Voyage au centre de la mer (le raté du vrai livre rare « Voyage au centre de la Terre »).
  { hue: 205, bonus: 'away', second: 'boons', malus: 'click' },
  // Les Heures du cartographe.
  { hue: 30, bonus: 'pages', second: 'letter', malus: 'mimic' },
  // L'Herbier des villes englouties.
  { hue: 140, bonus: 'knowledge', second: 'finds', malus: 'price' },
  // Mémoires d'un escalier.
  { hue: 350, bonus: 'click', second: 'pages', malus: 'away' },
  // La Grammaire des fautes.
  { hue: 260, bonus: 'ether', second: 'knowledge', malus: 'letter' },
  // Le Comte du Monte-Charge.
  { hue: 15, bonus: 'finds', second: 'mimic', malus: 'boons' },
  // Petit atlas des lieux qu'on oublie.
  { hue: 95, bonus: 'letter', second: 'away', malus: 'pages' },
  // Les Richissimes.
  { hue: 220, bonus: 'mimic', second: 'price', malus: 'finds' },
];
