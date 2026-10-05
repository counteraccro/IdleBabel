import { ETHERIUM_TREES, type EtheriumTreeId } from '../src/data/etherium';

/**
 * Ce que le jeu n'a pas encore : les chiffres proposés (conception §3.1 ter, §4), à changer ici pour essayer.
 * Le reste (méthodes de l'Âge Manuel, intuitions, trouvailles) vient du code du jeu (src/data).
 */

/** Une méthode que le jeu n'a pas encore : prix de base, pages/s, morceaux de sa phrase. */
export interface ExtraMethod {
  id: string;
  baseCost: number;
  pagesPerSecond: number;
  pieces: number;
}

/** La Page Cornée, méthode secrète de l'Âge Manuel (validée le 05/10 : 50 000 pages, 5 000 /s, 1 🌌). */
export const SECRET_MANUAL: ExtraMethod = { id: 'cornee', baseCost: 50_000, pagesPerSecond: 5_000, pieces: 5 };

/** Âge Automatique (§3.1 ter, chiffres provisoires) ; les morceaux des phrases sont devinés (pas encore écrites). */
export const AUTOMATIC: readonly ExtraMethod[] = [
  { id: 'tourne', baseCost: 320e6, pagesPerSecond: 1e5, pieces: 5 },
  { id: 'roue', baseCost: 13e9, pagesPerSecond: 2e6, pieces: 5 },
  { id: 'chariot', baseCost: 550e9, pagesPerSecond: 40e6, pieces: 5 },
  { id: 'automate', baseCost: 23e12, pagesPerSecond: 800e6, pieces: 5 },
  { id: 'galerie', baseCost: 1e18, pagesPerSecond: 16e9, pieces: 5 },
];

/**
 * L'Etherium : chaque arbre, ses nœuds dans l'ordre (prix en 🌌, et ce que donne le nœud, cumulé : le niveau 3
 * donne `values[2]`). Prix et effets provisoires (§4.2), c'est ce que le simulateur aide à caler.
 */
export interface Tree {
  costs: readonly number[];
  values: readonly number[];
}

export const ETHERIUM = {
  /** Passer à l'Âge Automatique (un seul nœud ; pas encore dans le jeu). */
  ageAutomatic: { costs: [1], values: [1] },
  /** Se souvenir de la Page Cornée (un seul nœud ; sa phrase reste à compléter, une fois ; pas encore dans le jeu). */
  secretManual: { costs: [1], values: [1] },
  // Les arbres du jeu (src/data/etherium.ts) : lecture, mains, connaissance, trouvailles, départ, mémoire.
  ...(Object.fromEntries(ETHERIUM_TREES.map((tree) => [tree.id, tree])) as Record<EtheriumTreeId, Tree>),
};

export type TreeId = keyof typeof ETHERIUM;

/** Ordre dans lequel le bot dépense l'Éther : à chaque passage, le premier nœud qu'il peut s'offrir. */
export const SPENDING_ORDER: readonly TreeId[] = [
  'ageAutomatic',
  'secretManual',
  'reading',
  'knowledge',
  'start',
  'finds',
  'hands',
  'memory',
];

/** Le joueur imité par le bot. */
export const PLAYER = {
  /** Clics par seconde, pendant les premières minutes de chaque partie. */
  clicksPerSecond: 3,
  clickMinutes: 10,
  /**
   * Rythme : heures de jeu, puis heures d'absence (jeu fermé), en boucle. [24, 0] : le jeu ne se ferme jamais.
   * [2, 22] : deux heures par jour.
   */
  rhythm: [24, 0] as readonly [number, number],
  /** Sceaux obtenus (+1 % de trouvailles chacun), fixe pour toute la simulation. */
  seals: 30,
  /**
   * Quand la phrase de la première méthode Automatique se trouve : 'échelle', comme toutes les méthodes (l'Échelle à
   * 25 exemplaires, METHOD_GATE) ; 'âge', dès l'Âge acheté (le prix seul fait le verrou).
   */
  automaticGate: 'âge' as 'échelle' | 'âge',
  /**
   * Quand le bot fait son prestige (toujours au bout de `maxRunHours`, s'il rapporte) : 'double', quand il rapporte
   * au moins autant d'Éther qu'il en a déjà reçu ; 'taux', dès que l'Éther gagné par heure de partie baisse sous
   * `prestigeWhenRateBelow` fois le meilleur vu dans la partie.
   */
  prestige: 'double' as 'double' | 'taux',
  prestigeWhenRateBelow: 0.8,
  maxRunHours: 48,
};
