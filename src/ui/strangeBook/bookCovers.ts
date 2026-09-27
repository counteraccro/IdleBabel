import { el } from '../dom';
import { gutterCss } from '../book/pageRender';
import { createFlap } from '../book/bookFlap';
import { dressCovers } from '../book/coverArt';
import { applyBinding, STRANGE_BINDING } from '../book/bindings';
import { coverDesign } from '../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';

const MOVE_MS = 750;
const EASING = 'cubic-bezier(0.45, 0, 0.25, 1)';

/** Côté fermé : couverture de devant (avant la première page) ou dos (après la dernière). */
export type ClosedSide = 'front' | 'back';

export interface StrangeCovers {
  /** Pose le livre fermé sans animation. */
  showClosed: (side: ClosedSide) => void;
  /** Referme le livre ; `page` : la page emportée par la couverture (double page seulement). */
  close: (side: ClosedSide, page: HTMLElement | null) => Promise<void>;
  open: (side: ClosedSide, page: HTMLElement | null) => Promise<void>;
  /** Livre ouvert, sans rabat visible. */
  reset: () => void;
}

/**
 * Couvertures du grand livre : les rabats du livre en main (cuir intérieur, plat décoré).
 * Double page : la couverture de devant se rabat sur la page de droite, le dos sur celle de gauche,
 * et le livre se recentre. Page seule : les deux rabats pivotent autour du bord gauche (le dos).
 */
export const createStrangeCovers = (book: HTMLElement, single: () => boolean): StrangeCovers => {
  applyBinding(book, STRANGE_BINDING);
  const layer = el('div', 'sb-covers');
  const front = createFlap('left');
  const back = createFlap('right');
  // Page emportée par le rabat pendant qu'il bouge (la page fixe est cachée pendant ce temps).
  const carried = { front: el('div', 'sb-carried'), back: el('div', 'sb-carried') };
  carried.front.style.setProperty('--gutter', gutterCss('270deg'));
  carried.back.style.setProperty('--gutter', gutterCss('90deg'));
  front.root.firstElementChild!.append(carried.front);
  back.root.firstElementChild!.append(carried.back);
  dressCovers({ front: front.outside, back: back.outside }, coverDesign(STRANGE_BOOK_INDEX));
  layer.append(front.root, back.root);
  book.append(layer);

  const flap = (side: ClosedSide): HTMLElement => (side === 'front' ? front : back).root;
  const angle = (side: ClosedSide): string => (side === 'front' ? 'rotateY(180deg)' : 'rotateY(-180deg)');
  /** Livre fermé recentré : il n'occupe plus qu'une moitié de la double page. */
  const shift = (side: ClosedSide): string => (single() ? 'none' : `translateX(${side === 'front' ? -25 : 25}%)`);

  const clear = (): void => {
    for (const element of [front.root, back.root, book]) element.getAnimations().forEach((a) => a.cancel());
    book.classList.remove('closed', 'closed-front', 'closed-back', 'moving-front', 'moving-back');
  };
  const hold = (element: HTMLElement, transform: string): void => {
    element.animate([{ transform }], { duration: 0, fill: 'forwards' });
  };

  const showClosed = (side: ClosedSide): void => {
    clear();
    book.classList.add('closed', `closed-${side}`);
    hold(flap(side), angle(side));
    hold(book, shift(side));
  };

  const move = async (side: ClosedSide, page: HTMLElement | null, closing: boolean): Promise<void> => {
    clear();
    carried[side].replaceChildren(...(page && !single() ? [page.cloneNode(true)] : []));
    book.classList.add(`moving-${side}`);
    // Toujours animé, comme les pages : ouvrir et fermer le livre est un geste, pas une décoration.
    const options: KeyframeAnimationOptions = { duration: MOVE_MS, easing: EASING, fill: 'forwards' };
    const flat = 'rotateY(0deg)';
    const [flapFrom, flapTo] = closing ? [flat, angle(side)] : [angle(side), flat];
    const [bookFrom, bookTo] = closing ? ['none', shift(side)] : [shift(side), 'none'];
    await Promise.all([
      flap(side).animate([{ transform: flapFrom }, { transform: flapTo }], options).finished,
      book.animate([{ transform: bookFrom }, { transform: bookTo }], options).finished,
    ]);
    if (closing) showClosed(side);
    else clear();
  };

  return {
    showClosed,
    close: (side, page) => move(side, page, true),
    open: (side, page) => move(side, page, false),
    reset: clear,
  };
};
