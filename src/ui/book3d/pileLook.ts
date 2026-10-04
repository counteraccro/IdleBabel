import { shrinkTexture } from './textures';
import type { BookLook } from './bookMesh';

/**
 * Les plats, dans la pile de l'en-tête (180 × 120, un livre y fait une soixantaine de pixels de large) : de
 * quoi rester net sur un écran trois fois plus dense, comme le cahier, posé de travers, qui montre sa
 * couverture. Leur image habille aussi les chants et le mors.
 */
const PLATE_SIZE = { width: 256, height: 320 };
/** Le dos : une tranche de quelques pixels. Étiré sur le dos quelle que soit sa forme. */
const SPINE_SIZE = { width: 128, height: 320 };
/** L'intérieur des plats ne se voit jamais dans la pile (les livres y sont fermés). */
const INSIDE_SIZE = { width: 64, height: 80 };

/**
 * L'habillage d'un livre pour la pile : réduit à ce qu'on y voit (chaque livre y pesait jusqu'à 13 Mo sur la
 * carte graphique, en 800 × 1000). Le livre ouvert en grand a son propre habillage, il n'est pas touché. Une
 * couverture qui vit (`liveCover`, le livre de débogage) est redessinée sur ses textures : elles restent
 * telles quelles.
 */
export const pileLook = (look: BookLook): BookLook => {
  if (look.liveCover) return { ...look, inside: shrinkTexture(look.inside, INSIDE_SIZE) };
  return {
    ...look,
    cover: shrinkTexture(look.cover, PLATE_SIZE),
    back: shrinkTexture(look.back, PLATE_SIZE),
    spine: shrinkTexture(look.spine, SPINE_SIZE, false),
    inside: shrinkTexture(look.inside, INSIDE_SIZE),
  };
};
