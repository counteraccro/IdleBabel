import { leafPagesBook } from '../book3d/leafPages';
import { edgeTexture } from '../book3d/textures';
import { headbandTexture } from '../book3d/headband';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { createEtheriumPages } from './etheriumPages';
import { ETHERIUM_LEATHER, etheriumCover, loadEtheriumFonts } from './etheriumCover';
import type { Book3d } from '../book3d/book3dBook';
import type { GameState } from '../../core/state';

/**
 * L'Etherium : le livre qui flottait au centre du puits, en cuir violet ; sur le plat, une ruche qui dit l'Éther
 * que l'ouverture rapporterait (etheriumCover.ts). Dans la pile, il attend le prestige (« L'attraper ? ») ; au réveil, il est en main, et
 * l'Éther s'y dépense (etheriumPages.ts).
 */
export const etherium3d = (state: GameState): Book3d => {
  let tick: ((now: number) => boolean) | null = null;
  const book: Book3d = {
    shape: { width: 0.72, height: 0.94, thickness: 0.12, board: 0.016, overhang: 0.018, corner: 0.03 },
    ...leafPagesBook(() => createEtheriumPages(state, (page) => book.navigate?.(page + 1)), 1, STRANGE_PAPER),
    look: async () => {
      await loadEtheriumFonts();
      const cover = etheriumCover(state);
      tick = cover.tick;
      return {
        cover: cover.front,
        coverGlow: cover.glow,
        back: cover.back,
        inside: cover.plain,
        spine: cover.spine,
        leather: 0xd8c8e8,
        edge: edgeTexture('#c9a9e8', '#8a62b0'),
        paper: STRANGE_PAPER[0],
        headband: headbandTexture(ETHERIUM_LEATHER.light, '#d9b56a'),
        // La ruche suit l'Éther : la pile et le livre ouvert gardent la couverture en grand (pileLook.ts).
        liveCover: true,
      };
    },
    live: true,
    bookmark: 2,
    tick: (now) => tick?.(now) ?? false,
  };
  return book;
};
