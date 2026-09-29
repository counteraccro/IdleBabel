import type { BookLook, BookShape } from './bookMesh';
import type { PageSource } from './pageSource';

/** Le contenu d'un grand livre a changé (débogage…) : le livre ouvert se réécrit sans se refermer. */
export const BIG_BOOK_REWRITE = 'bigbook:rewrite';

/** Un livre montré en 3D : sa forme, ses pages, son apparence (plats, tranche, papier). */
export interface Book3d {
  shape: BookShape;
  source: PageSource;
  /** Textures des plats et de la tranche : dessinées une fois, à l'ouverture de la page. */
  look: () => Promise<BookLook>;
  /** Page où est glissé le signet (le sommaire) : un clic sur lui, ou la touche Début, y ramène. */
  bookmark?: number;
  /** Pages qui tournent seules, livre ouvert (le livre en main, au rythme de la production), par seconde. */
  turnsPerSecond?: () => number;
  /** Pages qui suivent la partie (chiffres qui changent) : redessinées régulièrement. */
  live?: boolean;
  /**
   * Clic sur la page `index`, au point (x, y) de son image (repère de la texture) : true si un élément
   * l'a pris (entrée du sommaire, sceau, note au crayon) ; la page ne tourne pas.
   */
  press?: (index: number, x: number, y: number) => boolean;
  /** Souris au point (x, y) de la page `index` : true si la page a changé (légende d'un sceau survolé). */
  hover?: (index: number, x: number, y: number) => boolean;
  /** Quelque chose de cliquable au point (x, y) de la page `index` (la main du pointeur). */
  pointable?: (index: number, x: number, y: number) => boolean;
  /** La page `index` arrive sous les yeux, livre posé (sceaux vus, légende survolée effacée). */
  shown?: (index: number) => void;
  /** Le contenu a changé (débogage…) : les pages se refont, le livre reste ouvert là où il est. */
  rewrite?: () => void;
  /** Le livre demande d'aller à une page (entrée du sommaire) : branché par la page 3D. */
  navigate?: (index: number) => void;
}
