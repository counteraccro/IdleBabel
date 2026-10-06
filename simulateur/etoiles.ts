/**
 * L'Etherium en constellations (validé le 06/10, .ai/plan-etherium-constellations.md) : chaque étoile n'a qu'une étoile
 * d'avant, chaque étoile allumée donne son effet, et les effets se multiplient. Prix provisoires : c'est ce que le
 * simulateur aide à caler.
 */
export type PageId = 'reading' | 'hands' | 'knowledge' | 'finds' | 'away' | 'start' | 'memory' | 'ages';

export interface Star {
  /** « page.étoile », comme dans la maquette. */
  id: string;
  page: PageId;
  after?: string;
  cost: number;
}

/** Page, étoile, étoile d'avant (sur la même page, sauf mention de la page), prix. */
const RAW: readonly [PageId, string, string | null, number][] = [
  ['reading', 's0', null, 1], ['reading', 's1', 's0', 3],
  ['reading', 'l1', 's1', 8], ['reading', 'l2', 'l1', 25], ['reading', 'l3', 'l2', 100],
  ['reading', 'r1', 's1', 5], ['reading', 'r2', 'r1', 15], ['reading', 'r3', 'r2', 50],
  ['hands', 'w', null, 1], ['hands', 'p', 'w', 3], ['hands', 't', 'p', 5], ['hands', 'i', 'p', 8], ['hands', 'i2', 'i', 25],
  ['hands', 'm', 'p', 15], ['hands', 'm2', 'm', 50], ['hands', 'a', 'p', 20], ['hands', 'o', 'p', 10],
  ['knowledge', 'f', null, 1], ['knowledge', 'b', 'f', 3], ['knowledge', 'wl', 'b', 5], ['knowledge', 'el', 'wl', 15],
  ['knowledge', 'al', 'el', 60], ['knowledge', 'wr', 'b', 8], ['knowledge', 'er', 'wr', 25], ['knowledge', 'ar', 'er', 100],
  ['knowledge', 'k', 'b', 10],
  ['finds', 'h0', null, 1], ['finds', 'h1', 'h0', 3], ['finds', 'g0', 'h1', 8], ['finds', 'g1', 'g0', 5], ['finds', 'g2', 'g1', 15],
  ['finds', 'g3', 'g2', 50], ['finds', 'r1', 'g0', 5], ['finds', 'r2', 'r1', 15], ['finds', 'r3', 'r2', 50], ['finds', 'c', 'r3', 100],
  ['away', 'd0', null, 1], ['away', 'd1', 'd0', 3], ['away', 'd2', 'd1', 10], ['away', 'd3', 'd2', 30],
  ['away', 'c1', 'd0', 3], ['away', 'c2', 'c1', 10], ['away', 'tip', 'c2', 30], ['away', 'x', 'tip', 80],
  ['start', 'sill', null, 1], ['start', 'l1', 'sill', 3], ['start', 'l2', 'l1', 5], ['start', 'l3', 'l2', 25], ['start', 'top', 'l3', 100],
  ['start', 'r1', 'sill', 3], ['start', 'r2', 'r1', 15], ['start', 'r3', 'r2', 25], ['start', 'k', 'r1', 10],
  // La Ruche : la Page Cornée, puis les cinq méthodes du Manuel ; l'alvéole Automatique (sa secrète, puis ses cinq) après l'Âge.
  ['memory', 'm0', null, 1], ['memory', 'm1', 'm0', 2], ['memory', 'm2', 'm1', 4], ['memory', 'm3', 'm2', 8],
  ['memory', 'm4', 'm3', 16], ['memory', 'm5', 'm4', 32],
  ['memory', 'a0', 'm5', 10], ['memory', 'a1', 'a0', 10], ['memory', 'a2', 'a1', 20], ['memory', 'a3', 'a2', 40],
  ['memory', 'a4', 'a3', 80], ['memory', 'a5', 'a4', 160],
  // L'Escalier : l'Âge Manuel est offert ; seul l'Automatique a du contenu dans le simulateur.
  ['ages', 'auto', null, 1], ['ages', 'quantum', 'auto', 10], ['ages', 'dim', 'quantum', 100], ['ages', 'inf', 'dim', 1000],
];

export const STARS: readonly Star[] = RAW.map(([page, id, after, cost]) => ({
  id: `${page}.${id}`,
  page,
  after: after ? `${page}.${after}` : undefined,
  cost,
}));

/** L'alvéole Automatique ne s'ouvre qu'avec l'Âge. */
export const NEEDS_AGE: ReadonlySet<string> = new Set(STARS.filter((s) => s.id.startsWith('memory.a')).map((s) => s.id));

/** Les effets que le simulateur sait jouer : facteurs qui se multiplient, ou valeurs qui s'ajoutent. */
export const EFFECT = {
  /** ×pages/s des méthodes. */
  readingRate: { 'reading.s0': 1.1, 'reading.s1': 1.25, 'reading.l1': 1.25, 'reading.l2': 1.5, 'reading.l3': 2 },
  /** + feuilles tournées par seconde (au plafond de Lecture rapide). */
  turns: { 'reading.r1': 2, 'reading.r2': 4, 'reading.r3': 6 },
  /** ×pages par clic. */
  click: { 'hands.w': 2, 'hands.p': 2, 'hands.i': 2, 'hands.i2': 3 },
  /** + part de la production d'une seconde, à chaque clic. */
  clickShare: { 'hands.t': 0.01, 'hands.m': 0.02, 'hands.m2': 0.05 },
  /** ×Connaissance par trouvaille. */
  knowledge: { 'knowledge.f': 1.5, 'knowledge.b': 1.5, 'knowledge.wr': 2, 'knowledge.er': 2, 'knowledge.ar': 3 },
  /** ×prix des intuitions. */
  intuitions: { 'knowledge.wl': 0.9, 'knowledge.el': 0.75 / 0.9 },
  /** ×chance de trouvaille. */
  findChance: { 'finds.h0': 1.05, 'finds.h1': 1.1, 'finds.g0': 1.15, 'finds.r3': 1.25 },
  /** + part de lecture comptée pendant l'absence. */
  awayShare: { 'away.d0': 0.05, 'away.c1': 0.1, 'away.c2': 0.15 },
  /** + heures d'absence comptées. */
  awayHours: { 'away.d1': 1, 'away.d2': 3, 'away.d3': 12 },
  /** Lectures Diagonales au réveil. */
  diagonals: { 'start.sill': 5, 'start.l1': 5, 'start.l2': 5 },
  /** Part des pages de la partie d'avant, au réveil (la plus haute compte). */
  previousPages: { 'start.r1': 0.001, 'start.r2': 0.01 },
} as const;

/**
 * Étoiles à effet simple, nommées pour le code : Annulaire (×2 chance de trouvaille des pages tournées à la main),
 * Auriculaire (Mémoire musculaire moitié prix), Aigrette gauche (1er niveau de chaque intuition gardé), Bec (phrase
 * devinée à deux morceaux), Droite 1 et 2 de la Loupe (Fil d'Ariane, Mémoire des phrases), Reflet (un niveau de
 * Filtre sémantique), Pointe haute et Étoile près de la lune, Gauche 3 et Arche de la Porte, Droite 3 (Connaissance).
 * Sans effet ici : Haut du verre et Gauche 1-2 de la Loupe (livres rares), Poignée (premier livre rare), secrète Automatique.
 */
export const S = {
  ring: 'hands.a', pinky: 'hands.o', crestLeft: 'knowledge.al', beak: 'knowledge.k',
  ariadne: 'finds.r1', duplicates: 'finds.r2', filter: 'finds.c',
  awayFinds: 'away.tip', awayTurns: 'away.x',
  fingers: 'start.l3', arch: 'start.top', previousKnowledge: 'start.r3',
  cornee: 'memory.m0', age: 'ages.auto',
} as const;

/** Mémoire des méthodes : l'étoile qui garde chaque méthode (dans l'ordre des méthodes du simulateur). */
export const KEEPS: Record<string, string> = {
  diagonal: 'memory.m1', finger: 'memory.m2', voice: 'memory.m3', lectern: 'memory.m4', ladder: 'memory.m5',
  tourne: 'memory.a1', roue: 'memory.a2', chariot: 'memory.a3', automate: 'memory.a4', galerie: 'memory.a5',
};
