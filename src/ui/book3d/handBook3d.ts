import { createPage } from '../../systems/babelText';
import { coverDesign } from '../../systems/coverDesign';
import { pageNumberLabel } from '../../systems/pageNumber';
import { pagesPerSecond } from '../../systems/production';
import { PAGES_PER_BOOK } from '../../systems/books';
import { MAX_TURNS_PER_SECOND } from '../../data/knowledge';
import { hashText, seeded } from '../../core/random';
import { bindingFor, modernBindingFor } from '../book/bindings';
import { layoutPage } from '../book/pageLayout';
import { MODERN_PAPER, OLD_PAPER, drawPageTexture } from '../book/pageRender';
import { drawTitlePageTexture } from '../book/titlePage';
import { leatherCover } from './leatherCover';
import { headbandTexture } from './headband';
import { edgeTexture } from './textures';
import type { Book3d } from './book3dBook';
import type { HandFinds } from './handFinds';
import type { GameState } from '../../core/state';

/** Longueur d'une page de charabia, comme dans le livre en main (book.ts). */
const PAGE_LENGTH = 700;

/**
 * Essai (#petit-livre3d) : le livre tenu en main, en 3D. Celui qu'on lit en ce moment (même couverture,
 * même papier), ses 410 pages de charabia de Babel après la page de titre ; ses pages tournent seules au
 * rythme de la production. Ses trouvailles surlignées viennent de `finds` (handFinds.ts) ; la partie
 * est tenue par handReading3d.ts.
 */
export const handBook3d = (state: GameState, index = state.booksFinished, finds?: HandFinds): Book3d => {
  finds?.open(index);
  const design = coverDesign(index);
  const paper = design.modern ? MODERN_PAPER : OLD_PAPER;
  return {
    // Un livre ordinaire : plus mince que les grands livres, plats plus fins.
    shape: { width: 0.8, height: 1, thickness: 0.12, board: 0.012, overhang: 0.035, corner: 0.03, arch: 2.5, sag: 0.12 },
    source: {
      // Page 0 : l'intérieur de la couverture ; 1 : la page de titre ; puis le texte. Le livre en main
      // compte ses feuilles, page de titre comprise (410 tournées par livre) : deux pages chacune, et
      // après la dernière, l'intérieur du plat arrière.
      count: 2 * PAGES_PER_BOOK + 1,
      paint: (page, canvas, spineOnLeft) => {
        if (page === 0) return false;
        if (page === 1) {
          drawTitlePageTexture(canvas, design, paper);
          return true;
        }
        // Même livre, même page : même charabia (la page se redessine à l'identique quand on y revient).
        const random = seeded(hashText(`${index}:${page}`));
        drawPageTexture(canvas, layoutPage(createPage(PAGE_LENGTH, finds?.fragment(page), random)), spineOnLeft, paper, pageNumberLabel(index, page));
        return true;
      },
    },
    look: async () => {
      const binding = design.modern ? modernBindingFor(index) : bindingFor(index);
      const { front, back, plain } = await leatherCover(design, binding);
      return {
        cover: front,
        back,
        inside: plain,
        spine: plain,
        leather: 0xc8c8c8,
        edge: edgeTexture(paper[1], '#b39d74'),
        paper: paper[0],
        headband: headbandTexture(binding.leather, '#d9c48f'),
      };
    },
    next: () => handBook3d(state, index + 1, finds),
    turnsPerSecond: () => (state.settings.autoTurn ? Math.min(pagesPerSecond(state), MAX_TURNS_PER_SECOND) : 0),
  };
};
