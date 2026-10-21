import * as THREE from 'three';
import { CORNICE_FRONT, CORNICE_MIDDLE, HIGH, LOW, createBookcase, type Bookcase, type BookcaseColumn } from './bookcase3d';
import { addCellLights, type CellLights } from './cellLights';
import { createCartouche, type Cartouche } from './cartouche';

/**
 * L'autre bibliothèque (maquette validée le 21/10, .ai/maquette-bibliotheque-droite.html, piste C) : un meuble du bois de la
 * vitrine, sur son écran à droite (à la même distance que le meuble des fins à gauche), pour les livres qui n'y tiennent plus.
 * Il ne paraît qu'avec le premier d'entre eux (l'auteur : « quand la vitrine est pleine »). Son cartouche est celui de la
 * vitrine : deux meubles, une même fonction.
 */
export const OTHER_X = 9;

export const OTHER_COLUMNS: BookcaseColumn[] = [
  {
    width: 0.7,
    cells: [
      [HIGH, ['stand', 'lean']],
      [LOW, []],
      [LOW, []],
      [HIGH, ['stand', 'lean']],
    ],
  },
  {
    width: 1.12,
    cells: [
      [HIGH, ['stand', 'stand', 'lean']],
      [HIGH, ['stand', 'lean']],
      [LOW, ['lie']],
      [LOW, ['lie']],
    ],
  },
  {
    width: 0.55,
    cells: [
      [LOW, []],
      [HIGH, ['stand']],
      [HIGH, ['stand', 'stand']],
      [LOW, []],
    ],
  },
  {
    width: 1.12,
    cells: [
      [LOW, ['lie', 'lie']],
      [HIGH, ['lie', 'stand', 'stand']],
      [LOW, ['lie']],
      [HIGH, ['lie', 'stand', 'stand']],
    ],
  },
  {
    width: 0.7,
    cells: [
      [LOW, []],
      [LOW, []],
      [HIGH, ['stand', 'stand']],
      [HIGH, ['stand', 'lean']],
    ],
  },
  {
    width: 1.12,
    cells: [
      [HIGH, ['stand']],
      [LOW, ['lie', 'lie']],
      [HIGH, ['stand', 'stand', 'lean']],
      [LOW, ['lie', 'lie']],
    ],
  },
];
/** L'ordre où ses cases se garnissent, à tour de rôle (numéros des cases, colonne par colonne, de bas en haut) : ses 35 places. */
export const OTHER_FILL_ORDER = [13, 4, 22, 0, 9, 18, 15, 5, 23, 12, 19, 3, 21, 10, 6, 20, 14, 7];

export interface OtherBookcase extends Bookcase {
  cellLights: CellLights;
  cartouche: Cartouche;
  /** La lampe au-dessus de lui, comme celle de la vitrine (à ajouter à la scène avant que la pièce ne s'assombrisse). */
  lamp: THREE.SpotLight;
}

/** Le meuble, à sa place dans la scène (son milieu `center` aussi), avec ses spots de cases, son cartouche et sa lampe. */
export const createOtherBookcase = (onLoad: () => void): OtherBookcase => {
  const bookcase = createBookcase(onLoad, OTHER_COLUMNS, 'other-');
  bookcase.root.position.x = OTHER_X;
  // Les spots des cases comparent des points du monde : le meuble doit être à sa place avant.
  const cellLights = addCellLights(bookcase.root, bookcase.cells);
  const cartouche = createCartouche(onLoad);
  cartouche.mesh.position.set(0, bookcase.size.y - CORNICE_MIDDLE, CORNICE_FRONT);
  bookcase.root.add(cartouche.mesh);
  const center = bookcase.center.clone().setX(OTHER_X);
  const lamp = new THREE.SpotLight(0xffd9a0, 18, 14, THREE.MathUtils.degToRad(40), 0.6, 1.4);
  lamp.position.set(OTHER_X, bookcase.size.y + 1.4, 3);
  lamp.target.position.copy(center);
  return { ...bookcase, center, cellLights, cartouche, lamp };
};
