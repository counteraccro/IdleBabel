import { el } from '../dom';

/** Épaisseur des 410 pages (environ 15 % de la largeur d'une moitié, comme un vrai livre). */
export const BOOK_THICKNESS_PX = 48;

/**
 * Livre ouvert : les pages restent à plat, leur épaisseur se lit aux tranches (voir book.css).
 * Surélevées, la perspective les agrandirait d'une fraction de pourcent et le navigateur les rendrait floues.
 */
const OPEN_STACK_RATIO = 0;

/** Hauteur des piles de pages lues (à gauche) et à lire (à droite) du livre ouvert, selon l'avancement. */
export const stackDepths = (progress: number): { left: number; right: number } => ({
  left: BOOK_THICKNESS_PX * OPEN_STACK_RATIO * progress,
  right: BOOK_THICKNESS_PX * OPEN_STACK_RATIO * (1 - progress),
});

/**
 * Pile de pages d'un côté du livre : on en voit les tranches (haut, bas, et le devant, côté opposé
 * au dos). Sa hauteur suit l'avancement (--left-depth, --right-depth) ; la page fixe repose dessus.
 */
export const createPageStack = (side: 'left' | 'right'): HTMLElement => {
  const stack = el('span', `page-stack stack-${side}`);
  stack.append(el('span', 'stack-edge stack-top'), el('span', 'stack-edge stack-bottom'), el('span', 'stack-edge stack-fore'));
  return stack;
};
