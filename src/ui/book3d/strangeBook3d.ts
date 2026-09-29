import { createPages } from '../strangeBook/pages';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { STRANGE_BINDING } from '../book/bindings';
import { coverDesign } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { leatherCover } from './leatherCover';
import { braidTexture, edgeTexture } from './textures';
import type { Book3d } from './book3dBook';
import type { GameState } from '../../core/state';

/**
 * Le livre étrange : les statistiques, en cuir noir, sur papier gris. La garde est la première page de
 * droite (à gauche, l'intérieur de la couverture) : les pages du livre 2D décalées d'une place.
 */
export const strangeBook3d = (state: GameState): Book3d => {
  // Les pages du livre 2D désignent les pages par leur place dans la liste : une de moins qu'en 3D.
  const pages = createPages(state, (page) => book.navigate?.(page + 1), 1);
  const book: Book3d = {
    // Plus mince que les grands livres : quelques dizaines de pages.
    shape: { width: 0.8, height: 1, thickness: 0.1, board: 0.016, overhang: 0.012, corner: 0.03 },
    source: {
      count: pages.length + 1,
      paint: (index, canvas, spineOnLeft) => {
        pages[index - 1]?.paint(canvas, spineOnLeft, STRANGE_PAPER);
        return index > 0;
      },
    },
    look: async () => {
      const { front, back, plain } = await leatherCover(coverDesign(STRANGE_BOOK_INDEX), STRANGE_BINDING);
      return {
        cover: front,
        back,
        inside: plain,
        spine: plain,
        // Le cuir des chants et du dos : la peau de la couverture, à peine assombrie.
        leather: 0xc8c8c8,
        edge: edgeTexture(STRANGE_PAPER[1], '#a39d8b'),
        paper: STRANGE_PAPER[0],
        headband: braidTexture('#2c3240', '#8a8f9c'),
      };
    },
    live: true,
    press: (index, x, y) => pages[index - 1]?.press(x, y) ?? false,
    hover: (index, x, y) => pages[index - 1]?.hover(x, y) ?? false,
    pointable: (index, x, y) => pages[index - 1]?.pointable(x, y) ?? false,
  };
  return book;
};
