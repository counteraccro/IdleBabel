import { createPage } from '../../systems/babelText';
import { coverDesign } from '../../systems/coverDesign';
import { rareBookAt, takeBook } from '../../systems/rareBooks';
import { rareBookArt } from '../rareBooks/arts';
import { rareBook3d } from '../rareBooks/rareBook3d';
import { pageNumberLabel } from '../../systems/pageNumber';
import { producedWholePages } from '../../systems/production';
import { PAGES_PER_BOOK, PAGES_PER_LEAF } from '../../systems/books';
import { maxTurnsPerSecond } from '../../systems/knowledge';
import { gameRandom } from '../../core/random';
import { STRANGE_BINDING, bindingFor, modernBindingFor } from '../book/bindings';
import { isStrangeBook } from '../../systems/strangeBook';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { strangeHandPages } from './strangeHandPages';
import { layoutPage } from '../book/pageLayout';
import { MODERN_PAPER, OLD_PAPER, drawPageTexture } from '../book/pageRender';
import { drawTitlePageTexture } from '../book/titlePage';
import { leatherCover } from './leatherCover';
import { modernCover } from './modernCover';
import { headbandTexture } from './headband';
import { edgeTexture } from './textures';
import type { Book3d } from './book3dBook';
import type { BookShape } from './bookMesh';
import type { HandFinds } from './handFinds';
import type { GameState } from '../../core/state';

/** Un livre ordinaire tenu en main : plus mince que les grands livres, plats plus fins. */
const HAND_SHAPE: BookShape = { width: 0.8, height: 1, thickness: 0.12, board: 0.012, overhang: 0.035, corner: 0.03, arch: 2.5, sag: 0.12 };

/**
 * Un livre lu, gardé (le premier : rangé dans la bibliothèque) : le même livre, ses mêmes pages, mais qui ne
 * tourne plus seul et ne mène à aucun autre. Ses trouvailles surlignées ne sont pas redessinées.
 */
export const keptBook3d = (state: GameState, index: number): Book3d => {
  const { next: _next, autoTurn: _autoTurn, ...book } = handBook3d(state, index);
  return book;
};

/** Longueur d'une page de charabia. */
const PAGE_LENGTH = 700;

/**
 * Le livre tenu en main, en 3D : le n° `index` (sa couverture tirée de son numéro, son papier), ses 410
 * pages (205 feuilles) de charabia de Babel après la page de titre ; ses pages tournent seules au rythme de la production.
 * Ses trouvailles surlignées viennent de `finds` (handFinds.ts) ; la partie est tenue par
 * handReading3d.ts. Le livre étrange a les siennes : les pages du grand livre, puis des chiffres.
 */
export const handBook3d = (state: GameState, index = state.booksFinished, finds?: HandFinds): Book3d => {
  finds?.open(index);
  const next = (): Book3d => handBook3d(state, index + 1, finds);
  // Une feuille tourne toutes les deux pages entières produites : au rythme du compteur (plafonné).
  const autoTurn = {
    produced: () => Math.floor(producedWholePages() / PAGES_PER_LEAF),
    max: () => (state.settings.autoTurn ? maxTurnsPerSecond() : 0),
  };
  // Un livre rare arrive en main : il est trouvé, pour toujours. C'est le livre de la bibliothèque, tenu
  // en main (sans trouvailles : on ne lit pas de charabia).
  const rare = isStrangeBook(index) ? undefined : takeBook(state, index);
  // Le livre d'après sera rare : on le prépare pendant qu'on lit celui-ci.
  const upcoming = isStrangeBook(index + 1) ? undefined : rareBookAt(state, index + 1);
  if (upcoming) void rareBookArt(upcoming).prepare?.();
  if (rare) return { ...rareBook3d(state, rare, index, HAND_SHAPE), next, autoTurn };
  const design = coverDesign(index);
  const strange = isStrangeBook(index) ? strangeHandPages(state) : null;
  const paper = strange ? STRANGE_PAPER : design.modern ? MODERN_PAPER : OLD_PAPER;
  const binding = strange ? STRANGE_BINDING : design.modern ? modernBindingFor(index) : bindingFor(index);
  return {
    shape: HAND_SHAPE,
    source: {
      // Page 0 : l'intérieur de la couverture ; 1 : la page de titre ; puis le texte, jusqu'à la page 410 ;
      // après la dernière feuille, l'intérieur du plat arrière.
      count: PAGES_PER_BOOK + 1,
      paint: (page, canvas, spineOnLeft) => {
        if (page === 0) return false;
        if (page === 1) {
          drawTitlePageTexture(canvas, design, paper);
          return true;
        }
        if (strange) {
          strange(page, canvas, spineOnLeft);
          return true;
        }
        // Même livre, même page : même charabia (la page se redessine à l'identique quand on y revient).
        const random = gameRandom(`${index}:${page}`);
        drawPageTexture(
          canvas,
          layoutPage(createPage(PAGE_LENGTH, finds?.fragment(page), random)),
          spineOnLeft,
          paper,
          pageNumberLabel(index, page),
        );
        return true;
      },
    },
    look: async () => {
      // Un livre moderne a une couverture d'éditeur ; les autres, du cuir.
      const { front, back, plain } = await (design.modern && !strange ? modernCover : leatherCover)(design, binding);
      return {
        cover: front,
        back,
        inside: plain,
        spine: plain,
        leather: 0xc8c8c8,
        // Le livre étrange : les tranches et les tranchefiles du grand livre (strangeBook3d.ts).
        edge: edgeTexture(paper[1], strange ? '#a39d8b' : '#b39d74'),
        paper: paper[0],
        headband: strange ? headbandTexture('#6e1a20', '#b89a5a') : headbandTexture(binding.leather, '#d9c48f'),
      };
    },
    next,
    autoTurn,
  };
};
