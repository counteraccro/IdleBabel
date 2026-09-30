/**
 * Moments de lore : un court récit qui s'affiche une fois, sur le décor assombri (ui/lore.ts). Pour en
 * ajouter un : son identifiant ici, son texte dans i18n (lore.<id> : titre, paragraphes), puis
 * tellLore(state, '<id>') là où il se déclenche. `{name}` dans le texte : le nom du joueur.
 */
export const LORE = [
  /** Juste après le réveil (accueil) : ce que le chercheur a autour de lui et en main (ui/app.ts). */
  'lookAround',
  /** Le livre blanc ouvert pour la première fois (ui/app.ts) : familier, et pourtant illisible. */
  'whiteBook',
  /** La toute première trouvaille lue : une phrase qu'on comprend (systems/knowledge.ts). */
  'firstKnowledge',
] as const;

export type LoreId = (typeof LORE)[number];

/** Moments racontés sur fond noir, sans le décor derrière (le chercheur n'y voit encore rien). */
export const LORE_IN_THE_DARK: readonly LoreId[] = ['lookAround'];
