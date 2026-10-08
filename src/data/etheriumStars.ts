/**
 * L'Etherium en constellations (validé avec l'auteur le 06/10/2026, .ai/plan-etherium-constellations.md) : une figure
 * par page, dont les étoiles disent ce qu'elles donnent. Chaque étoile n'a qu'une étoile d'avant (pas de raccourci) ;
 * elle s'achète en Éther quand celle-là est allumée, et reste allumée pour toujours. Les effets des étoiles allumées
 * se multiplient (ou s'ajoutent, pour les quantités). Prix provisoires : le simulateur s'en sert aussi
 * (simulateur/vie.ts). Textes : etherium.pages.<page> et etherium.stars.<page>.<étoile>.
 */
/** L'ordre des pages dans le livre : les Âges d'abord (demande de l'auteur, 07/10). */
export const ETHERIUM_PAGES = ['ages', 'reading', 'hands', 'knowledge', 'finds', 'away', 'start', 'memory', 'quill'] as const;
export type PageId = (typeof ETHERIUM_PAGES)[number];

export interface Star {
  /** « page.étoile » (les noms de la maquette). */
  id: string;
  page: PageId;
  /** L'étoile d'avant ; aucune pour l'étoile de départ de la page. */
  after?: string;
  /** Prix, en Éther. */
  cost: number;
}

/** Page, étoile, étoile d'avant (sur la même page), prix. */
const RAW: readonly [PageId, string, string | null, number][] = [
  // Le Livre ouvert : le dos, puis la page de gauche (×pages/s) et celle de droite (feuilles tournées/s).
  ['reading', 's0', null, 1],
  ['reading', 's1', 's0', 3],
  ['reading', 'l1', 's1', 8],
  ['reading', 'l2', 'l1', 25],
  ['reading', 'l3', 'l2', 100],
  ['reading', 'r1', 's1', 5],
  ['reading', 'r2', 'r1', 15],
  ['reading', 'r3', 'r2', 50],
  // La Main : le poignet, la paume, puis chaque doigt.
  ['hands', 'w', null, 1],
  ['hands', 'p', 'w', 3],
  ['hands', 't', 'p', 5],
  ['hands', 'i', 'p', 8],
  ['hands', 'i2', 'i', 25],
  ['hands', 'm', 'p', 15],
  ['hands', 'm2', 'm', 50],
  ['hands', 'a', 'p', 20],
  ['hands', 'o', 'p', 10],
  // La Chouette : les pattes, le corps, puis chaque aile jusqu'à son aigrette, et le bec.
  ['knowledge', 'f', null, 1],
  ['knowledge', 'b', 'f', 3],
  ['knowledge', 'wl', 'b', 5],
  ['knowledge', 'el', 'wl', 15],
  ['knowledge', 'al', 'el', 60],
  ['knowledge', 'wr', 'b', 8],
  ['knowledge', 'er', 'wr', 25],
  ['knowledge', 'ar', 'er', 100],
  ['knowledge', 'k', 'b', 10],
  // La Loupe : le manche, le bas du verre, puis sa gauche (livres rares) et sa droite, jusqu'au reflet.
  ['finds', 'h0', null, 1],
  ['finds', 'h1', 'h0', 3],
  ['finds', 'g0', 'h1', 8],
  ['finds', 'g1', 'g0', 5],
  ['finds', 'g2', 'g1', 15],
  ['finds', 'g3', 'g2', 50],
  ['finds', 'r1', 'g0', 5],
  ['finds', 'r2', 'r1', 15],
  ['finds', 'r3', 'r2', 50],
  ['finds', 'c', 'r3', 100],
  // La Lune : la pointe basse, puis le dos (heures comptées) et le creux (part comptée), la pointe haute, l'étoile voisine.
  ['away', 'd0', null, 1],
  ['away', 'd1', 'd0', 3],
  ['away', 'd2', 'd1', 10],
  ['away', 'd3', 'd2', 30],
  ['away', 'c1', 'd0', 3],
  ['away', 'c2', 'c1', 10],
  ['away', 'tip', 'c2', 30],
  ['away', 'x', 'tip', 80],
  // La Porte : le seuil, puis le montant gauche (méthodes au réveil) et le droit (la partie d'avant), la poignée.
  ['start', 'sill', null, 1],
  ['start', 'l1', 'sill', 3],
  ['start', 'l2', 'l1', 5],
  ['start', 'l3', 'l2', 25],
  ['start', 'top', 'l3', 100],
  ['start', 'r1', 'sill', 3],
  ['start', 'r2', 'r1', 15],
  ['start', 'r3', 'r2', 25],
  ['start', 'k', 'r1', 10],
  // La Ruche : la Page Cornée, puis les cinq méthodes du Manuel ; l'alvéole Automatique (sa secrète, puis ses cinq) après l'Âge.
  ['memory', 'm0', null, 1],
  ['memory', 'm1', 'm0', 2],
  ['memory', 'm2', 'm1', 4],
  ['memory', 'm3', 'm2', 8],
  ['memory', 'm4', 'm3', 16],
  ['memory', 'm5', 'm4', 32],
  ['memory', 'a0', 'm5', 10],
  ['memory', 'a1', 'a0', 10],
  ['memory', 'a2', 'a1', 20],
  ['memory', 'a3', 'a2', 40],
  ['memory', 'a4', 'a3', 80],
  ['memory', 'a5', 'a4', 160],
  // L'Escalier : l'Âge Manuel est offert (il n'est pas une étoile à acheter), puis chaque Âge.
  ['ages', 'auto', null, 1],
  ['ages', 'quantum', 'auto', 10],
  ['ages', 'dim', 'quantum', 100],
  ['ages', 'inf', 'dim', 1000],
  // La Plume (Alpha 1.1, 08/10) : le bec, puis la tige (la lettre vient plus souvent) jusqu'à la pointe (la Transe plus
  // forte) ; les barbes de gauche (durées, temps à l'écran), celles de droite (un bonus de plus chacune).
  ['quill', 'nib', null, 3],
  ['quill', 't1', 'nib', 10],
  ['quill', 't2', 't1', 30],
  ['quill', 'p1', 't2', 60],
  ['quill', 'p2', 'p1', 200],
  ['quill', 'l1', 'nib', 15],
  ['quill', 'l2', 'l1', 45],
  ['quill', 'l3', 'l2', 75],
  ['quill', 'r1', 'nib', 15],
  ['quill', 'r2', 'r1', 25],
  ['quill', 'r3', 'r2', 45],
  ['quill', 'r4', 'r3', 75],
  ['quill', 'r5', 'r4', 120],
  ['quill', 'r6', 'r5', 250],
];

export const STARS: readonly Star[] = RAW.map(([page, id, after, cost]) => ({
  id: `${page}.${id}`,
  page,
  after: after ? `${page}.${after}` : undefined,
  cost,
}));

export const starById = (id: string): Star | undefined => STARS.find((star) => star.id === id);

/**
 * Étoiles fermées, tant que ce qu'elles donnent n'existe pas (revue du 08/10, décision de l'auteur) : les Âges
 * Quantique, Dimensionnel et Infini, et la Goutte (la méthode secrète de l'Âge Automatique, mise de côté). Elles se
 * voient sans dire leur nom, ne s'allument pas, et les sceaux de l'Etherium ne les comptent pas.
 */
export const CLOSED: ReadonlySet<string> = new Set(['ages.quantum', 'ages.dim', 'ages.inf', 'memory.a0']);

/** Fermées, mais sans bloquer la suite : les étoiles d'après la Goutte attendent celle d'avant elle. */
const PASSABLE: ReadonlySet<string> = new Set(['memory.a0']);

/** Les étoiles qui peuvent s'allumer aujourd'hui (les sceaux de l'Etherium les comptent). */
export const OPEN_STARS: readonly Star[] = STARS.filter((star) => !CLOSED.has(star.id));

/** L'étoile d'avant est allumée (ou, pour la Goutte, celle d'avant elle), ou il n'y en a pas : `star` peut s'allumer. */
export const afterLit = (star: Star, lit: (id: string) => boolean): boolean => {
  if (!star.after) return true;
  if (lit(star.after)) return true;
  const before = starById(star.after);
  return !!before && PASSABLE.has(before.id) && afterLit(before, lit);
};

/** L'alvéole Automatique de la Ruche ne s'ouvre qu'avec l'Âge Automatique (l'étoile de l'Escalier). */
export const NEEDS_AGE: ReadonlySet<string> = new Set(STARS.filter((star) => star.id.startsWith('memory.a')).map((star) => star.id));

/** Ce que donnent les étoiles : des facteurs qui se multiplient, ou des valeurs qui s'ajoutent. */
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
  /** ×prix des intuitions (−10 %, puis −25 % en tout). */
  intuitions: { 'knowledge.wl': 0.9, 'knowledge.el': 0.75 / 0.9 },
  /** ×chance de trouvaille. */
  findChance: { 'finds.h0': 1.05, 'finds.h1': 1.1, 'finds.g0': 1.15, 'finds.r3': 1.25 },
  /** + part des trouvailles tirées dans la phrase de méthode en cours (comme le Fil d'Ariane). */
  aim: { 'finds.r1': 0.1 },
  /** − part des morceaux en double (comme la Mémoire des phrases). */
  duplicates: { 'finds.r2': 0.1 },
  /** ×chance de livre rare. */
  rareChance: { 'finds.g1': 1.2, 'finds.g2': 1.5, 'finds.g3': 2 },
  /** + part de lecture comptée pendant l'absence. */
  awayShare: { 'away.d0': 0.05, 'away.c1': 0.1, 'away.c2': 0.15 },
  /** + heures d'absence comptées. */
  awayHours: { 'away.d1': 1, 'away.d2': 3, 'away.d3': 12 },
  /** Lectures Diagonales au réveil. */
  diagonals: { 'start.sill': 5, 'start.l1': 5, 'start.l2': 5 },
  /** Part des pages de la partie d'avant, au réveil (la plus haute compte). */
  previousPages: { 'start.r1': 0.001, 'start.r2': 0.01 },
  /** ×attente entre deux lettres (la Plume : le bec et la tige). */
  letterWait: { 'quill.nib': 0.8, 'quill.t1': 0.8, 'quill.t2': 0.75 },
  /** ×durée des bonus de la lettre (barbes de gauche). */
  boonLength: { 'quill.l1': 1.5, 'quill.l2': 2 },
  /** ×lecture de la Transe (la pointe ; la plus haute compte). */
  trance: { 'quill.p1': 3, 'quill.p2': 4 },
} as const satisfies Record<string, Record<string, number>>;

/** Ce que font les étoiles à effet simple (S). */
export const SIMPLE = {
  /** Annulaire : ×chance de trouvaille d'une page tournée à la main. */
  ringFinds: 2,
  /** Auriculaire : ×prix de la Mémoire musculaire. */
  pinkyPrice: 0.5,
  /** Bec : morceaux manquants au plus pour qu'une phrase se devine (un seul sans lui). */
  beakMissing: 2,
  /** Étoile près de la lune : ×feuilles comptées pour les trouvailles pendant l'absence. */
  awayTurns: 2,
  /** Gauche 3 de la Porte : Lectures au Doigt au réveil. */
  fingers: 10,
  /** Arche : part des exemplaires de chaque méthode de la partie d'avant, au réveil. */
  archShare: 0.01,
  /** Droite 3 de la Porte : part de la Connaissance gagnée dans la partie d'avant, au réveil. */
  previousKnowledge: 0.1,
  /** Poignée : ×chance d'être rare du premier livre pris au réveil. */
  handleRare: 10,
  /** Haut des barbes de gauche de la Plume : secondes en plus où la lettre reste à l'écran. */
  letterStays: 4,
} as const;

/**
 * Étoiles à effet simple, nommées pour le code : Annulaire (×2 chance de trouvaille des pages tournées à la main),
 * Auriculaire (Mémoire musculaire moitié prix), Aigrette gauche (1er niveau de chaque intuition gardé), Bec (phrase
 * devinée à deux morceaux), Reflet (un niveau de Filtre sémantique), Pointe haute et Étoile près de la lune, Gauche 3
 * et Arche de la Porte, Droite 3 (Connaissance), Poignée (premier livre rare), la Page Cornée et l'Âge Automatique ;
 * leurs valeurs : SIMPLE.
 */
export const S = {
  ring: 'hands.a',
  pinky: 'hands.o',
  crestLeft: 'knowledge.al',
  beak: 'knowledge.k',
  filter: 'finds.c',
  awayFinds: 'away.tip',
  awayTurns: 'away.x',
  fingers: 'start.l3',
  arch: 'start.top',
  previousKnowledge: 'start.r3',
  handle: 'start.k',
  cornee: 'memory.m0',
  age: 'ages.auto',
  letterStays: 'quill.l3',
} as const;

/** Mémoire des méthodes : l'étoile qui garde la phrase de chaque méthode (Manuel, puis Automatique). */
export const KEEPS: Record<string, string> = {
  diagonal: 'memory.m1',
  finger: 'memory.m2',
  voice: 'memory.m3',
  lectern: 'memory.m4',
  ladder: 'memory.m5',
  metronome: 'memory.a1',
  wheel: 'memory.a2',
  lift: 'memory.a3',
  automaton: 'memory.a4',
  clock: 'memory.a5',
};
