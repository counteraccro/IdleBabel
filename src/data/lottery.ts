/**
 * La Loterie (l'auteur, 16/10/2026 ; .ai/plan-fausses-fins.md, « les jetons et les tirages ») : un jeton, le levier, trois
 * rouleaux aux chiffres de Babel. Les chances sont celles validées par l'auteur, à régler au simulateur.
 */

/** Ce que peut donner un tirage, et sa part (sur 100). */
export const OUTCOMES = [
  // Trois chiffres différents : le jeton est perdu.
  { id: 'nothing', weight: 40 },
  // Deux pareils : 30 min de lecture d'absence, d'un coup.
  { id: 'gain', weight: 28 },
  // Trois pareils (ni 7 ni 0) : un bonus d'une heure.
  { id: 'boon', weight: 18 },
  // Trois 0 : un malus.
  { id: 'curse', weight: 12 },
  // Trois 7 : le tome suivant de « L'histoire de Babel » (systems/endings.ts, nextTome).
  { id: 'jackpot', weight: 2 },
] as const;
export type OutcomeId = (typeof OUTCOMES)[number]['id'];

/** Le gain : autant de secondes de lecture d'absence (pages et Connaissance). */
export const GAIN_SECONDS = 30 * 60;

/**
 * Les bonus de la Loterie, une heure chacun : la production de toutes les méthodes, ou d'une seule (×10). Un seul de chaque
 * à la fois ; tous en cours, la machine se bloque (l'auteur, 16/10).
 */
export const LOTTERY_BOONS = [
  { id: 'all15', weight: 40, factor: 1.5 },
  { id: 'all2', weight: 30, factor: 2 },
  { id: 'method10', weight: 20, factor: 5 },
  { id: 'all3', weight: 10, factor: 3 },
] as const;
export const BOON_SECONDS = 3600;

/** Les malus : dix minutes ; la Mimic dorée, cinq. */
export const LOTTERY_CURSES = [
  // La production ÷ 2.
  { id: 'half', weight: 45 },
  // La méthode qui lit le plus ne lit plus.
  { id: 'stopped', weight: 45 },
  // On ne peut pas la tuer ; elle mange tout ce qui est gagné, puis s'en va sans rien rendre.
  { id: 'golden', weight: 10 },
] as const;
export const CURSE_SECONDS = 10 * 60;
export const GOLDEN_SECONDS = 5 * 60;
/** Les rouleaux tournent tant (ms) : le tirage ne compte qu'à l'arrêt du dernier (ui/library/lotteryMachine3d.ts). */
export const LOTTERY_SPIN_MS = 2700;
export type LotteryBoonId = (typeof LOTTERY_BOONS)[number]['id'];
export type LotteryCurseId = (typeof LOTTERY_CURSES)[number]['id'];
/** Ce qui dure, avec son médaillon : les bonus, et les malus sauf la Mimic dorée (elle est dans la salle). */
export type LotteryEffectId = LotteryBoonId | Exclude<LotteryCurseId, 'golden'>;

/**
 * Le Jeton, la 5e relique (l'auteur, 18/10) : les rouleaux s'arrêtent sur 4 · 1 · 0, une fois sur 50 tant qu'il n'est
 * pas trouvé (jamais ensuite). Ces chances sont prises sur « rien » : le jeton aurait été perdu.
 */
export const RELIC_REELS = [4, 1, 0] as const;
export const RELIC_TOKEN_ODDS = 1 / 50;

/** Une Mimic attrapée lâche un jeton, une fois sur trois. */
export const MIMIC_TOKEN_CHANCE = 1 / 3;

/**
 * Ce que changent les étoiles de la page « La Loterie » de l'Etherium (l'auteur, 17/10, .ai/maquette-etherium-loterie.html),
 * par niveau de leur branche (0 : sans étoile, puis 1 et 2). Chaque rouleau rend la machine plus généreuse, et plus cruelle.
 */
export const LOTTERY_STARS = {
  /** Le levier : la chance qu'une Mimic attrapée lâche un jeton. */
  token: [MIMIC_TOKEN_CHANCE, 1 / 2, 2 / 3],
  /** Le rouleau du temps : les secondes du gain, des bonus, des malus et de la Mimic dorée. */
  time: {
    gain: [GAIN_SECONDS, 45 * 60, 60 * 60],
    boon: [BOON_SECONDS, 90 * 60, 120 * 60],
    curse: [CURSE_SECONDS, 15 * 60, 20 * 60],
    golden: [GOLDEN_SECONDS, 8 * 60, 10 * 60],
  },
  /** Le rouleau de la valeur : ce que les bonus ajoutent, multiplié ; la production divisée par tant pendant le malus. */
  value: { boost: [1, 1.5, 2], half: [2, 3, 4] },
  /** Le rouleau de la chance : la part de chaque résultat (sur 100) ; « rien » baisse, les malus montent. */
  luck: {
    nothing: [40, 30, 20],
    gain: [28, 30, 32],
    boon: [18, 20, 22],
    curse: [12, 18, 24],
    jackpot: [2, 2, 2],
  } satisfies Record<OutcomeId, readonly number[]>,
} as const;

/** Frappée tant de fois, la Mimic dorée (qu'on ne peut pas tuer) : un sceau secret. */
export const GOLDEN_STRIKES = 10;

/** Le chiffre de Babel des rouleaux pour le gros lot, et pour le malus. */
export const JACKPOT_DIGIT = 7;
export const CURSE_DIGIT = 0;

/** Les paliers des jetons joués (sceaux de la planche « La Loterie »). */
export const TOKENS_SPENT_STEPS = [1, 10, 50, 150, 410, 1000];
