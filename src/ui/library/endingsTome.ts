import * as THREE from 'three';
import { canvasTexture } from '../book3d/textures';
import { TOMES } from '../../data/sagaTomes';
import { PX, paintTomeSpine, tomeCloth } from '../rareBooks/trueStory/tomeCover';
import { TOME_FLOOR, TOME_FRONT } from './endingsShelf3d';

/**
 * Un tome de « L'histoire de Babel » rangé dans le meuble des fins (maquette validée le 16/10,
 * .ai/maquette-meuble-des-fins.html) : son dos, le même que celui du livre en main (tomeCover.ts), ses plats de toile.
 */
export interface Tome {
  /** Le tome, son coin bas-gauche-avant à sa place dans le meuble. */
  mesh: THREE.Mesh;
  /** Le livre tel qu'il s'envole vers sa page : à la place du vrai modèle (dos à x = 0, couverture vers +z), tourné le dos vers le lecteur. */
  anchor: THREE.Object3D;
  /** Réécrit le nom de la collection (la langue a changé, une police est arrivée). */
  rename: (name: string) => void;
}

/** Le tome `index`, rangé à sa place (coordonnées du meuble des fins). */
export const createTome = (index: number, name: string): Tome => {
  const { x, t } = TOMES[index];
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(t * PX);
  canvas.height = PX;
  const context = canvas.getContext('2d')!;
  paintTomeSpine(context, index, name);
  const spine = canvasTexture(canvas);
  const cover = new THREE.MeshStandardMaterial({ map: tomeCloth(), roughness: 0.85 });
  const pages = new THREE.MeshStandardMaterial({ color: 0xe2d1ab, roughness: 0.9 });
  const geometry = new THREE.BoxGeometry(t, 1, 0.8).translate(t / 2, 0.5, -0.4);
  const mesh = new THREE.Mesh(geometry, [
    cover,
    cover,
    pages,
    pages,
    new THREE.MeshStandardMaterial({ map: spine, roughness: 0.75 }),
    pages,
  ]);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.set(x, TOME_FLOOR, TOME_FRONT);
  const anchor = new THREE.Object3D();
  anchor.position.set(t / 2, 0.5, 0);
  anchor.rotation.y = Math.PI / 2;
  mesh.add(anchor);
  return {
    mesh,
    anchor,
    rename: (next) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      paintTomeSpine(context, index, next);
      spine.needsUpdate = true;
    },
  };
};
