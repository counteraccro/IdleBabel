import * as THREE from 'three';
import { woodTexture } from './woodTexture';

/** Places par rayon, et rayons : 21 livres rares. */
export const PER_SHELF = 7;
export const SHELVES = 3;
/** Largeur d'une place (le plus épais des livres rares, 0.17, et de l'air autour). */
const PITCH = 0.26;
/** Hauteur libre d'un rayon (les livres font 1), épaisseur des planches et des montants. */
const CLEARANCE = 1.2;
const BOARD = 0.05;
const SIDE = 0.08;
/** Profondeur intérieure : un livre (0.8) et ses plats qui dépassent. */
const DEPTH = 0.95;
/** Socle sous le premier rayon, corniche au-dessus du dernier. */
const PLINTH = 0.3;
const CORNICE = 0.22;
const INNER_WIDTH = PER_SHELF * PITCH;
/** Le bord avant des rayons : les livres s'y alignent, un doigt en retrait. */
export const FRONT = DEPTH / 2;

export interface CabinetSlot {
  /** Le milieu de la place, au ras du rayon, à l'aplomb du bord avant des livres. */
  base: THREE.Vector3;
  /** Son étiquette de laiton, sur le chant du rayon. */
  label: THREE.Mesh;
}

export interface Cabinet {
  root: THREE.Group;
  /** Les 21 places, dans l'ordre de lecture : le rayon du haut d'abord, de gauche à droite. */
  slots: CabinetSlot[];
  /** Taille du meuble entier. */
  size: THREE.Vector3;
}

/** Le laiton des étiquettes : un métal chaud, un peu terni. */
const brass = (): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color: 0xb8913f, metalness: 0.75, roughness: 0.38 });

/**
 * La vitrine de la bibliothèque personnelle : un meuble de noyer, ouvert sur le devant, trois rayons de
 * sept places tendus de velours vert au fond, une étiquette de laiton sous chaque place. Le bas du meuble
 * est posé en y = 0, centré en x et en z ; les livres y sont à leur vraie taille (1 de haut).
 */
export const createCabinet = (): Cabinet => {
  const root = new THREE.Group();
  const wood = (seed: string, width: number, height: number, vertical: boolean): THREE.MeshStandardMaterial => {
    const map = woodTexture(seed);
    // Le fil suit la plus grande longueur de la pièce.
    if (!vertical) {
      map.center.set(0.5, 0.5);
      map.rotation = Math.PI / 2;
    }
    map.repeat.set(vertical ? width : height, vertical ? height : width);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.05 });
  };
  const box = (width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  const rowsHeight = SHELVES * (CLEARANCE + BOARD) + BOARD;
  const height = PLINTH + rowsHeight + CORNICE;
  const outerWidth = INNER_WIDTH + 2 * SIDE;
  // Les montants, le socle, la corniche qui déborde un peu, le fond.
  const side = wood('side', SIDE, height, true);
  box(SIDE, height, DEPTH + 0.06, -(INNER_WIDTH + SIDE) / 2, height / 2, 0.03, side);
  box(SIDE, height, DEPTH + 0.06, (INNER_WIDTH + SIDE) / 2, height / 2, 0.03, side);
  box(outerWidth, PLINTH, DEPTH + 0.08, 0, PLINTH / 2, 0.04, wood('plinth', outerWidth, PLINTH, false));
  box(outerWidth + 0.12, CORNICE * 0.55, DEPTH + 0.2, 0, height - CORNICE * 0.275, 0.06, wood('cornice', outerWidth, CORNICE, false));
  box(outerWidth + 0.04, CORNICE * 0.45, DEPTH + 0.1, 0, height - CORNICE * 0.775, 0.03, wood('frieze', outerWidth, CORNICE, false));
  box(outerWidth, height, 0.04, 0, height / 2, -DEPTH / 2 - 0.02, wood('back', outerWidth, height, true));
  // Le velours du fond, derrière les livres.
  const velvet = new THREE.MeshStandardMaterial({ color: 0x1d2b23, roughness: 0.95 });
  box(INNER_WIDTH, rowsHeight, 0.01, 0, PLINTH + rowsHeight / 2, -DEPTH / 2 + 0.005, velvet);

  const slots: CabinetSlot[] = [];
  const plate = new THREE.PlaneGeometry(PITCH * 0.62, BOARD * 0.7);
  for (let shelf = 0; shelf <= SHELVES; shelf++) {
    const y = PLINTH + shelf * (CLEARANCE + BOARD) + BOARD / 2;
    box(INNER_WIDTH, BOARD, DEPTH, 0, y, 0, wood(`shelf${shelf}`, INNER_WIDTH, BOARD, false));
  }
  // Les places, rayon du haut d'abord ; l'étiquette sur le chant de la planche qui porte le livre.
  for (let row = SHELVES - 1; row >= 0; row--) {
    const floor = PLINTH + row * (CLEARANCE + BOARD) + BOARD;
    for (let column = 0; column < PER_SHELF; column++) {
      const x = -INNER_WIDTH / 2 + PITCH * (column + 0.5);
      const label = new THREE.Mesh(plate, brass());
      label.position.set(x, floor - BOARD / 2, DEPTH / 2 + 0.002);
      root.add(label);
      slots.push({ base: new THREE.Vector3(x, floor, FRONT), label });
    }
  }
  return { root, slots, size: new THREE.Vector3(outerWidth + 0.12, height, DEPTH + 0.2) };
};
