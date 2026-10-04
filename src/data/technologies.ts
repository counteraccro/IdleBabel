import type { ToolId } from './tools';

/**
 * Intuitions (les Technologies de la conception, §5) : des choses que le chercheur finit par comprendre,
 * achetées en Connaissance, niveau après niveau. Chacune a sa page dans la partie « Intuitions » du livre
 * blanc (ui/whiteBook/intuitionPage.ts), dans l'ordre de cette liste. Textes : whiteBook.intuitions.<id>
 * (celles des méthodes : whiteBook.intuitions.gestures.<méthode>). Celles de l'Âge I ; chiffres provisoires.
 */
export interface TechnologyDef {
  id: string;
  /** Prix en Connaissance de chaque niveau, dans l'ordre. */
  prices: readonly number[];
  /** Sans fin : après le dernier prix de la liste, chaque niveau coûte `growth` fois le précédent. */
  growth?: number;
  /** Intuition d'une méthode de lecture : elle double sa production à chaque niveau. */
  tool?: ToolId;
}

/** Filtre sémantique : chaque niveau multiplie la chance qu'une page cache une trouvaille. */
export const FILTER_BONUS = 1.5;
/** Fil d'Ariane : part des trouvailles tirées dans la phrase de méthode en cours, en plus, à chaque niveau. */
export const ARIADNE_STEP = 0.1;
/** Mémoire des phrases : part des doublons en moins, à chaque niveau. */
export const MEMORY_STEP = 0.05;
/** Lecture rapide : feuilles tournées seules au plus par seconde, à chaque niveau (le premier : sans elle). */
export const SPEED_LEVELS = [8, 10, 12, 14, 16, 20] as const;
/** Mémoire musculaire : part de la production d'une seconde que rapporte en plus chaque clic, à chaque niveau. */
export const MUSCLE_STEP = 0.01;
/** Cartographie du Retour : part de la lecture comptée pendant une absence, en plus, à chaque niveau. */
export const RETURN_STEP = 0.1;
/** Sommeil profond : absence comptée en plus, à chaque niveau (en secondes). */
export const SLEEP_STEP = 3600;
/** Flair : un livre sur combien est rare, à chaque niveau (le premier : sans lui). */
export const FLAIR_LEVELS = [200, 175, 150, 125, 100] as const;
/** Économie du geste : le prix des méthodes multiplié par tant, à chaque niveau (−0,5 %, sans fin). */
export const BARGAIN_FACTOR = 0.995;
/** Intuition d'une méthode : sa production multipliée par tant, à chaque niveau. */
export const GESTURE_BONUS = 2;

/** Les 5 niveaux de l'intuition d'une méthode : le premier prix, puis ×2 à chaque niveau. */
const gesture = (first: number): number[] => [1, 2, 4, 8, 16].map((step) => first * step);

export const TECHNOLOGIES = [
  { id: 'semanticFilter', prices: [25, 250, 2_500, 25_000, 250_000] },
  { id: 'ariadne', prices: [150, 750, 3_750] },
  { id: 'sentenceMemory', prices: [100, 400, 1_600, 6_400] },
  { id: 'speedReading', prices: [250, 1_000, 4_000, 16_000, 64_000] },
  { id: 'muscleMemory', prices: [50, 200, 800, 3_200, 12_800] },
  { id: 'returnMap', prices: [500, 1_500, 5_000, 15_000, 50_000] },
  { id: 'deepSleep', prices: [2_500], growth: 2 },
  { id: 'flair', prices: [500, 2_000, 8_000, 32_000] },
  { id: 'bargain', prices: [1_000], growth: 2 },
  { id: 'diagonalGesture', prices: gesture(50), tool: 'diagonal' },
  { id: 'fingerGesture', prices: gesture(125), tool: 'finger' },
  { id: 'thumbGesture', prices: gesture(300), tool: 'thumb' },
  { id: 'voiceGesture', prices: gesture(750), tool: 'voice' },
  { id: 'wideGesture', prices: gesture(2_000), tool: 'wide' },
  { id: 'doubleGesture', prices: gesture(5_000), tool: 'double' },
  { id: 'mirrorGesture', prices: gesture(12_500), tool: 'mirror' },
  { id: 'lecternGesture', prices: gesture(30_000), tool: 'lectern' },
  { id: 'ladderGesture', prices: gesture(75_000), tool: 'ladder' },
] as const satisfies readonly TechnologyDef[];

export type TechnologyId = (typeof TECHNOLOGIES)[number]['id'];
