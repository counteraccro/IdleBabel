import * as THREE from 'three';
import { PAGE_TEXTURE } from '../book/pageLayout';
import type { PageSource } from './pageSource';

/** Pages gardées dessinées de part et d'autre de la page ouverte : de quoi tourner sans attendre. */
const AROUND = 4;

export interface PageCache {
  /** Texture de la page `index`, dessinée à la demande (null : pas de page, hors du livre). */
  get: (index: number) => THREE.CanvasTexture | null;
  /** Oublie les pages loin de `center` (leur texture est libérée). */
  keep: (center: number) => void;
  /** Dessine d'avance une page voisine de `center` pas encore prête, une seule par appel ; false : toutes prêtes. */
  warm: (center: number) => boolean;
  /** Le contenu a changé : tout est redessiné à la prochaine demande. */
  clear: () => void;
}

/**
 * Textures des pages d'un livre : seules les pages proches de celle qu'on lit existent (un livre de
 * 410 pages n'en garde qu'une dizaine en mémoire).
 */
export const createPageCache = (source: PageSource): PageCache => {
  /** null : page vierge. */
  const textures = new Map<number, THREE.CanvasTexture | null>();
  const draw = (index: number): THREE.CanvasTexture | null => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_TEXTURE.width;
    canvas.height = PAGE_TEXTURE.height;
    if (!source.paint(index, canvas, index % 2 === 1)) {
      textures.set(index, null);
      return null;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    textures.set(index, texture);
    return texture;
  };
  const drop = (index: number): void => {
    textures.get(index)?.dispose();
    textures.delete(index);
  };
  return {
    get: (index) => (index < 0 || index >= source.count ? null : textures.has(index) ? textures.get(index)! : draw(index)),
    keep: (center) => {
      for (const index of [...textures.keys()]) if (Math.abs(index - center) > AROUND) drop(index);
    },
    warm: (center) => {
      // Les plus proches d'abord, en avant puis en arrière.
      for (let distance = 0; distance <= AROUND; distance++) {
        for (const index of [center + distance, center - distance]) {
          if (index < 0 || index >= source.count || textures.has(index)) continue;
          draw(index);
          return true;
        }
      }
      return false;
    },
    clear: () => {
      for (const index of [...textures.keys()]) drop(index);
    },
  };
};
