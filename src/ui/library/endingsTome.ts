import * as THREE from 'three';
import { canvasTexture } from '../book3d/textures';
import { TOMES } from '../../data/sagaTomes';
import { PX, loadTomeFonts, paintTomeSpine, tomeBack, tomeCloth, tomeFront } from '../rareBooks/trueStory/tomeCover';
import { TOME_FLOOR, TOME_FRONT } from './endingsShelf3d';

/**
 * Un tome de « L'histoire de Babel » rangé dans le meuble des fins (maquette validée le 16/10,
 * .ai/maquette-meuble-des-fins.html) : son dos, le même que celui du livre en main (tomeCover.ts), et les plats du livre en main.
 */
export interface Tome {
  /** Le tome, son coin bas-gauche-avant à sa place dans le meuble. */
  mesh: THREE.Mesh;
  /** Le livre tel qu'il s'envole vers sa page : à la place du vrai modèle (dos à x = 0, couverture vers +z), tourné le dos vers le lecteur. */
  anchor: THREE.Object3D;
  /** Réécrit le nom de la collection et redessine les plats (la langue a changé, une police est arrivée). */
  rename: (name: string) => void;
}

/** Le tome `index`, rangé à sa place (coordonnées du meuble des fins) ; `changed` : ses plats viennent d'arriver. */
export const createTome = (index: number, name: string, changed: () => void): Tome => {
  const { x, t } = TOMES[index];
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(t * PX);
  canvas.height = PX;
  const context = canvas.getContext('2d')!;
  paintTomeSpine(context, index, name);
  const spine = canvasTexture(canvas);
  // Les plats du livre en main (l'auteur, 17/10) : debout, le dos vers soi, l'avant à droite (+x), l'arrière à gauche (-x).
  // La toile nue le temps que les polices et la salle du plat arrière arrivent.
  const front = new THREE.MeshStandardMaterial({ map: tomeCloth(), roughness: 0.85 });
  const back = new THREE.MeshStandardMaterial({ map: tomeCloth(), roughness: 0.85 });
  let drawn = 0;
  const paintCovers = async (): Promise<void> => {
    const turn = ++drawn;
    await loadTomeFonts();
    const [frontMap, backMap] = [tomeFront(index), await tomeBack(index)];
    // Un dessin plus récent (la langue a changé entre-temps) l'emporte.
    if (turn !== drawn) return void [frontMap, backMap].forEach((map) => map.dispose());
    for (const [material, map] of [
      [front, frontMap],
      [back, backMap],
    ] as const) {
      material.map?.dispose();
      material.map = map;
      material.needsUpdate = true;
    }
    changed();
  };
  void paintCovers();
  let named = name;
  const pages = new THREE.MeshStandardMaterial({ color: 0xe2d1ab, roughness: 0.9 });
  const geometry = new THREE.BoxGeometry(t, 1, 0.8).translate(t / 2, 0.5, -0.4);
  const mesh = new THREE.Mesh(geometry, [
    front,
    back,
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
      // Les plats attendent eux-mêmes leurs polices : redessinés seulement quand la langue change.
      if (next !== named) {
        named = next;
        void paintCovers();
      }
    },
  };
};
