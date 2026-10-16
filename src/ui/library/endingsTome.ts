import '@fontsource/great-vibes/400.css';
import '@fontsource/cinzel/600.css';
import * as THREE from 'three';
import { canvasTexture } from '../book3d/textures';
import { trueStoryBack, trueStorySpine } from '../rareBooks/trueStory/trueStoryCover';
import { ROW, TOMES, TOME_FLOOR, TOME_FRONT } from './endingsShelf3d';

/**
 * Un tome de la collection « La Vraie Fin » (maquette validée le 16/10, .ai/maquette-meuble-des-fins.html) : comme les dos
 * d'une série de BD, chaque dos porte sa part du nom de la collection, écrit d'un trait sur toute la rangée, dans un
 * bandeau doré (Great Vibes) ; en bas, le numéro du tome. Toute la collection a la reliure de « Mon histoire vraie ».
 */
const PX = 512;
const GILT = 'rgb(222, 188, 112)';
const FONT = "'Great Vibes', cursive";
/** Le nom de la collection : 0,15 de la hauteur du livre, un peu plus bas que le milieu du bandeau (l'anglaise). */
const NAME_SIZE = 0.15;
const NAME_DROP = 10;

/** Le dos du tome `index` (0 : « Mon histoire vraie ») ; `name` : le nom de la collection, dans la langue du jeu. */
const paintSpine = (context: CanvasRenderingContext2D, index: number, name: string): void => {
  const { x, t } = TOMES[index];
  const [w, h] = [context.canvas.width, context.canvas.height];
  const spine = trueStorySpine(t);
  context.drawImage(spine.image as CanvasImageSource, 0, 0, w, h);
  spine.dispose();
  // Ce qui court sur toute la rangée : le bandeau sombre, ses deux filets dorés, le nom de la collection.
  const bandTop = 0.53 * h;
  const bandHeight = 0.19 * h;
  context.fillStyle = 'rgba(20, 14, 10, 0.55)';
  context.fillRect(0, bandTop, w, bandHeight);
  context.fillStyle = GILT;
  context.fillRect(0, bandTop - 6, w, 3);
  context.fillRect(0, bandTop + bandHeight + 3, w, 3);
  context.save();
  context.translate(-(x + ROW / 2) * PX + (ROW * PX) / 2, bandTop + bandHeight / 2);
  context.font = `400 ${NAME_SIZE * PX}px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.scale(Math.min(1, (ROW * PX * 0.9) / context.measureText(name).width), 1);
  context.fillText(name, 0, NAME_DROP);
  context.restore();
  // Le numéro du tome, en bas, dans un petit cercle doré.
  context.strokeStyle = GILT;
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(w / 2, h * 0.9, Math.min(w * 0.32, 22), 0, Math.PI * 2);
  context.stroke();
  context.font = `600 ${Math.min(w * 0.36, 26)}px Cinzel`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(index + 1), w / 2, h * 0.9 + 2);
};

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
  paintSpine(context, index, name);
  const spine = canvasTexture(canvas);
  const cover = new THREE.MeshStandardMaterial({ map: trueStoryBack(), roughness: 0.85 });
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
      paintSpine(context, index, next);
      spine.needsUpdate = true;
    },
  };
};
