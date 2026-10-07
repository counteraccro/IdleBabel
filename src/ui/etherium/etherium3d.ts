import * as THREE from 'three';
import { leafPagesBook } from '../book3d/leafPages';
import { edgeTexture } from '../book3d/textures';
import { headbandTexture } from '../book3d/headband';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { createEtheriumPages } from './etheriumPages';
import { HAND, NIGHT, TITLE } from './nightInk';
import { ETHERIUM_LEATHER, etheriumCover, loadEtheriumFonts } from './etheriumCover';
import type { Book3d } from '../book3d/book3dBook';
import type { GameState } from '../../core/state';

/**
 * La lumière chaude de la pièce, compensée sur les pages : la nuit garde le violet de la maquette au lieu de virer au
 * bordeaux (mesurée dans le jeu, page de garde, le 07/10).
 */
const NIGHT_TINT = new THREE.Color().setRGB(1.8, 2.5, 3.4, THREE.LinearSRGBColorSpace);

/**
 * L'Etherium : le livre étrange qui se nourrit des pages lues, en cuir violet, sur la pile dès le début ; sur le plat,
 * une ruche qui dit l'Éther que l'ouverture rapporterait (etheriumCover.ts). L'ouvrir, c'est le prestige (« L'ouvrir ? ») ;
 * au réveil, ses pages sont là, et l'Éther s'y dépense (etheriumPages.ts).
 */
export const etherium3d = (state: GameState): Book3d => {
  let tick: ((now: number) => boolean) | null = null;
  const book: Book3d = {
    shape: { width: 0.72, height: 0.94, thickness: 0.12, board: 0.016, overhang: 0.018, corner: 0.03 },
    ...leafPagesBook(() => createEtheriumPages(state, (page) => book.navigate?.(page + 1)), 1, STRANGE_PAPER),
    look: async () => {
      // Les pages de nuit : Cinzel (titres) et l'écriture du chercheur, chargées avant d'être dessinées.
      await Promise.all([
        loadEtheriumFonts(),
        document.fonts.load(`30px ${TITLE}`),
        document.fonts.load(`600 32px ${TITLE}`),
        document.fonts.load(`26px ${HAND}`),
      ]);
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
        // Les pages vierges du bloc, de nuit aussi.
        paper: new THREE.Color(NIGHT[1]).multiply(NIGHT_TINT),
        pageTint: NIGHT_TINT,
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
