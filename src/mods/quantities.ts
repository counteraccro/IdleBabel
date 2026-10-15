/**
 * Les grandeurs (demande de l'auteur, 16/10 ; .ai/plan-mods-contenu.md §1) : chaque chiffre du jeu qu'un mod peut
 * changer porte un nom, et se calcule à un seul endroit, qui demande ici ce qu'en font les mods.
 * - `IdleBabel.modify(nom, fonction)` : un facteur (×) ou un ajout (+), selon la grandeur ;
 * - `IdleBabel.tune(nom, valeur)` : une règle de base du jeu (la hausse des prix, le seuil de découverte…).
 * Sans mod, rien ne change, au bit près : le produit vide vaut 1, la somme vide 0, une règle non réglée sa valeur du jeu.
 * Aucun import du jeu ici (comme hooks.ts) : les systèmes l'appellent sans boucle d'imports.
 */

/** Comment les mods se combinent sur une grandeur : leurs facteurs se multiplient, ou leurs ajouts s'additionnent. */
type Combine = 'product' | 'sum';

/** Chaque grandeur, et comment elle se combine (la page de documentation, public/mods/index.html, les reprend toutes). */
export const QUANTITIES = {
  /** × pages/s de toutes les méthodes (comme le crochet `reading`). */
  reading: 'product',
  /** × pages d'une feuille tournée à la main (comme le crochet `click`). */
  click: 'product',
  /** + part de la production d'une seconde, gagnée à chaque clic (0,01 : 1 %). */
  clickShare: 'sum',
  /** × prix de toutes les méthodes. */
  methodCost: 'product',
  /** + feuilles tournées seules au plus par seconde. */
  turns: 'sum',
  /** × chance qu'une page cache une trouvaille. */
  findChance: 'product',
  /** × Connaissance par trouvaille. */
  knowledge: 'product',
  /** + part des trouvailles qui répètent un morceau déjà écrit (négatif : moins de doublons). */
  duplicates: 'sum',
  /** × prix des intuitions. */
  intuitionCost: 'product',
  /** × chance qu'un livre soit rare. */
  rareChance: 'product',
  /** + part de la lecture comptée pendant une absence (0,1 : 10 %). */
  awayShare: 'sum',
  /** + heures d'absence comptées au plus. */
  awayHours: 'sum',
  /** × attente entre deux lettres. */
  letterWait: 'product',
  /** + secondes où la lettre reste à l'écran. */
  letterStays: 'sum',
  /** × durée des bonus de la lettre. */
  boonLength: 'product',
  /** × attente moyenne entre deux Mimics. */
  mimicEvery: 'product',
  /** + part que rend la Mimic en plus de ce qu'elle a avalé (0,1 : 10 %). */
  mimicGives: 'sum',
  /** × délai avant de pouvoir changer de relique. */
  relicLock: 'product',
} as const satisfies Record<string, Combine>;

export type QuantityName = keyof typeof QUANTITIES;

/** Les grandeurs d'une seule méthode : « method:<id> » (× ses pages/s), « methodCost:<id> » (× son prix). */
const PER_METHOD: Record<string, Combine> = { method: 'product', methodCost: 'product' };

/** La façon de combiner `name`, s'il existe (« method:diagonal » compris) ; undefined sinon. */
export const combineOf = (name: string): Combine | undefined => {
  if (Object.hasOwn(QUANTITIES, name)) return QUANTITIES[name as QuantityName];
  const colon = name.indexOf(':');
  return colon > 0 && colon < name.length - 1 ? PER_METHOD[name.slice(0, colon)] : undefined;
};

const modifiers = new Map<string, (() => unknown)[]>();

/** Ajoute ce qu'un mod fait à une grandeur ; refusé (false) si le nom est inconnu ou que ce n'est pas une fonction. */
export const modify = (name: string, modifier: () => unknown): boolean => {
  if (combineOf(name) === undefined || typeof modifier !== 'function') return false;
  const list = modifiers.get(name) ?? [];
  list.push(modifier);
  modifiers.set(name, list);
  return true;
};

/**
 * Ce que les mods font à `name` : le produit de leurs facteurs (1 sans mod), ou la somme de leurs ajouts (0 sans mod).
 * Un mod qui plante ou rend autre chose qu'un nombre fini (négatif, pour un facteur) ne compte pas.
 */
export const modded = (name: string): number => {
  const list = modifiers.get(name);
  const product = combineOf(name) === 'product';
  let value = product ? 1 : 0;
  if (!list) return value;
  for (const modifier of list) {
    let result: unknown;
    try {
      result = modifier();
    } catch (error) {
      console.error(`[Idle Babel] mod, grandeur « ${name} » :`, error);
      continue;
    }
    if (typeof result !== 'number' || !Number.isFinite(result)) continue;
    if (product) {
      if (result >= 0) value *= result;
    } else value += result;
  }
  return value;
};

/** Les règles de base qu'un mod peut régler, leur valeur dans le jeu, et ce qu'elles acceptent. */
export const RULES = {
  /** Chaque méthode coûte tant de fois la précédente (1,15). */
  costGrowth: { min: 1.0001, max: 10, integer: false },
  /** Exemplaires de la méthode d'avant qu'il faut pour trouver la phrase de la suivante (25). */
  methodGate: { min: 0, max: 100, integer: true },
  /** Pages lues à vie pour le premier Éther ; le n-ième en demande n³ fois plus (1 milliard). */
  etherPages: { min: 1, max: 1e300, integer: false },
} as const;

export type RuleName = keyof typeof RULES;

const tuned = new Map<RuleName, number>();

/** Règle une règle du jeu ; refusé (false) si le nom est inconnu ou la valeur hors de ses bornes. Le dernier mod gagne. */
export const tune = (name: string, value: unknown): boolean => {
  if (!Object.hasOwn(RULES, name)) return false;
  const rule = RULES[name as RuleName];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max) return false;
  if (rule.integer && !Number.isInteger(value)) return false;
  tuned.set(name as RuleName, value);
  return true;
};

/** La valeur d'une règle : celle d'un mod, sinon `base`, celle du jeu. */
export const rule = (name: RuleName, base: number): number => tuned.get(name) ?? base;

/** Tests : plus aucune modification ni règle réglée. */
export const clearQuantities = (): void => {
  modifiers.clear();
  tuned.clear();
};
