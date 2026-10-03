import type { BookLook } from '../book3d/bookMesh';
import type { Paper } from '../book/pageRender';
import type { CoverDesign } from '../../systems/coverDesign';
import type { GameState } from '../../core/state';

/**
 * Un livre rare tel qu'il est, en entier : sa couverture, son papier, ses pages. C'est le livre qu'on lit
 * dans la bibliothèque ; le livre en main ne fait que le reprendre (handBook3d.ts). Un fichier par
 * livre dans ce dossier, rangés dans arts.ts.
 */
export interface RareBookArt {
  /** Épaisseur du livre fermé, plats compris (0.12 : un livre ordinaire). */
  thickness?: number;
  paper: Paper;
  /**
   * Prépare ce qui est long (texte à charger, mise en page) ; résolu quand c'est fait (jamais en échec :
   * sans texte, des pages blanches). Appelé par les vues où on lit le livre, et quand ce livre sera le
   * prochain en main, pour qu'il arrive sans à-coup.
   */
  prepare?: () => Promise<void>;
  /** Plats, dos, tranche et tranchefiles ; `design` : la couverture tirée du numéro du livre (cuir, usure). */
  look: (state: GameState, design: CoverDesign) => Promise<RareBookLook>;
  /**
   * Dessine la page `page` (1 : la première page de droite, la page de titre ; puis le texte, deux pages
   * par feuille) ; false : la page reste vierge.
   */
  paint: (page: number, canvas: HTMLCanvasElement, spineOnLeft: boolean, state: GameState, design: CoverDesign) => boolean;
  /** La page du signet (son sommaire) : un clic sur le ruban y ramène ; sans : la page de titre. */
  bookmark?: number;
  /** Les entrées cliquables de la page `page` (un sommaire) : chacune mène à sa page. */
  links?: (page: number) => PageLink[];
  /** La page `page` a été découverte en tournant les pages, même vite (un secret à apposer…). */
  passed?: (page: number, state: GameState) => void;
}

/** L'habillage d'un livre rare ; `tick` : couverture qui vit (le livre de débogage), propre à cet habillage. */
export interface RareBookLook extends BookLook {
  /** Appelé à chaque image ; true si la couverture a changé. */
  tick?: (now: number) => boolean;
}

/**
 * Une entrée cliquable : la bande de la page de `y` à `y + height` (repère de la texture) mène à la page
 * `target`, ou, avec `href`, ouvre cette adresse dans un nouvel onglet (un lien hors du jeu).
 */
export interface PageLink {
  y: number;
  height: number;
  target: number;
  href?: string;
}
