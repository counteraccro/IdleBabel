import { nightPage, type Ctx } from './nightInk';
import type { LeafPage } from '../strangeBook/pages';

/** Une zone cliquable de la page (repère 640 × 800). */
export interface Spot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** La main du pointeur : seulement là où un clic fait quelque chose. */
  pointer: boolean;
}

export interface NightLeafSpec {
  /** Dessine la page ; `hovered` : la zone sous la souris. */
  draw: (ctx: Ctx, hovered: string | null) => void;
  /** Les zones cliquables (ou survolables). */
  spots: () => Spot[];
  /** Clic sur une zone (le livre redessine ensuite ses pages). */
  press: (id: string) => void;
}

/**
 * Une page de nuit de l'Etherium, pour le livre 3D (leafPages.ts) : dessinée sur la texture de la feuille, une fois,
 * puis seulement quand une étoile survolée ou allumée la change. Pas de page HTML : l'Etherium ne se lit qu'en 3D.
 */
export const nightLeaf = ({ draw, spots, press }: NightLeafSpec): LeafPage => {
  let hovered: string | null = null;
  const at = (x: number, y: number): Spot | undefined =>
    spots().find((spot) => x >= spot.x && x <= spot.x + spot.w && y >= spot.y && y <= spot.y + spot.h);
  const page: LeafPage = {
    root: document.createElement('div'),
    update: () => {},
    shown: () => page.reset(),
    reset: () => {
      hovered = null;
    },
    paint: (canvas, spineOnLeft) => draw(nightPage(canvas, spineOnLeft), hovered),
    press: (x, y) => {
      const spot = at(x, y);
      if (!spot) return false;
      press(spot.id);
      // Un clic sur une étoile, même trop chère, ne tourne pas la page.
      return true;
    },
    hover: (x, y) => {
      const id = at(x, y)?.id ?? null;
      if (id === hovered) return false;
      hovered = id;
      return true;
    },
    pointable: (x, y) => at(x, y)?.pointer ?? false,
  };
  return page;
};
