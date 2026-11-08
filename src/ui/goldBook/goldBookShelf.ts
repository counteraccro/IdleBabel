import { GOLD_BOOK_SHAPE } from './goldBook3d';
import { goldBookLook } from './goldBookLook';
import { BLOCK_PAGES } from '../book3d/leafPages';
import type * as THREE from 'three';
import type { Book3d } from '../book3d/book3dBook';

/**
 * Le Livre d'or rangé dans la vitrine (l'auteur, 08/11) : le même livre, qu'on prend et qu'on tourne comme les autres ; ouvrir
 * sa couverture lance le mini-jeu (app.ts, `sealed`). Sous elle, la page du titre, puis les pages de lettres d'or.
 */
export const goldBookShelf3d = (): Book3d => {
  let pages: ((n: number) => THREE.Texture) | null = null;
  return {
    shape: GOLD_BOOK_SHAPE,
    source: {
      count: BLOCK_PAGES,
      // La page 0 est l'intérieur de la couverture ; la page du titre vient en face.
      paint: (index, canvas) => {
        const image = index > 0 ? (pages?.(index - 1).image as HTMLCanvasElement | undefined) : undefined;
        if (!image) return false;
        canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
        return true;
      },
    },
    look: async () => {
      const made = await goldBookLook();
      pages = made.pages;
      return made.look;
    },
  };
};
