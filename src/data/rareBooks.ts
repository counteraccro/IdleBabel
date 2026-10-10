/**
 * Livres rares : très rarement, le livre pris sur l'étagère est un livre « connu », que la Bibliothèque
 * contient forcément. Chacun est unique : une fois trouvé, il ne revient jamais (même après l'Exil), et
 * il a son sceau (planche « Livres rares »). Pour en ajouter un : une ligne ici, et son titre dans
 * i18n (rareBooks.<id> : `name` dans les textes, `cover` ligne par ligne sur la couverture).
 * Textes du domaine public ou inventés uniquement. Décisions de l'auteur, 01/10/2026.
 */
export interface RareBookDef {
  id: string;
  /** Chance d'être choisi parmi ceux qui restent (1 par défaut). */
  weight?: number;
}

export const RARE_BOOKS: readonly RareBookDef[] = [
  { id: 'necronomicon' },
  { id: 'bible' },
  { id: 'odyssey' },
  { id: 'arabianNights' },
  { id: 'quixote' },
  { id: 'divineComedy' },
  { id: 'voynich' },
  { id: 'saragossa' },
  { id: 'alice' },
  { id: 'mobyDick' },
  // Le cartonnage rouge de Hetzel, et dedans tout le texte, runes comprises (10/10).
  { id: 'centerEarth' },
  { id: 'encyclopedia' },
  { id: 'catalogue' },
  { id: 'sand' },
  // Le grand livre du X (remplace « Ta Justification », 04/10) : que des X, et un seul Y caché (un sceau secret).
  { id: 'bigX' },
  // Façon Death Note : des listes de noms, et page 15 le joueur (un sceau secret).
  { id: 'deathBook' },
  // Rempli de blocs d'une chaîne de blocs.
  { id: 'oriana' },
  // Du code, des numéros de PR, du lorem ipsum.
  { id: 'alexH' },
  // Un sommaire vide, puis des pages blanches.
  { id: 'blankPage' },
  { id: 'almanac' },
  // Des noms et des numéros, et une seule fois celui du joueur.
  { id: 'directory' },
  // Les Jokes de Papa (remplace « Le Livre des morts », 03/10 ; core/renamedRareBooks.ts).
  { id: 'dadJokes' },
  // Un manuel d'interfaces dont les cinq premiers exemples sont des pièges à déjouer, dans la bibliothèque (09/10).
  { id: 'darkPatterns' },
  // Un traité d'histoire naturelle dont le lapin s'est échappé : le Lapin blanc, à attraper trois fois, dans la bibliothèque (09/10).
  { id: 'rabbit' },
  // L'autobiographie du jeu (décidée le 03/10) : la Bibliothèque contient le livre de sa propre création.
  { id: 'idleBabel' },
  // Le livre de débogage (décidé le 01/10) : dix fois plus rare ; du charabia qui bugue, et il ne s'ouvre
  // dans la bibliothèque qu'en mode ?debug (sa case à lui dans la vitrine).
  { id: 'debug', weight: 0.1 },
];
