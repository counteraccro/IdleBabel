import { ETHER_WEIGHT } from './etherium';
import { AUTOMATIC_AGE, DIGITAL_AGE } from './tools';

/**
 * L'Etherium en constellations (validé avec l'auteur le 06/10/2026, .ai/plan-etherium-constellations.md) : une figure
 * par page, dont les étoiles disent ce qu'elles donnent. Chaque étoile n'a qu'une étoile d'avant (pas de raccourci) ;
 * elle s'achète en Éther quand celle-là est allumée, et reste allumée pour toujours. Les effets des étoiles allumées
 * se multiplient (ou s'ajoutent, pour les quantités). Prix provisoires : le simulateur s'en sert aussi
 * (simulateur/vie.ts). Textes : etherium.pages.<page> et etherium.stars.<page>.<étoile>.
 */
/**
 * L'ordre des pages dans le livre : les Âges d'abord (demande de l'auteur, 07/10), puis le Poids, qui les touche tous ; la
 * page de chaque Âge à la fin, après les reliques (13/10) et la Loterie (17/10) ; tout au bout, le Rideau, la fausse fin (14/10).
 */
export const ETHERIUM_PAGES = [
  'ages',
  'weight',
  'reading',
  'hands',
  'knowledge',
  'finds',
  'away',
  'start',
  'memory',
  'quill',
  'explore',
  'mimic',
  'relics',
  'lottery',
  'screen',
  'curtain',
] as const;
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
  // La Ruche : la Page Cornée, puis les cinq méthodes du Manuel ; l'alvéole Automatique (sa secrète, puis ses cinq) après l'Âge,
  // et l'alvéole Numérique (13/10 : le Bit, puis ses cinq, ×10 l'alvéole Automatique) après le sien.
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
  ['memory', 'n0', 'a5', 100],
  ['memory', 'n1', 'n0', 100],
  ['memory', 'n2', 'n1', 200],
  ['memory', 'n3', 'n2', 400],
  ['memory', 'n4', 'n3', 800],
  ['memory', 'n5', 'n4', 1600],
  // L'Escalier : l'Âge Manuel est offert (il n'est pas une étoile à acheter), puis chaque Âge.
  ['ages', 'auto', null, 1],
  // L'Âge Numérique : 1 500 Éther (validé le 13/10, simulé : achetée vers la 17e partie).
  ['ages', 'quantum', 'auto', 1500],
  ['ages', 'dim', 'quantum', 100],
  ['ages', 'inf', 'dim', 1000],
  // Le Poids, l'Atlas (13/10, piste B de .ai/maquette-etherium-numerique.html) : du pied à la salle qu'il porte, chaque
  // étoile allège le poids de la Bibliothèque ; la dernière le lève.
  ['weight', 'w1', null, 10_000],
  ['weight', 'w2', 'w1', 25_000],
  ['weight', 'w3', 'w2', 60_000],
  ['weight', 'w4', 'w3', 150_000],
  ['weight', 'w5', 'w4', 400_000],
  ['weight', 'w6', 'w5', 1_000_000],
  ['weight', 'w7', 'w6', 2_500_000],
  // Numérique, le Minitel (13/10, .ai/maquette-etherium-numerique.html) : la prise, puis le cordon mène à l'écran (ses
  // quatre coins : lecture des méthodes Numériques) et au clavier (ses touches : Connaissance). Page de l'Âge Numérique.
  ['screen', 'plug', null, 1000],
  ['screen', 's1', 'plug', 2000],
  ['screen', 's2', 's1', 5000],
  ['screen', 's3', 's2', 10_000],
  ['screen', 's4', 's3', 25_000],
  ['screen', 'k1', 'plug', 2000],
  ['screen', 'k2', 'k1', 5000],
  ['screen', 'k3', 'k2', 10_000],
  ['screen', 'k4', 'k3', 25_000],
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
  // L'Exploration, la Rose des vents (11/10, .ai/maquette-etherium-mimic.html) : le centre est offert, chaque pointe en part
  // et fait apparaître une chose nouvelle dans les salles. L'Est, la Mimic ; l'Ouest, les reliques (12/10) ; les
  // autres, des idées à venir (CLOSED).
  // L'Est, à 2 : la Mimic s'achète au 3e réveil (simulateur/vie.ts : 4 Éther reçus, l'Âge Automatique en premier).
  ['explore', 'e', null, 2],
  ['explore', 'w', null, 5],
  ['explore', 'n', null, 0],
  ['explore', 's', null, 0],
  ['explore', 'd0', null, 0],
  ['explore', 'd1', null, 0],
  ['explore', 'd2', null, 0],
  ['explore', 'd3', null, 0],
  // La Mimic, de profil, la mâchoire ouverte : la charnière est offerte quand l'Est s'allume ; l'œil (voir ce qu'elle a
  // englouti), les dents du haut (elle vient plus souvent), celles du bas (elle rend plus).
  ['mimic', 'eye', null, 10],
  ['mimic', 't1', null, 10],
  ['mimic', 't2', 't1', 30],
  ['mimic', 't3', 't2', 80],
  ['mimic', 'b1', null, 10],
  ['mimic', 'b2', 'b1', 25],
  ['mimic', 'b3', 'b2', 50],
  ['mimic', 'b4', 'b3', 100],
  ['mimic', 'b5', 'b4', 200],
  // Les reliques, « Le Cabinet » (12/10, .ai/maquette-reliques.html) : le centre est offert quand l'Ouest s'allume ; une
  // branche par relique (son bonus, deux fois), et « La patience » (le délai pour changer de relique, 12 h → 6 h).
  ['relics', 'l1', null, 15],
  ['relics', 'l2', 'l1', 45],
  ['relics', 'a1', null, 15],
  ['relics', 'a2', 'a1', 45],
  ['relics', 'h1', null, 15],
  ['relics', 'h2', 'h1', 45],
  ['relics', 'd', null, 60],
  // La Loterie, « Le Bandit manchot » (17/10, .ai/maquette-etherium-loterie.html) : la fente est offerte quand un premier
  // jeton est joué ; le levier (le jeton), puis les trois rouleaux : le temps, la valeur, la chance. Chaque étoile d'un
  // rouleau rend la machine plus généreuse et plus cruelle (data/lottery.ts, LOTTERY_STARS).
  ['lottery', 'j1', null, 15],
  ['lottery', 'j2', 'j1', 50],
  ['lottery', 'g1', null, 20],
  ['lottery', 'g2', 'g1', 60],
  ['lottery', 'm1', null, 25],
  ['lottery', 'm2', 'm1', 80],
  ['lottery', 'd1', null, 30],
  ['lottery', 'd2', 'd1', 100],
  // Le Rideau, la fausse fin (14/10, .ai/maquette-faux-livre.html, conception §9.2) : la tringle depuis son milieu, puis le
  // bas des plis et l'ourlet ; chaque étoile fait remonter une bribe de « Mon histoire vraie ». La dernière, l'ourlet de
  // droite, attend toutes les autres (WAITS_FOR_PAGE).
  ['curtain', 'c0', null, 10],
  ['curtain', 'lm', 'c0', 25],
  ['curtain', 'rm', 'c0', 60],
  ['curtain', 'l', 'lm', 150],
  ['curtain', 'r', 'rm', 400],
  ['curtain', 'blm', 'lm', 1000],
  ['curtain', 'brm', 'rm', 3000],
  ['curtain', 'bl', 'l', 10_000],
  ['curtain', 'br', 'r', 100_000],
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
 * Dimensionnel et Infini, et la Goutte (la méthode secrète de l'Âge Automatique, mise de côté). Elles se
 * voient sans dire leur nom, ne s'allument pas, et les sceaux de l'Etherium ne les comptent pas.
 */
export const CLOSED: ReadonlySet<string> = new Set([
  'ages.dim',
  'ages.inf',
  'memory.a0',
  // Les pointes de la Rose des vents qui n'ouvrent encore rien.
  ...['n', 's', 'd0', 'd1', 'd2', 'd3'].map((id) => `explore.${id}`),
]);

/** Fermées, mais sans bloquer la suite : les étoiles d'après la Goutte attendent celle d'avant elle. */
const PASSABLE: ReadonlySet<string> = new Set(['memory.a0']);

/** Les étoiles qui peuvent s'allumer aujourd'hui (les sceaux de l'Etherium les comptent). */
export const OPEN_STARS: readonly Star[] = STARS.filter((star) => !CLOSED.has(star.id));

/** Les étoiles qui attendent, en plus de la leur, toutes les autres étoiles de leur page : l'ourlet de droite du Rideau. */
export const WAITS_FOR_PAGE: ReadonlySet<string> = new Set(['curtain.br']);

/**
 * L'étoile d'avant est allumée (ou, pour la Goutte, celle d'avant elle), ou il n'y en a pas : `star` peut s'allumer. Une
 * étoile de WAITS_FOR_PAGE attend aussi toutes les autres de sa page.
 */
export const afterLit = (star: Star, lit: (id: string) => boolean): boolean => {
  if (WAITS_FOR_PAGE.has(star.id) && STARS.some((other) => other.page === star.page && other.id !== star.id && !lit(other.id)))
    return false;
  if (!star.after) return true;
  if (lit(star.after)) return true;
  const before = starById(star.after);
  return !!before && PASSABLE.has(before.id) && afterLit(before, lit);
};

/** Chaque alvéole de la Ruche d'après le Manuel ne s'ouvre qu'avec son Âge (l'étoile de l'Escalier), par sa lettre. */
const CELL_AGES: Record<string, string> = { a: AUTOMATIC_AGE, n: DIGITAL_AGE };
/** La lettre de l'alvéole d'une étoile de la Ruche : « memory.n3 » → « n ». */
const cellOf = (id: string): string => id.slice('memory.'.length, 'memory.'.length + 1);

/** Les étoiles des alvéoles Automatique et Numérique, et l'Âge que chacune attend. */
export const NEEDS_AGE: ReadonlyMap<string, string> = new Map(
  STARS.filter((star) => star.page === 'memory' && cellOf(star.id) in CELL_AGES).map((star) => [star.id, CELL_AGES[cellOf(star.id)]]),
);

/**
 * Une page qu'une autre débloque : blanche jusque-là, absente du sommaire (la Mimic, par l'Est de l'Exploration ; le Minitel,
 * par l'Âge Numérique).
 */
export const PAGE_NEEDS: Partial<Record<PageId, string>> = { mimic: 'explore.e', relics: 'explore.w', screen: DIGITAL_AGE };

/** Une page qui attend un premier jeton joué : la Loterie (blanche jusque-là, absente du sommaire). */
export const PAGE_NEEDS_DRAW: ReadonlySet<PageId> = new Set(['lottery']);

/** Une page qui attend l'Éther reçu : le Poids, quand l'Éther commence à peser (blanche jusque-là, absente du sommaire). */
export const PAGE_NEEDS_ETHER: Partial<Record<PageId, number>> = { weight: ETHER_WEIGHT.from };

/** L'étoile qu'il faut avoir allumée avant de pouvoir allumer `id` : l'Âge de son alvéole, ou celle qui débloque sa page. */
export const neededFor = (id: string): string | undefined => NEEDS_AGE.get(id) ?? PAGE_NEEDS[id.slice(0, id.indexOf('.')) as PageId];

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
  knowledge: {
    'knowledge.f': 1.5,
    'knowledge.b': 1.5,
    'knowledge.wr': 2,
    'knowledge.er': 2,
    'knowledge.ar': 3,
    // Le clavier du Minitel.
    'screen.k1': 1.25,
    'screen.k2': 1.5,
    'screen.k3': 1.5,
    'screen.k4': 2,
  },
  /** ×pages/s des méthodes de l'Âge Numérique (la prise et l'écran du Minitel). */
  digitalReading: { 'screen.plug': 1.1, 'screen.s1': 1.25, 'screen.s2': 1.25, 'screen.s3': 1.5, 'screen.s4': 2 },
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
  /** ×apparitions de la Mimic (les dents du haut ; la plus haute compte). */
  mimicComes: { 'mimic.t1': 1.25, 'mimic.t2': 1.5, 'mimic.t3': 2 },
  /** + part rendue par la Mimic, en plus des 10 % (les dents du bas ; la plus haute compte). */
  mimicGives: { 'mimic.b1': 0.2, 'mimic.b2': 0.35, 'mimic.b3': 0.5, 'mimic.b4': 0.75, 'mimic.b5': 1 },
  /** + exposant du poids de la Bibliothèque (l'Atlas ; data/etherium.ts, ETHER_WEIGHT). */
  weight: {
    'weight.w1': 0.1,
    'weight.w2': 0.1,
    'weight.w3': 0.1,
    'weight.w4': 0.1,
    'weight.w5': 0.1,
    'weight.w6': 0.1,
    'weight.w7': 0.1,
  },
  /**
   * +pages/s par tome de « L'histoire de Babel » fini, ajoutés entre eux, à part (l'auteur, 17/10 : +15 % par tome, au lieu
   * du ×2 de « Mon histoire vraie ») : le Rideau entier, le tome 1.
   */
  storyReading: { 'curtain.br': 0.15 },
  /** Les branches de la Loterie (data/lottery.ts, LOTTERY_STARS) : le niveau de chacune, la plus haute allumée compte. */
  lotteryToken: { 'lottery.j1': 1, 'lottery.j2': 2 },
  lotteryTime: { 'lottery.g1': 1, 'lottery.g2': 2 },
  lotteryValue: { 'lottery.m1': 1, 'lottery.m2': 2 },
  lotteryLuck: { 'lottery.d1': 1, 'lottery.d2': 2 },
  /** Le niveau du bonus de chaque relique (data/relics.ts, RelicDef.bonus) : ses deux étoiles ; la plus haute compte. */
  relicLevel: { 'relics.l1': 1, 'relics.l2': 2, 'relics.a1': 1, 'relics.a2': 2, 'relics.h1': 1, 'relics.h2': 2 },
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
  age: AUTOMATIC_AGE,
  letterStays: 'quill.l3',
  mimic: 'explore.e',
  mimicEye: 'mimic.eye',
  relics: 'explore.w',
  patience: 'relics.d',
  storyEnd: 'curtain.br',
} as const;

/** Les deux étoiles de chaque relique, sur la page « Les reliques » (leur lettre : la loupe, l'astrolabe, le sablier). */
export const RELIC_BRANCH: Record<string, string> = { loupe: 'l', astrolabe: 'a', hourglass: 'h' };

/** Mémoire des méthodes : l'étoile qui garde la phrase de chaque méthode (Manuel, Automatique, puis Numérique). */
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
  minitel: 'memory.n1',
  computer: 'memory.n2',
  search: 'memory.n3',
  crawler: 'memory.n4',
  algorithm: 'memory.n5',
};
