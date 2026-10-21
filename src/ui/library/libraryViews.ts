import * as THREE from 'three';

/**
 * Les deux meubles de la bibliothèque (maquette validée le 16/10, .ai/maquette-meuble-des-fins.html) : la vitrine, et à sa
 * gauche le meuble des fins avec la machine de la Loterie. Une flèche mène de l'un à l'autre ; la caméra glisse de côté, en
 * face des meubles, et se pose devant le nouveau.
 */
/** La vitrine, le meuble des fins à gauche, l'autre bibliothèque à droite (otherBookcase.ts). */
export type LibraryView = 'library' | 'endings' | 'other';

/** Ce que la caméra doit cadrer : le milieu, la demi-hauteur et la demi-largeur à faire tenir, la profondeur du meuble. */
export interface Framing {
  center: THREE.Vector3;
  tall: number;
  wide: number;
  depth: number;
}

/** Où se pose la caméra : en face, tout le cadre dans le canvas (comme l'ancien fit() de libraryPage.ts). */
export interface Shot {
  center: THREE.Vector3;
  position: THREE.Vector3;
}

export const shotOf = (camera: THREE.PerspectiveCamera, { center, tall, wide, depth }: Framing): Shot => {
  const half = THREE.MathUtils.degToRad(camera.fov / 2);
  const distance = Math.max(tall / Math.tan(half), wide / (Math.tan(half) * camera.aspect)) + depth / 2;
  return { center, position: new THREE.Vector3(center.x, center.y, distance) };
};

/** La durée du glissement, et sa courbe (lente au départ et à l'arrivée). */
export const GLIDE_MS = 1100;
export const glideEase = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** La vue où l'on était (gardée le temps de la séance : on revient d'un livre devant le même meuble). */
let lastView: LibraryView = 'library';
export const rememberedView = (): LibraryView => lastView;
export const rememberView = (view: LibraryView): void => {
  lastView = view;
};
