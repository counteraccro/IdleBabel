import { el } from '../dom';

/** Épaisseur du bloc des 410 pages quand le livre est fermé (environ 15 % de sa largeur, comme un vrai livre). */
export const BOOK_THICKNESS_PX = 48;

/**
 * Bloc de pages du livre fermé, posé sur la moitié gauche de la couverture : on en voit les tranches
 * (haut, bas, et le devant, côté opposé au dos). Le rabat de la couverture vient se poser dessus.
 */
export const createPageBlock = (): HTMLElement => {
  const block = el('span', 'page-block');
  block.style.setProperty('--thickness', `${BOOK_THICKNESS_PX}px`);
  block.append(el('span', 'block-edge block-top'), el('span', 'block-edge block-bottom'), el('span', 'block-edge block-fore'));
  return block;
};
