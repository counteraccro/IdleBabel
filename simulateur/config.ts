import type { PageId } from '../src/data/etheriumStars';

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

/**
 * Âge Automatique (§3.1 ter, noms choisis le 07/10, chiffres provisoires) : Métronome, Roue à Livres, Monte-Livres,
 * Automate Lecteur, Horloge des Galeries. Prix « D », choisis le 07/10 : dans une partie avancée, les cinq
 * s'échelonnent (quelques minutes, 4 h, 11 h, 23 h, 42 h) ; l'Horloge vers le 13e jour (24 h de jeu par jour).
 * Les morceaux des phrases sont devinés (pas encore écrites).
 */
export const AUTOMATIC: readonly ExtraMethod[] = [
  { id: 'metronome', baseCost: 250e6, pagesPerSecond: 1e5, pieces: 5 },
  { id: 'roue', baseCost: 4e9, pagesPerSecond: 1e6, pieces: 5 },
  { id: 'monte', baseCost: 80e9, pagesPerSecond: 12e6, pieces: 5 },
  { id: 'automate', baseCost: 1.5e12, pagesPerSecond: 150e6, pieces: 5 },
  { id: 'horloge', baseCost: 30e12, pagesPerSecond: 2e9, pieces: 5 },
];

// L'Etherium (les constellations) est dans etoiles.ts.

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
  /** Les pages de l'Etherium où le bot allume des étoiles (--pages=reading,hands pour n'en essayer que quelques-unes). */
  pages: ['reading', 'hands', 'knowledge', 'finds', 'away', 'start', 'memory', 'ages'] as PageId[],
  /** La Page Cornée (1re étoile de la Ruche) ; --sans-cornee pour s'en passer (et donc de toute la Ruche). */
  cornee: true,
};
