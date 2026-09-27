import './bookCover.css';
import { el } from '../dom';

export interface Flap {
  root: HTMLElement;
  /** Copie de la page fixe de ce côté, emportée quand le rabat bouge. */
  page: HTMLElement;
  /** Plat extérieur de la couverture (décor : voir coverArt.ts). */
  outside: HTMLElement;
}

/** Une moitié de la couverture : cuir intérieur (avec sa page) et plat extérieur (voir bookCover.css). */
export const createFlap = (side: 'left' | 'right'): Flap => {
  const root = el('span', `book-flap flap-${side}`);
  const inside = el('span', 'flap-inside');
  const page = el('span', `book-page book-${side} flap-page`);
  inside.append(page);
  const outside = el('span', 'flap-leather');
  root.append(inside, outside);
  return { root, page, outside };
};

/** Recopie une page fixe sur le rabat qui va l'emporter. */
export const carryPage = (flap: Flap, page: HTMLElement): void => {
  flap.page.replaceChildren(...[...page.childNodes].map((node) => node.cloneNode(true)));
};
