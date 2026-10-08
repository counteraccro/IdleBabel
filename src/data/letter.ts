/**
 * La lettre qui s'échappe (Alpha 1.1, décidé avec l'auteur le 08/10/2026 ; .ai/plan-bonus-temporaires.md, maquette
 * .ai/maquette-bonus-temporaires.html) : de temps en temps, une lettre de Babel monte du livre en main. Attrapée, elle
 * donne un bonus, quelques secondes. Sans Etherium, elle est rare, brève, et ne donne que la Transe ; la Plume
 * (data/etheriumStars.ts) la fait venir plus souvent, rester plus longtemps, et lui apprend les autres bonus ; ses
 * intuitions (le Guet, le Souffle retenu, la Lettre comprise) apparaissent à la première lettre attrapée.
 */

/** L'attente entre deux lettres, en secondes, sans Etherium ni intuition : tirée au hasard entre les deux. */
export const LETTER_WAIT = { min: 600, max: 1200 } as const;

/** Le temps qu'elle reste à l'écran, en secondes (avant le Souffle retenu et la Plume). */
export const LETTER_STAYS = 8;

/** Attrapée dans ses dernières secondes : un sceau secret (« au moment où elle s'éteignait »). */
export const LAST_INSTANT = 0.5;

export const BOON_IDS = ['trance', 'eye', 'hand', 'mind', 'deal', 'flash', 'find'] as const;
export type BoonId = (typeof BOON_IDS)[number];

export interface BoonDef {
  id: BoonId;
  /** L'étoile de la Plume qui l'apprend ; aucune : la lettre le donne dès le début (la Transe). */
  star?: string;
  /** Sa durée de base, en secondes ; aucune : il agit d'un coup. */
  seconds?: number;
  /** Sa part au tirage, parmi ceux que la lettre connaît. */
  weight: number;
}

export const BOONS: readonly BoonDef[] = [
  // Transe : lecture ×2 (×3, ×4 avec la pointe de la Plume).
  { id: 'trance', seconds: 30, weight: 35 },
  // Œil vif : chance de trouvaille +200 %.
  { id: 'eye', star: 'quill.r1', seconds: 15, weight: 15 },
  // Main légère : pages d'un clic ×10.
  { id: 'hand', star: 'quill.r2', seconds: 10, weight: 15 },
  // Mémoire vive : Connaissance par trouvaille ×3.
  { id: 'mind', star: 'quill.r3', seconds: 15, weight: 12 },
  // Aubaine : méthodes à moitié prix.
  { id: 'deal', star: 'quill.r4', seconds: 10, weight: 10 },
  // Éclair : d'un coup, trois minutes de lecture.
  { id: 'flash', star: 'quill.r5', weight: 10 },
  // Trouvaille : une trouvaille, tout de suite.
  { id: 'find', star: 'quill.r6', weight: 3 },
];

/** Ce que font les bonus. */
export const BOON = {
  /** Transe : ×lecture, sans la pointe de la Plume. */
  trance: 2,
  /** Œil vif : ×chance de trouvaille (+200 %). */
  eye: 3,
  /** Main légère : ×pages d'un clic. */
  hand: 10,
  /** Mémoire vive : ×Connaissance par trouvaille. */
  mind: 3,
  /** Aubaine : ×prix des méthodes. */
  deal: 0.5,
  /** Éclair : secondes de lecture données d'un coup. */
  flash: 180,
} as const;

/**
 * Le mot BABEL (idée de l'auteur, 08/10) : rarement, à la place d'une lettre, il vient lettre par lettre. Chacune
 * attrapée donne aussitôt une part des pages en réserve ; une lettre ratée arrête le mot. Le mot entier : un sceau secret.
 */
export const BABEL_WORD: readonly (readonly [string, number])[] = [
  ['b', 0.02],
  ['a', 0.05],
  ['b', 0.07],
  ['e', 0.1],
  ['l', 0.15],
];
/** Une lettre sur tant est le mot. */
export const BABEL_ODDS = 20;
/** Le temps entre deux lettres du mot, en secondes. */
export const BABEL_GAP = 0.9;

// Les intuitions de la lettre (data/technologies.ts) : ce que fait chaque niveau.

/** Le Guet : part de l'attente en moins. */
export const WATCH_STEP = 0.05;
/** Le Souffle retenu : secondes à l'écran en plus. */
export const BREATH_STEP = 1;
/** La Lettre comprise : part de durée des bonus en plus. */
export const UNDERSTOOD_STEP = 0.1;
