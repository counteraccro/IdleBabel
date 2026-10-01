import * as THREE from 'three';
import { hashText, seeded } from '../../core/random';

/**
 * Les planches de la photo de vieux bois (public/textures/old-wood.jpg : planches verticales, domaine
 * public), en coordonnée horizontale de l'image : début et fin de chaque planche entière, sans les joints.
 */
const PLANKS: [number, number][] = [
  [0.075, 0.17],
  [0.176, 0.298],
  [0.307, 0.442],
  [0.452, 0.577],
  [0.584, 0.677],
  [0.686, 0.8],
  [0.808, 0.96],
];
/** La largeur de la bande prise dans une planche, pour une étagère ou un montant. */
const STRIP = 0.06;
/** La hauteur du meuble que couvre l'image entière (le fond) : les bandes gardent la même finesse de fil. */
const SPAN = 4.5;

let image: Promise<THREE.Texture> | undefined;
/** La photo, chargée une seule fois pour toutes les vitrines. */
const photo = (): Promise<THREE.Texture> =>
  (image ??= new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}textures/old-wood.jpg`).then((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  }));

/**
 * Un bois du meuble. Le matériau sort tout de suite (teinte seule) ; la photo s'y pose quand elle est
 * chargée, puis `onLoad` (redessiner). `whole` : toute l'image (le fond) ; sinon une bande étroite tirée
 * dans UNE planche, le fil dans la longueur de la pièce (les UV des pièces couchées sont tournées par
 * l'appelant), `length` : la longueur de la pièce.
 */
export const oldWood = (
  seed: string,
  options: { whole: true; color: number } | { whole?: false; length: number; color: number },
  onLoad: () => void,
): THREE.MeshStandardMaterial => {
  const material = new THREE.MeshStandardMaterial({ color: options.color, roughness: 0.7, metalness: 0.02 });
  void photo().then((source) => {
    const map = source.clone();
    if (!options.whole) {
      const random = seeded(hashText(`old-wood:${seed}`));
      const [start, end] = PLANKS[Math.floor(random() * PLANKS.length)];
      const along = Math.min(1, options.length / SPAN);
      map.repeat.set(STRIP, along);
      // Jamais à cheval sur le haut et le bas de la photo (le raccord se verrait).
      map.offset.set(start + random() * (end - start - STRIP), random() * (1 - along));
    }
    map.needsUpdate = true;
    material.map = map;
    material.needsUpdate = true;
    onLoad();
  });
  return material;
};
