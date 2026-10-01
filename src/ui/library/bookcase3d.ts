import * as THREE from 'three';
import { woodTexture } from './woodTexture';
import type { Slot } from './shelfLayout';

/** Épaisseur des planches (étagères, séparations), des montants ; profondeur des cases. */
const BOARD = 0.05;
const SIDE = 0.08;
const DEPTH = 0.95;
/** Socle sous la première rangée de cases, corniche au-dessus de la dernière. */
const PLINTH = 0.14;
const CORNICE = 0.12;
/** Le bord avant des cases : les livres s'y alignent, un doigt en retrait. */
export const FRONT = DEPTH / 2;
/** Une case basse (pour des livres couchés), une case haute (pour des livres debout, même sur une pile). */
const LOW = 0.65;
const HIGH = 1.25;

/** Une case : sa place dans le meuble (bord gauche, dessus de son étagère), sa taille, ce qu'elle accueille. */
export interface BookcaseCell {
  left: number;
  floor: number;
  width: number;
  height: number;
  /** Comment elle se remplit, livre après livre (vide : elle reste libre, pour plus tard). */
  slots: Slot[];
}

/**
 * Les colonnes du meuble, de gauche à droite : leur largeur, puis leurs cases de bas en haut (hauteur,
 * remplissage). Les étagères ne tombent jamais à la même hauteur d'une colonne à l'autre, comme dans un
 * meuble mural fait sur mesure ; 21 places pour les 21 livres rares, des cases vides pour le reste.
 */
const COLUMNS: { width: number; cells: [number, Slot[]][] }[] = [
  {
    width: 1.12,
    cells: [
      [LOW, ['lie', 'lie']],
      [HIGH, ['stand', 'stand', 'lean']],
      [LOW, []],
      [HIGH, ['stand']],
    ],
  },
  {
    width: 0.7,
    cells: [
      [HIGH, ['stand', 'lean']],
      [HIGH, []],
      [LOW, []],
      [LOW, []],
    ],
  },
  {
    width: 1.12,
    cells: [
      [HIGH, ['lie', 'stand', 'stand']],
      [LOW, ['lie']],
      [HIGH, []],
      [LOW, ['lie', 'lie']],
    ],
  },
  {
    width: 0.55,
    cells: [
      [LOW, []],
      [HIGH, ['stand', 'stand']],
      [HIGH, []],
      [LOW, []],
    ],
  },
  {
    width: 1.12,
    cells: [
      [LOW, ['lie']],
      [LOW, []],
      [HIGH, ['stand', 'lean']],
      [HIGH, []],
    ],
  },
  {
    width: 0.7,
    cells: [
      [HIGH, []],
      [LOW, []],
      [LOW, []],
      [HIGH, ['stand', 'lean']],
    ],
  },
];
/**
 * L'ordre où les cases reçoivent leurs livres, à tour de rôle (numéros des cases, colonne par colonne,
 * de bas en haut) : la vitrine se garnit un peu partout à la fois, pas case après case.
 */
export const FILL_ORDER = [8, 1, 18, 4, 13, 23, 0, 11, 9, 3, 16];

/** Un bois : la texture de noyer, le fil dans la longueur de la pièce. */
const wood = (seed: string, width: number, height: number, base?: string): THREE.MeshStandardMaterial => {
  const map = woodTexture(seed, base);
  if (width > height) {
    map.center.set(0.5, 0.5);
    map.rotation = Math.PI / 2;
  }
  map.repeat.set(Math.min(width, height) * 0.6, Math.max(width, height) * 0.6);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0.05 });
};

export interface Bookcase {
  root: THREE.Group;
  /** Les cases, colonne par colonne, de bas en haut. */
  cells: BookcaseCell[];
  size: THREE.Vector3;
  center: THREE.Vector3;
}

/**
 * La vitrine de la bibliothèque personnelle : un grand meuble de noyer, ouvert, découpé en cases de
 * toutes tailles (des colonnes de largeurs différentes, des étagères décalées), fermé au fond de
 * planches plus sombres. Le socle est posé en y = 0, centré en x et en z ; les livres sont à leur vraie
 * taille (1 de haut).
 */
export const createBookcase = (): Bookcase => {
  const root = new THREE.Group();
  const box = (width: number, height: number, depth: number, x: number, y: number, z: number, material: THREE.Material): void => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
  };
  const columnHeight = (cells: [number, Slot[]][]): number => cells.reduce((sum, [height]) => sum + height, 0) + (cells.length - 1) * BOARD;
  const inner = Math.max(...COLUMNS.map((column) => columnHeight(column.cells)));
  const innerWidth = COLUMNS.reduce((sum, column) => sum + column.width, 0) + (COLUMNS.length - 1) * BOARD;
  const width = innerWidth + 2 * SIDE;
  const height = PLINTH + inner + CORNICE;
  const left = -innerWidth / 2;

  // Le cadre : les montants, le socle, la corniche qui déborde un peu, le fond.
  box(SIDE, height, DEPTH + 0.04, left - SIDE / 2, height / 2, 0.02, wood('side-left', SIDE, height));
  box(SIDE, height, DEPTH + 0.04, -left + SIDE / 2, height / 2, 0.02, wood('side-right', SIDE, height));
  box(width, PLINTH, DEPTH + 0.06, 0, PLINTH / 2, 0.03, wood('plinth', width, PLINTH));
  box(width + 0.1, CORNICE, DEPTH + 0.12, 0, height - CORNICE / 2, 0.04, wood('cornice', width, CORNICE));
  box(width, height, 0.04, 0, height / 2, -DEPTH / 2 - 0.02, wood('back', width, height, '#2a1a0f'));

  const cells: BookcaseCell[] = [];
  let x = left;
  COLUMNS.forEach((column, index) => {
    // La séparation à droite de la colonne (sauf la dernière, contre le montant).
    if (index > 0) box(BOARD, inner, DEPTH, x - BOARD / 2, PLINTH + inner / 2, 0, wood(`divider${index}`, BOARD, inner));
    let floor = PLINTH;
    column.cells.forEach(([cellHeight, slots], row) => {
      cells.push({ left: x, floor, width: column.width, height: cellHeight, slots });
      floor += cellHeight;
      if (row < column.cells.length - 1) {
        box(column.width, BOARD, DEPTH, x + column.width / 2, floor + BOARD / 2, 0, wood(`shelf${index}-${row}`, column.width, BOARD));
        floor += BOARD;
      }
    });
    x += column.width + BOARD;
  });
  return { root, cells, size: new THREE.Vector3(width + 0.1, height, DEPTH), center: new THREE.Vector3(0, height / 2, 0) };
};
