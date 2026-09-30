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
  /** En sortant du livre blanc la première fois (« Regarder autour de moi », ui/app.ts) : il prend un livre. */
  'firstBook',
  /** La toute première trouvaille lue : une phrase qu'on comprend (systems/knowledge.ts). */
  'firstKnowledge',
] as const;

export type LoreId = (typeof LORE)[number];

/**
 * Fond d'un moment, s'il n'est pas le décor assombri : noir (le chercheur n'y voit encore rien), ou à
 * peine voilé (il découvre la pièce et le livre qu'il vient de prendre).
 */
export const LORE_BACKDROP: Partial<Record<LoreId, 'black' | 'light'>> = { lookAround: 'black', firstBook: 'light' };
