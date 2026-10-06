/**
 * L'Etherium (conception §4.2) : le livre où se dépense l'Éther, reçu seulement au prestige. Une page par arbre,
 * des nœuds achetés l'un après l'autre, du bas vers le haut, acquis pour toujours. Textes : etherium.trees.<id>.
 * Prix et effets provisoires (à caler en jeu, avec le simulateur : simulateur/config.ts reprend les mêmes).
 */
export interface EtheriumTree {
  id: string;
  /** Prix de chaque nœud, en Éther, dans l'ordre. */
  costs: readonly number[];
  /** Ce que donne l'arbre une fois tant de nœuds pris (cumulé : le 3e nœud donne `values[2]`). */
  values: readonly number[];
}

export const ETHERIUM_TREES = [
  /** Lecture : les pages/s de toutes les méthodes, multipliées. */
  { id: 'reading', costs: [1, 3, 8, 20, 50], values: [1.1, 1.25, 1.5, 2, 3] },
  /** Mains : les pages d'un clic, multipliées (l'ancienne mutation Mains Mémorielles). */
  { id: 'hands', costs: [2, 6, 15], values: [2, 3, 5] },
  /** Connaissance : ce que rapporte chaque trouvaille (l'ancienne mutation Intuition). */
  { id: 'knowledge', costs: [1, 4, 12, 30], values: [1.5, 2, 3, 5] },
  /** Trouvailles : la chance de trouvaille, multipliée. */
  { id: 'finds', costs: [1, 3, 8, 20], values: [1.05, 1.1, 1.15, 1.25] },
  /** Départ : des Lectures Diagonales déjà là au réveil (l'ancien Réflexe du Fuyard). */
  { id: 'start', costs: [1, 3, 10], values: [5, 25, 100] },
  /**
   * Mémoire des méthodes (§4.4) : les phrases des premières méthodes de l'Âge Manuel restent écrites au
   * prestige (sans elle, le livre blanc les oublie toutes).
   */
  { id: 'memory', costs: [2, 4, 8, 16, 32], values: [1, 2, 3, 4, 5] },
] as const satisfies readonly EtheriumTree[];

export type EtheriumTreeId = (typeof ETHERIUM_TREES)[number]['id'];

/** Pages lues à vie pour le premier Éther : le n-ième en demande n³ fois plus (conception §4.1). */
export const ETHER_PAGES = 1e9;

/** Pages lues à vie à partir desquelles le nom de l'Etherium et sa ruche paraissent sur sa couverture. */
export const ETHERIUM_NAMED_PAGES = 1e6;
