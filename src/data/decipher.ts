/**
 * Déchiffrer le livre étrange : chaque partie devient lisible dès qu'on la paie en Connaissance, ou
 * toute seule quand la Connaissance trouvée à vie atteint son palier. Une fois lue, pour toujours.
 */
export type PartId = 'contents' | 'pages' | 'books' | 'time' | 'methods' | 'knowledge' | 'seals';

export interface PartDef {
  /** Prix en Connaissance ; sans prix, la partie ne s'achète pas (elle vient seule). */
  price?: number;
  /** Connaissance trouvée à vie à partir de laquelle la partie se lit toute seule. */
  freeAt: number;
}

export const PARTS: Record<PartId, PartDef> = {
  // La toute première trouvaille rend lisibles le sommaire et les titres.
  contents: { freeAt: 1 },
  pages: { price: 1, freeAt: 3 },
  books: { price: 2, freeAt: 5 },
  time: { price: 2, freeAt: 5 },
  methods: { price: 3, freeAt: 8 },
  knowledge: { price: 3, freeAt: 8 },
  seals: { price: 5, freeAt: 12 },
};
