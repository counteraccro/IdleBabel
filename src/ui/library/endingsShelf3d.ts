import * as THREE from 'three';
import { oldWood } from './oldWood';
import { addCellLights, type CellLights } from './cellLights';
import { createCartouche, type Cartouche } from './cartouche';
import { CORNICE_FRONT, CORNICE_MIDDLE, type BookcaseCell } from './bookcase3d';

/**
 * Le meuble des fins (maquette validée le 16/10, .ai/maquette-meuble-des-fins.html ; mesures reprises telles quelles) : le
 * bois, les spots des cases et le cartouche de la vitrine, deux étages. En haut, de face sur un socle et un chevalet de
 * laiton, la place du vrai livre ; en bas, les onze fausses fins sur la tranche, chacune à sa place (endingsTome.ts).
 */
const BOARD = 0.05;
const SIDE = 0.08;
export const ENDINGS_DEPTH = 0.95;
const PLINTH = 0.14;
const CORNICE = 0.12;
const FRONT = ENDINGS_DEPTH / 2;
const PIECE = 0xc8a080;
const BACK = 0x6a5446;
const INNER_W = 1.9;
const LOW_H = 1.25;
const TOP_H = 1.55;
export const ENDINGS_HEIGHT = PLINTH + LOW_H + BOARD + TOP_H + CORNICE;
/** Le dessus du petit gradin du haut, la lèvre de laiton où pose le livre, et son inclinaison contre le chevalet. */
const STAND_H = 0.07;
const TOP_FLOOR = PLINTH + LOW_H + BOARD;
export const EASEL_LIP = new THREE.Vector3(0, TOP_FLOOR + STAND_H + 0.012, 0.2);
export const EASEL_LEAN = THREE.MathUtils.degToRad(11);
/** Où se lit le nom d'un livre survolé : le bord avant de l'étage du bas, du gradin du haut. */
export const LOW_FLOOR = PLINTH;
export const STAND_FLOOR = TOP_FLOOR;
export const ENDINGS_FRONT = FRONT;

/**
 * Les onze dos (places fixes, de gauche à droite) : leur épaisseur, et leur bord gauche (depuis le milieu du meuble), comme
 * dans la maquette. Les tomes sont tous de la même hauteur (1, celle d'un livre debout).
 */
const SPINES = [0.15, 0.13, 0.16, 0.12, 0.14, 0.15, 0.12, 0.14, 0.13, 0.16, 0.13];
const GAP = 0.012;
export const ROW = SPINES.reduce((sum, t) => sum + t, 0) + GAP * (SPINES.length - 1);
export const TOMES: { x: number; t: number }[] = SPINES.reduce<{ x: number; t: number }[]>(
  (tomes, t) => [...tomes, { x: tomes.length ? tomes.at(-1)!.x + tomes.at(-1)!.t + GAP : -ROW / 2, t }],
  [],
);
/** Les tomes, posés au fond de l'étage du bas, un doigt en retrait du bord. */
export const TOME_FLOOR = PLINTH;
export const TOME_FRONT = FRONT - 0.03;

export interface EndingsShelf {
  root: THREE.Group;
  cells: BookcaseCell[];
  cellLights: CellLights;
  cartouche: Cartouche;
  /** Le laiton du chevalet : il reflète la pièce (libraryPage.ts lui donne son reflet). */
  brass: THREE.MeshStandardMaterial;
}

/** Le meuble, son socle en y = 0, centré en x et en z, à `x` dans la scène (les spots des cases en ont besoin). */
export const createEndingsShelf = (x: number, onLoad: () => void): EndingsShelf => {
  const root = new THREE.Group();
  root.position.x = x;
  /** Une pièce de bois ; le fil suit sa longueur (UV tournées pour une pièce couchée). */
  const piece = (seed: string, w: number, h: number, d: number, px: number, py: number, pz: number): void => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    if (w > h) {
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    }
    const mesh = new THREE.Mesh(geometry, oldWood(seed, { length: Math.max(w, h), color: PIECE }, onLoad));
    mesh.position.set(px, py, pz);
    mesh.receiveShadow = mesh.castShadow = true;
    root.add(mesh);
  };
  const width = INNER_W + 2 * SIDE;
  const left = -INNER_W / 2;
  piece('fins-side-left', SIDE, ENDINGS_HEIGHT, ENDINGS_DEPTH + 0.04, left - SIDE / 2, ENDINGS_HEIGHT / 2, 0.02);
  piece('fins-side-right', SIDE, ENDINGS_HEIGHT, ENDINGS_DEPTH + 0.04, -left + SIDE / 2, ENDINGS_HEIGHT / 2, 0.02);
  piece('fins-plinth', width, PLINTH, ENDINGS_DEPTH + 0.06, 0, PLINTH / 2, 0.03);
  piece('fins-cornice', width + 0.1, CORNICE, ENDINGS_DEPTH + 0.12, 0, ENDINGS_HEIGHT - CORNICE / 2, 0.04);
  piece('fins-shelf', INNER_W, BOARD, ENDINGS_DEPTH, 0, PLINTH + LOW_H + BOARD / 2, 0);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(width, ENDINGS_HEIGHT, 0.04),
    oldWood('fins-back', { whole: true, color: BACK }, onLoad),
  );
  back.position.set(0, ENDINGS_HEIGHT / 2, -ENDINGS_DEPTH / 2 - 0.02);
  back.receiveShadow = true;
  root.add(back);
  // Le gradin du haut ; le chevalet : deux tiges de laiton penchées et la lèvre où pose le livre.
  piece('fins-stand', 1.05, STAND_H, 0.5, 0, TOP_FLOOR + STAND_H / 2, 0.05);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.85 });
  const easel = new THREE.Group();
  for (const side of [-0.22, 0.22]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 10), brass);
    rod.position.set(side, TOP_FLOOR + STAND_H + 0.3, -0.16);
    rod.rotation.x = -EASEL_LEAN * 1.6;
    easel.add(rod);
  }
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.025, 0.03), brass);
  lip.position.set(0, TOP_FLOOR + STAND_H + 0.012, 0.18);
  easel.add(lip);
  root.add(easel);

  const cells: BookcaseCell[] = [
    { left, floor: PLINTH, width: INNER_W, height: LOW_H, slots: [] },
    { left, floor: TOP_FLOOR, width: INNER_W, height: TOP_H, slots: [] },
  ];
  const cellLights = addCellLights(root, cells);
  // Le cartouche de la vitrine, au milieu de la corniche : les fins trouvées, sur onze.
  const cartouche = createCartouche(onLoad);
  cartouche.mesh.position.set(0, ENDINGS_HEIGHT - CORNICE_MIDDLE, CORNICE_FRONT);
  root.add(cartouche.mesh);
  return { root, cells, cellLights, cartouche, brass };
};
