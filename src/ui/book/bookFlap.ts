import './bookCover.css';
import { el } from '../dom';

export interface Flap {
  root: HTMLElement;
  /** Copie de la page fixe de ce côté, emportée quand le rabat bouge. */
  page: HTMLElement;
}

/** Une moitié de la couverture : cuir intérieur (avec sa page) et plat extérieur (voir bookCover.css). */
export const createFlap = (side: 'left' | 'right'): Flap => {
  const root = el('span', `book-flap flap-${side}`);
  const inside = el('span', 'flap-inside');
  const page = el('span', `book-page book-${side} flap-page`);
  inside.append(page);
  root.append(inside, el('span', 'flap-leather'));
  return { root, page };
};

/** Recopie une page fixe sur le rabat qui va l'emporter. */
export const carryPage = (flap: Flap, page: HTMLElement): void => {
  flap.page.replaceChildren(...[...page.childNodes].map((node) => node.cloneNode(true)));
};
