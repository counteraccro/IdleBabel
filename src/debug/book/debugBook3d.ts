import { leafPagesBook } from '../../ui/book3d/leafPages';
import { headbandTexture } from '../../ui/book3d/headband';
import { edgeTexture } from '../../ui/book3d/textures';
import { createDebugPages } from './debugPages';
import { debugCover } from './debugCover';
import type { Paper } from '../../ui/book/pageRender';
import type { Book3d } from '../../ui/book3d/book3dBook';

/** Papier du catalogue : gris froid, un reflet de la pierre de la couverture. */
const DEBUG_PAPER: Paper = ['#e3e2dc', '#d6d4cc', '#c6c3b9'];

/**
 * Le livre de débogage, seulement avec ?debug : un catalogue de tout ce que contient le jeu. On y
 * choisit les sujets à suivre, qui apparaissent dans la barre de débogage. Même garde décalée que le
 * livre étrange : à gauche de la première double page, l'intérieur de la couverture.
 */
export const debugBook3d = (): Book3d => {
  let tick: ((now: number) => boolean) | null = null;
  const book: Book3d = {
    shape: { width: 0.8, height: 1, thickness: 0.12, board: 0.018, overhang: 0.02, corner: 0.035 },
    ...leafPagesBook(() => createDebugPages((page) => book.navigate?.(page + 1)), 1, DEBUG_PAPER),
    look: async () => {
      const cover = await debugCover();
      tick = cover.tick;
      return {
        cover: cover.front,
        back: cover.back,
        inside: cover.plain,
        spine: cover.plain,
        // Teinte des chants et du dos : la pierre de la couverture, à peine assombrie.
        leather: 0xc8c8d0,
        edge: edgeTexture(DEBUG_PAPER[1], '#9d9a90'),
        paper: DEBUG_PAPER[0],
        headband: headbandTexture('#d9b56a', '#1c1a2a'),
      };
    },
    // Les losanges suivent le choix (fait dans le livre ou retiré depuis la barre).
    live: true,
    bookmark: 2,
    tick: (now) => tick?.(now) ?? false,
  };
  return book;
};
