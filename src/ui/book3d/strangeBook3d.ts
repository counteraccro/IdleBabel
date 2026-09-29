import { createPages } from '../strangeBook/pages';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { STRANGE_BINDING } from '../book/bindings';
import { coverDesign } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { leatherCover } from './leatherCover';
import { headbandTexture } from './headband';
import { edgeTexture } from './textures';
import { leafPagesBook } from './leafPages';
import type { Book3d } from './book3dBook';
import type { GameState } from '../../core/state';

/**
 * Le livre étrange : les statistiques, en cuir noir, sur papier gris. La garde est la première page de
 * droite (à gauche, l'intérieur de la couverture) : les pages de la liste (createPages) décalées d'une place.
 */
export const strangeBook3d = (state: GameState): Book3d => {
  const book: Book3d = {
    // 410 pages, comme le livre blanc : un livre épais.
    // Plats qui débordent nettement des pages : fermé, on distingue bien la couverture du bloc.
    shape: { width: 0.8, height: 1, thickness: 0.16, board: 0.018, overhang: 0.02, corner: 0.035 },
    // Les pages de la liste désignent les pages par leur place dans la liste : une de moins qu'en 3D.
    ...leafPagesBook(() => createPages(state, (page) => book.navigate?.(page + 1), 1), 1, STRANGE_PAPER),
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
        headband: headbandTexture('#6e1a20', '#b89a5a'),
      };
    },
    live: true,
    // Le sommaire : la page de gauche de la deuxième double page.
    bookmark: 2,
  };
  return book;
};
