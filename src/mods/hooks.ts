/**
 * Les crochets des mods (plan validé le 14/10, .ai/plan-mods.md) : le jeu les appelle à ses moments, un mod s'y
 * branche par IdleBabel.registerHook. Aucun import du jeu ici : les systèmes l'appellent sans boucle d'imports.
 */

/** Chaque crochet, ce qu'il reçoit et ce qu'il rend (la page de documentation, public/mods/index.html, les reprend tous). */
export interface Hooks {
  /** À chaque pas de la boucle (onglet caché compris) : les secondes écoulées. */
  tick: (seconds: number) => void;
  /** À chaque mise à jour de l'écran (onglet visible). */
  draw: () => void;
  /** Calcul de la production : un multiplicateur de la lecture de toutes les méthodes. */
  reading: () => number;
  /** Une feuille tournée à la main : un multiplicateur de ses pages. */
  click: () => number;
  /** Une trouvaille lue. */
  find: (find: ModFind) => void;
  /** Juste après un prestige (« Le nourrir »). */
  prestige: () => void;
  /** La sauvegarde effacée. */
  reset: () => void;
  /** Une Mimic va apparaître : false l'en empêche. */
  mimic: () => boolean | void;
  /** Une lettre vient de paraître : `catch()` l'attrape comme un clic. */
  letter: (letter: ModLetter) => void;
}

export type HookName = keyof Hooks;

export const HOOK_NAMES: readonly HookName[] = ['tick', 'draw', 'reading', 'click', 'find', 'prestige', 'reset', 'mimic', 'letter'];

/** Une trouvaille, telle qu'un mod la voit. */
export interface ModFind {
  kind: 'word' | 'piece' | 'sentence';
  /** Le texte trouvé (le morceau, ou la phrase entière). */
  text: string;
  /** Un morceau déjà écrit : il rapporte sa Connaissance, rien de neuf ne s'écrit. */
  duplicate: boolean;
}

/** Une lettre à l'écran : `letter` (un bonus) ou une lettre du mot BABEL (`word`). */
export interface ModLetter {
  id: 'letter' | 'word';
  /** Le signe qui monte du livre. */
  glyph: string;
  /** L'attrape, comme un clic dessus (sans effet si elle est déjà prise ou éteinte). */
  catch: () => void;
}

const hooks: { [N in HookName]: Hooks[N][] } = {
  tick: [],
  draw: [],
  reading: [],
  click: [],
  find: [],
  prestige: [],
  reset: [],
  mimic: [],
  letter: [],
};

export const isHookName = (name: string): name is HookName => (HOOK_NAMES as readonly string[]).includes(name);

export const registerHook = <N extends HookName>(name: N, hook: Hooks[N]): void => {
  hooks[name].push(hook);
};

/** Un mod qui plante ne fait pas planter le jeu : l'erreur est dite dans la console, le crochet est sauté. */
const call = <N extends HookName>(name: N, hook: Hooks[N], args: Parameters<Hooks[N]>): ReturnType<Hooks[N]> | undefined => {
  try {
    return (hook as (...a: Parameters<Hooks[N]>) => ReturnType<Hooks[N]>)(...args);
  } catch (error) {
    console.error(`[Idle Babel] mod, crochet « ${name} » :`, error);
    return undefined;
  }
};

export const runHooks = <N extends HookName>(name: N, ...args: Parameters<Hooks[N]>): void => {
  for (const hook of hooks[name]) call(name, hook, args);
};

/** Le produit de ce que rendent les crochets (`reading`, `click`) : 1 sans mod ; un nombre invalide ne compte pas. */
export const hookProduct = (name: 'reading' | 'click'): number => {
  let product = 1;
  for (const hook of hooks[name]) {
    const factor = call(name, hook, []);
    if (typeof factor === 'number' && Number.isFinite(factor) && factor >= 0) product *= factor;
  }
  return product;
};

/** Faux si l'un des crochets rend `false` (`mimic`). */
export const hookAllows = (name: 'mimic'): boolean => hooks[name].every((hook) => call(name, hook, []) !== false);

/** Tests : plus aucun crochet. */
export const clearHooks = (): void => {
  for (const name of HOOK_NAMES) hooks[name].length = 0;
};
