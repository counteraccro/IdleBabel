import { coverDesign, rareCover } from '../../systems/coverDesign';
import { PAGES_PER_BOOK } from '../../systems/books';
import { hashText } from '../../core/random';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { rareBookArt } from './arts';
import type { Book3d } from '../book3d/book3dBook';
import type { BookShape } from '../book3d/bookMesh';
import type { GameState } from '../../core/state';

/** Un grand livre posé devant soi (comme le livre blanc), à l'épaisseur du livre rare. */
const READING_SHAPE: BookShape = { width: 0.8, height: 1, thickness: 0.12, board: 0.014, overhang: 0.025, corner: 0.035 };

/**
 * Un livre rare en 3D, en entier : 410 pages comme tous les livres de Babel (page 0 : l'intérieur de
 * la couverture ; 1 : sa première page ; après la dernière, l'intérieur du plat arrière). `index` : le
 * numéro du livre où il a été trouvé (son cuir, son usure). Lu dans la bibliothèque, ou repris en main
 * avec la forme du livre tenu (`shape`).
 */
export const rareBook3d = (state: GameState, id: string, index = state.rareBooks[id] ?? hashText(id), shape = READING_SHAPE): Book3d => {
  const art = rareBookArt(id);
  const design = rareCover(coverDesign(index), id);
  // Une entrée du sommaire se prend sur 80 % de la largeur de la page, comme dans le livre blanc.
  const linkAt = (page: number, x: number, y: number) =>
    x >= PAGE_TEXTURE.width * 0.1 && x <= PAGE_TEXTURE.width * 0.9
      ? art.links?.(page).find((link) => y >= link.y && y <= link.y + link.height)
      : undefined;
  const book: Book3d = {
    shape: { ...shape, thickness: art.thickness ?? shape.thickness },
    source: {
      count: PAGES_PER_BOOK + 1,
      paint: (page, canvas, spineOnLeft) => page > 0 && art.paint(page, canvas, spineOnLeft, state, design),
    },
    look: () => art.look(state, design),
    passed: art.passed && ((page) => art.passed?.(page, state)),
    tick: art.tick,
    press: (page, x, y) => {
      const link = linkAt(page, x, y);
      if (link) book.navigate?.(link.target);
      return link !== undefined;
    },
    pointable: (page, x, y) => linkAt(page, x, y) !== undefined,
  };
  return book;
};
