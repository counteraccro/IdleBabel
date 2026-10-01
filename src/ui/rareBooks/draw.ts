import { CQW, HEIGHT, WIDTH, canvas } from '../book3d/leatherCover';
import { canvasTexture } from '../book3d/textures';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { cssBaseline } from '../book/pageRender';
import type * as THREE from 'three';

/** Outils de dessin communs aux livres rares : plats unis, textes centrés. */

export const SANS = "'Helvetica Neue', Arial, sans-serif";
export const SERIF = "Georgia, 'Times New Roman', serif";
export const TITLE = "'Cinzel', Georgia, serif";
/** Écriture à la main (la même que les notes du chercheur). */
export const HAND = "'Caveat', cursive";

export { CQW, HEIGHT, WIDTH };

/** Un plat uni de couleur `color`, à peine plus sombre sur les bords, et ce qu'on y dessine. */
export const board = (color: string, edge: string, draw?: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture => {
  const [node, context] = canvas();
  const shade = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, WIDTH * 0.15, WIDTH / 2, HEIGHT / 2, WIDTH * 0.85);
  shade.addColorStop(0, color);
  shade.addColorStop(1, edge);
  context.fillStyle = shade;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  draw?.(context);
  return canvasTexture(node);
};

export interface TextStyle {
  font: string;
  color: string;
  spacing?: number;
  align?: CanvasTextAlign;
}

/** Texte posé à (x, y) (haut de la ligne), sur une couverture ou une page. */
export const write = (context: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle): void => {
  context.save();
  context.font = style.font;
  context.letterSpacing = `${style.spacing ?? 0}px`;
  context.fillStyle = style.color;
  context.textAlign = style.align ?? 'center';
  context.textBaseline = 'alphabetic';
  // Centré : l'espacement ajouté après la dernière lettre décalerait le texte vers la gauche.
  const shift = (style.align ?? 'center') === 'center' ? (style.spacing ?? 0) / 2 : 0;
  context.fillText(text, x + shift, cssBaseline(context, y));
  context.restore();
};

/** Milieu d'une page (repère de la texture). */
export const PAGE_CENTER = PAGE_TEXTURE.width / 2;
