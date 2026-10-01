import { hashText, seeded } from '../../core/random';
import { bindingFor } from '../book/bindings';
import { layoutPage } from '../book/pageLayout';
import { OLD_PAPER, drawPageTexture } from '../book/pageRender';
import { drawTitlePageTexture } from '../book/titlePage';
import { leatherCover } from '../book3d/leatherCover';
import { headbandTexture } from '../book3d/headband';
import { edgeTexture } from '../book3d/textures';
import { loremText } from './lorem';
import type { RareBookArt } from './rareBookArt';

/** Longueur d'une page de texte (comme le livre en main). */
const PAGE_LENGTH = 700;

/**
 * Un livre rare pas encore dessiné : le cuir de son numéro et son vrai titre, puis du lorem ipsum (un vrai
 * livre, pas du charabia ; toujours le même pour un livre donné). Ses vrais morceaux viendront s'y glisser.
 */
export const defaultArt = (id: string): RareBookArt => ({
  paper: OLD_PAPER,
  look: async (_state, design) => {
    const binding = bindingFor(hashText(id));
    const { front, back, plain } = await leatherCover(design, binding);
    return {
      cover: front,
      back,
      inside: plain,
      spine: plain,
      leather: 0xc8c8c8,
      edge: edgeTexture(OLD_PAPER[1], '#b39d74'),
      paper: OLD_PAPER[0],
      headband: headbandTexture(binding.leather, '#d9c48f'),
    };
  },
  paint: (page, canvas, spineOnLeft, _state, design) => {
    if (page === 1) drawTitlePageTexture(canvas, design, OLD_PAPER);
    else
      drawPageTexture(
        canvas,
        layoutPage({ before: loremText(PAGE_LENGTH, seeded(hashText(`${id}:${page}`))), after: '' }),
        spineOnLeft,
        OLD_PAPER,
      );
    return true;
  },
});
