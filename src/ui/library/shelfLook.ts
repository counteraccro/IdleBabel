import * as THREE from 'three';
import type { BookLook } from '../book3d/bookMesh';
import type { ShelfPlace } from './shelfLayout';

/**
 * Taille au plus (proportions gardées) des plats qu'on voit dans la vitrine, de biais : celui du dessus des
 * livres couchés (moins de 300 pixels de large sur un grand écran), ceux des livres penchés ; 512 × 640 reste
 * net sur un écran deux fois plus dense.
 */
const PLATE_SIZE = { width: 512, height: 640 };
/**
 * Le dos, vu de face : haut de moins de 200 pixels, large d'une trentaine. Sa texture est étirée sur le dos
 * quelle que soit sa forme : elle peut perdre en largeur sans garder ses proportions.
 */
const SPINE_SIZE = { width: 256, height: 640 };
/**
 * Les plats qu'on ne voit pas dans la vitrine : ceux d'un livre debout bien droit (serrés contre ses
 * voisins), celui du dessous d'un livre couché. Leur image habille aussi les chants et le mors, qu'on aperçoit
 * à côté du dos : de quoi y garder la teinte et les filets.
 */
const HIDDEN_PLATE = { width: 128, height: 160 };
/** L'intérieur des plats ne se voit jamais dans la vitrine (les livres y sont fermés). */
const INSIDE_SIZE = { width: 64, height: 80 };

/**
 * La texture `texture` réduite pour tenir dans `size` (proportions gardées, sauf `keepRatio` faux : chaque
 * côté réduit à sa limite) ; telle quelle si elle y tient déjà ou n'est pas une image. Une texture neuve, qui
 * ne partage rien avec l'ancienne : celle-ci peut servir ailleurs (le même livre ouvert), elle n'est pas
 * touchée ; jamais envoyée à la carte graphique de la vitrine, il n'y a rien à y libérer.
 */
const shrink = (texture: THREE.Texture, size: { width: number; height: number }, keepRatio = true): THREE.Texture => {
  const image: unknown = texture.image;
  if (!(image instanceof HTMLCanvasElement || image instanceof HTMLImageElement || image instanceof ImageBitmap)) return texture;
  const scaleX = Math.min(1, size.width / image.width);
  const scaleY = Math.min(1, size.height / image.height);
  if (scaleX === 1 && scaleY === 1) return texture;
  const scale = Math.min(scaleX, scaleY);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * (keepRatio ? scale : scaleX)));
  canvas.height = Math.max(1, Math.round(image.height * (keepRatio ? scale : scaleY)));
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const small = texture.clone();
  small.source = new THREE.Source(canvas);
  small.needsUpdate = true;
  return small;
};

/**
 * L'habillage d'un livre pour la vitrine, à sa place `spot` : seul ce qu'on y voit garde de quoi être net (le
 * dos ; le plat du dessus d'un livre couché ; ceux d'un livre penché, vus de biais), le reste est réduit à
 * presque rien. Un livre y pesait jusqu'à ~17 Mo sur la carte graphique ; la vitrine en tient 33. Une
 * couverture qui vit (`liveCover`) est redessinée sur ses textures : elles restent telles quelles.
 */
export const shelfLook = (look: BookLook, { pose, lean }: ShelfPlace): BookLook => {
  if (look.liveCover) return { ...look, inside: shrink(look.inside, INSIDE_SIZE) };
  const leaning = pose === 'stand' && lean !== 0;
  return {
    ...look,
    cover: shrink(look.cover, pose === 'lie' || leaning ? PLATE_SIZE : HIDDEN_PLATE),
    back: shrink(look.back, leaning ? PLATE_SIZE : HIDDEN_PLATE),
    spine: shrink(look.spine, SPINE_SIZE, false),
    inside: shrink(look.inside, INSIDE_SIZE),
  };
};
