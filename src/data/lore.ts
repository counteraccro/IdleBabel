/**
 * Moments de lore : un court récit qui s'affiche une fois, sur le décor assombri (ui/lore.ts). Pour en
 * ajouter un : son identifiant ici, son texte dans i18n (lore.<id> : titre, paragraphes), puis
 * tellLore(state, '<id>') là où il se déclenche. `{name}` dans le texte : le nom du joueur.
 */
export const LORE = [
  /** La toute première trouvaille lue : une phrase qu'on comprend (systems/knowledge.ts). */
  'firstKnowledge',
] as const;

export type LoreId = (typeof LORE)[number];
