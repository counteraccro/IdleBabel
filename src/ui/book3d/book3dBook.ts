import type { BookLook, BookShape } from './bookMesh';
import type { PageSource } from './pageSource';

/** Un livre montré en 3D : sa forme, ses pages, son apparence (plats, tranche, papier). */
export interface Book3d {
  shape: BookShape;
  source: PageSource;
  /** Textures des plats et de la tranche : dessinées une fois, à l'ouverture de la page. */
  look: () => Promise<BookLook>;
  /** Pages qui suivent la partie (chiffres qui changent) : redessinées régulièrement. */
  live?: boolean;
}
