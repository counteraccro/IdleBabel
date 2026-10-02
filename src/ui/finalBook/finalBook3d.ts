import { leafPagesBook } from '../book3d/leafPages';
import { edgeTexture } from '../book3d/textures';
import { headbandTexture } from '../book3d/headband';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { createFinalBookPages } from './finalBookPages';
import { finalFront, finalPlain, finalSpine } from './finalBookCover';
import type { Book3d } from '../book3d/book3dBook';
import type { GameState } from '../../core/state';

/** La forme du livre blanc, dont il est le négatif. */
const THICKNESS = 0.16;

/**
 * Le livre de la fin : la partie du joueur, racontée depuis le début (systems/finalBook.ts), sous un
 * vélin noir qui porte le nom qu'il s'est donné (finalBookCover.ts). Pendant le développement,
 * seulement dans la vitrine en mode ?debug.
 */
export const finalBook3d = (state: GameState): Book3d => {
  const book: Book3d = {
    shape: { width: 0.8, height: 1, thickness: THICKNESS, board: 0.018, overhang: 0.02, corner: 0.035 },
    ...leafPagesBook(() => createFinalBookPages(state, (page) => book.navigate?.(page + 1)), 1, STRANGE_PAPER),
    look: async () => {
      const name = state.playerName.trim();
      const [cover, back, inside, spine] = await Promise.all([
        finalFront(name),
        finalPlain(11),
        finalPlain(23),
        finalSpine(name, THICKNESS),
      ]);
      return {
        cover,
        back,
        inside,
        spine,
        leather: 0x1a1816,
        edge: edgeTexture('#d6ae5a', '#a47d2e'),
        paper: STRANGE_PAPER[0],
        headband: headbandTexture('#c8993f', '#1a1816'),
      };
    },
  };
  return book;
};
