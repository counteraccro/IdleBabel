import type { LeafPage } from '../strangeBook/pages';
import type { Paper } from '../book/pageRender';
import type { Book3d } from './book3dBook';

/**
 * Pages du bloc : 410, comme tous les livres de Babel. Seules les premières sont remplies (les chapitres,
 * sceaux ou phrases à venir s'écriront dans les blanches). Une feuille ne pèse qu'une feuille : les piles
 * ne sautent pas quand elle tourne.
 */
export const BLOCK_PAGES = 410;

/**
 * Relie un livre 3D aux pages d'un grand livre (une liste de LeafPage, que le livre en main lit aussi en
 * HTML) : dessin sur la texture, clics, survol, pages vues, réécriture. `offset` : place en 3D de la première page de la liste (le livre 3D
 * garde la page 0, à gauche de la première double page, pour l'intérieur de la couverture).
 */
export const leafPagesBook = (
  make: () => (LeafPage | null)[],
  offset: number,
  paper: Paper,
): Pick<Book3d, 'source' | 'press' | 'hover' | 'pointable' | 'shown' | 'rewrite'> => {
  let pages = make();
  const at = (index: number): LeafPage | null => pages[index - offset] ?? null;
  return {
    source: {
      count: Math.max(pages.length + offset, BLOCK_PAGES),
      // Au-delà du contenu, des pages blanches (le papier nu du bloc).
      paint: (index, canvas, spineOnLeft) => {
        const page = at(index);
        page?.paint(canvas, spineOnLeft, paper);
        return page !== null;
      },
    },
    press: (index, x, y) => at(index)?.press(x, y) ?? false,
    hover: (index, x, y) => at(index)?.hover(x, y) ?? false,
    pointable: (index, x, y) => at(index)?.pointable(x, y) ?? false,
    shown: (index) => at(index)?.shown(),
    rewrite: () => {
      pages = make();
    },
  };
};
