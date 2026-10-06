/**
 * Déchiffrer le Grand Livre : chaque partie devient lisible toute seule quand la Connaissance trouvée à
 * vie atteint son palier. Une fois lue, pour toujours. (Elles s'achetaient aussi : retiré le 03/10/2026,
 * décision de l'auteur, le palier venait presque aussitôt.)
 */
export type PartId = 'contents' | 'pages' | 'books' | 'time' | 'methods' | 'knowledge' | 'rareBooks' | 'ether' | 'seals';

/** Connaissance trouvée à vie à partir de laquelle chaque partie se lit. */
export const READABLE_AT: Record<PartId, number> = {
  // La toute première trouvaille rend lisibles le sommaire et les titres.
  contents: 1,
  pages: 3,
  books: 5,
  time: 5,
  methods: 8,
  knowledge: 8,
  rareBooks: 8,
  // Le chapitre de l'Éther n'existe qu'après le premier prestige : la Connaissance a toujours assez grandi.
  ether: 12,
  seals: 12,
};

export const PARTS = Object.keys(READABLE_AT) as PartId[];
