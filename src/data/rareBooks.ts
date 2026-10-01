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
  { id: 'encyclopedia' },
  { id: 'catalogue' },
  { id: 'sand' },
  // Le livre qui justifie ta vie, que cherchent les bibliothécaires de Borges : dix fois plus rare.
  { id: 'vindication', weight: 0.1 },
  // Le nom du joueur, écrit à la main sur une seule page.
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
  { id: 'deadBook' },
];
