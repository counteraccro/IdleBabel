import type { BookLook, BookShape } from './bookMesh';
import type { PageSource } from './pageSource';
import type { AutoTurnSource } from './autoTurn3d';

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
  /** Le livre qu'on prend quand celui-ci est terminé (le livre en main : le suivant sur l'étagère). */
  next?: () => Book3d;
  /** Pages qui tournent seules, livre ouvert (le livre en main, au rythme de la production). */
  autoTurn?: AutoTurnSource;
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
  /** La page `index` a été découverte en tournant les pages, même en feuilletant vite (un secret qu'on y trouve). */
  passed?: (index: number) => void;
  /** Le contenu a changé (débogage…) : les pages se refont, le livre reste ouvert là où il est. */
  rewrite?: () => void;
  /**
   * Livre fermé, on regarde son dos : en le faisant tourner, ou refermé sur son dos après sa dernière
   * page (le cahier d'options : un secret). Une fois par ouverture de la page.
   */
  backSeen?: () => void;
  /** Le plat arrière vient de se refermer après la dernière page : le livre a été lu jusqu'au bout (un secret). */
  finished?: () => void;
  /**
   * Le livre ne s'ouvre pas (le livre de débogage hors du mode ?debug) : on le prend, on le tourne, mais
   * ouvrir sa couverture appelle ceci à la place.
   */
  sealed?: () => void;
  /** Couverture qui vit (le livre de débogage) : appelé à chaque image ; true si elle a changé (à redessiner). */
  tick?: (now: number) => boolean;
  /** Le livre demande d'aller à une page (entrée du sommaire) : branché par la page 3D. */
  navigate?: (index: number) => void;
}
