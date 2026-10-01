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
  /** Plats, dos, tranche et tranchefiles ; `design` : la couverture tirée du numéro du livre (cuir, usure). */
  look: (state: GameState, design: CoverDesign) => Promise<BookLook>;
  /**
   * Dessine la page `page` (1 : la première page de droite, la page de titre ; puis le texte, deux pages
   * par feuille) ; false : la page reste vierge.
   */
  paint: (page: number, canvas: HTMLCanvasElement, spineOnLeft: boolean, state: GameState, design: CoverDesign) => boolean;
}
