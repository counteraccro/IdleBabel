import * as THREE from 'three';
import type { BookLook } from '../book3d/bookMesh';

/**
 * Taille des plats et du dos dans la vitrine (au plus, proportions gardées) : on y voit le dos des livres
 * debout (moins de 200 pixels de haut sur un grand écran) et le plat des livres couchés, de biais (moins de
 * 300 de large) ; 512 × 640 laisse de quoi rester net sur un écran deux fois plus dense.
 */
const SHELF_SIZE = { width: 512, height: 640 };
/** L'intérieur des plats ne se voit jamais dans la vitrine (les livres y sont fermés). */
const INSIDE_SIZE = { width: 64, height: 80 };

/**
 * La texture `texture` réduite pour tenir dans `size` (proportions gardées) ; telle quelle si elle y tient déjà
 * ou n'est pas une image. Une texture neuve, qui ne partage rien avec l'ancienne : celle-ci peut servir
 * ailleurs (le même livre ouvert), elle n'est pas touchée ; jamais envoyée à la carte graphique de la vitrine,
 * il n'y a rien à y libérer.
 */
const shrink = (texture: THREE.Texture, size: { width: number; height: number }): THREE.Texture => {
  const image: unknown = texture.image;
  if (!(image instanceof HTMLCanvasElement || image instanceof HTMLImageElement || image instanceof ImageBitmap)) return texture;
  const scale = Math.min(size.width / image.width, size.height / image.height);
  if (scale >= 1) return texture;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const small = texture.clone();
  small.source = new THREE.Source(canvas);
  small.needsUpdate = true;
  return small;
};

/**
 * L'habillage d'un livre pour la vitrine : plats et dos en 512 × 640 au plus (au lieu de 800 × 1000 pour la
 * plupart), l'intérieur en tout petit. Un livre y pesait jusqu'à ~17 Mo sur la carte graphique, ~5 Mo ainsi ;
 * la vitrine en tient 33. Une couverture qui vit (`liveCover`) est redessinée sur ses textures : elles restent
 * telles quelles.
 */
export const shelfLook = (look: BookLook): BookLook => ({
  ...look,
  ...(look.liveCover
    ? {}
    : { cover: shrink(look.cover, SHELF_SIZE), back: shrink(look.back, SHELF_SIZE), spine: shrink(look.spine, SHELF_SIZE) }),
  inside: shrink(look.inside, INSIDE_SIZE),
});
