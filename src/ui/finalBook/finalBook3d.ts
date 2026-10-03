import { leafPagesBook } from '../book3d/leafPages';
import { edgeTexture } from '../book3d/textures';
import { headbandTexture } from '../book3d/headband';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { createFinalBookPages } from './finalBookPages';
import { finalFront, finalPlain, finalSpine } from './finalBookCover';
import { finalBack } from './finalBookBack';
import { createGlowSweep } from '../book3d/glowSweep';
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
  // La lumière passe sur le nom, de lettre en lettre, sur le plat et sur le dos à la fois.
  const sweep = createGlowSweep();
  const book: Book3d = {
    shape: { width: 0.8, height: 1, thickness: THICKNESS, board: 0.018, overhang: 0.02, corner: 0.035 },
    ...leafPagesBook(() => createFinalBookPages(state, (page) => book.navigate?.(page + 1)), 1, STRANGE_PAPER),
    look: async () => {
      const name = state.playerName.trim();
      const [cover, back, inside, spine] = await Promise.all([
        finalFront(name),
        finalBack(),
        finalPlain(23),
        finalSpine(name, THICKNESS),
      ]);
      return {
        cover: cover.texture,
        coverGlow: cover.glow ?? undefined,
        back,
        inside,
        spine: spine.texture,
        spineGlow: spine.glow ?? undefined,
        glowSweep: { sweep, cover: cover.span ?? undefined, spine: spine.span ?? undefined },
        leather: 0x1a1816,
        edge: edgeTexture('#d6ae5a', '#a47d2e'),
        paper: STRANGE_PAPER[0],
        headband: headbandTexture('#c8993f', '#1a1816'),
      };
    },
    tick: sweep.tick,
  };
  return book;
};
