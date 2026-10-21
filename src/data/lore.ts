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
  /**
   * La première intuition à portée, pour qui n'en a jamais compris (systems/knowledge.ts) : le livre blanc s'ouvre ensuite
   * sur sa page (ui/lore.ts). Un collègue avait joué deux semaines sans voir qu'elles s'achetaient (l'auteur, 21/10).
   */
  'firstIntuition',
  /**
   * Le premier livre refermé (systems/books.ts) : le chercheur le garde, sa première trouvaille, et une clé
   * de laiton apparaît dans sa poche (celle de la bibliothèque, où ce livre est rangé).
   */
  'firstBookKept',
  /**
   * Le Grand Livre arrive en main, le troisième (systems/books.ts) : des comptes illisibles, qui parleront
   * à mesure de la Connaissance. Il s'ouvre ensuite en grand (ui/lore.ts).
   */
  'strangeBook',
  /**
   * Une relique trouvée dans sa salle (systems/relics.ts) : un morceau du récit de celui qui a cherché avant lui
   * (validés par l'auteur le 11/10, .ai/plan-reliques.md). Relu ensuite sur son sceau du Grand Livre.
   */
  'relicLoupe',
  'relicAstrolabe',
  'relicHourglass',
  /** Le Crayon, gagné par les tâches (17/10). */
  'relicPencil',
  /** Le Jeton, donné par la Loterie (18/10). */
  'relicToken',
] as const;

export type LoreId = (typeof LORE)[number];

/**
 * Fond d'un moment, s'il n'est pas le décor assombri : noir (le chercheur n'y voit encore rien), ou à
 * peine voilé (il découvre la pièce et le livre qu'il vient de prendre).
 */
export const LORE_BACKDROP: Partial<Record<LoreId, 'black' | 'light'>> = { lookAround: 'black', firstBook: 'light' };
