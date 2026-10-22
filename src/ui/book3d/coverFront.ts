import { coverDesign } from '../../systems/coverDesign';
import { isStrangeBook } from '../../systems/strangeBook';
import { STRANGE_BINDING, bindingFor, modernBindingFor } from '../book/bindings';
import { leatherFront } from './leatherCover';
import { modernFront } from './modernCover';

/**
 * Le plat de devant du livre n° `index`, tel qu'on l'a eu en main (handBook3d.ts) : le cuir ou la couverture d'éditeur, le
 * livre étrange dans son cuir à lui. Le plat seul, en 800 × 1000 : les autocollants de l'album (rareBooks/stickerAlbum).
 */
export const coverFront = (index: number): Promise<HTMLCanvasElement> => {
  const design = coverDesign(index);
  if (isStrangeBook(index)) return leatherFront(design, STRANGE_BINDING);
  return design.modern ? modernFront(design, modernBindingFor(index)) : leatherFront(design, bindingFor(index));
};
