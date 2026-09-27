import { BOOK_THICKNESS_PX, createPageBlock } from './bookBlock';
import { carryPage, createFlap } from './bookFlap';

const CLOSE_MS = 750;
const LOWER_MS = 500;
const RAISE_MS = 550;
const OPEN_MS = 700;

export interface BookClosing {
  /** Referme le livre, le repose, et en lève un autre préparé par `swap` : ouvert, ou fermé si `stayClosed`. */
  play: (swap: () => void, stayClosed: boolean) => Promise<void>;
  /** Ouvre le livre fermé que le chercheur tient en main. */
  open: () => Promise<void>;
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Livre en main, ouvert (comme .book-cover) puis fermé : recentré et bien tourné, car la couverture
 * déborde des pages et les cache si on regarde le livre trop de face.
 */
const HELD_OPEN = 'translateX(0%) translateY(0%) rotateX(14deg) rotateY(0deg) rotateZ(-1.5deg)';
const HELD_CLOSED = 'translateX(25%) translateY(-18%) rotateX(24deg) rotateY(62deg) rotateZ(-3deg)';
/** Livre neuf, fermé, tenu de face : couverture de devant vers le lecteur, recentrée. */
const HELD_FRONT = 'translateX(-25%) translateY(0%) rotateX(14deg) rotateY(0deg) rotateZ(-1.5deg)';
/** Rabat à plat, puis posé sur le bloc de pages de l'autre côté, à son épaisseur. */
const FLAP_OPEN = 'translateZ(1px) rotateY(0deg)';
const RIGHT_CLOSED = `translateZ(${BOOK_THICKNESS_PX + 1}px) rotateY(-180deg)`;
const LEFT_CLOSED = `translateZ(${BOOK_THICKNESS_PX + 1}px) rotateY(180deg)`;
const FLAP_EASING = 'cubic-bezier(0.45, 0, 0.25, 1)';

/**
 * Fermeture du livre terminé : la moitié droite de la couverture, page comprise, se rabat d'un bloc
 * sur les pages de gauche pendant que le chercheur recentre et tourne le livre (on voit son épaisseur),
 * puis le livre descend hors de la vue et le suivant remonte entre ses mains : ouvert, ou fermé,
 * de face, et il s'ouvre alors par sa couverture de devant, vers la gauche.
 */
export const createBookClosing = (
  book: HTMLElement,
  cover: HTMLElement,
  pages: { left: HTMLElement; right: HTMLElement },
): BookClosing => {
  const left = createFlap('left');
  const right = createFlap('right');
  const block = createPageBlock();
  cover.prepend(left.root, right.root, block);

  const run = (element: HTMLElement, keyframes: Keyframe[], duration: number, easing: string): Promise<void> =>
    element
      .animate(keyframes, { duration: reducedMotion() ? 1 : duration, easing, fill: 'forwards' })
      .finished.then(() => undefined);

  const cancelAll = (...elements: HTMLElement[]): void =>
    elements.forEach((element) => element.getAnimations().forEach((animation) => animation.cancel()));

  const play = async (swap: () => void, stayClosed: boolean): Promise<void> => {
    carryPage(right, pages.right);
    book.classList.add('closing');
    await Promise.all([
      run(right.root, [{ transform: FLAP_OPEN }, { transform: RIGHT_CLOSED }], CLOSE_MS, FLAP_EASING),
      run(cover, [{ transform: HELD_OPEN }, { transform: HELD_CLOSED }], CLOSE_MS * 1.3, 'ease-in-out'),
    ]);
    await run(book, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(45%) rotateX(20deg)', opacity: 0 }], LOWER_MS, 'ease-in');
    swap();
    book.classList.remove('closing');
    cancelAll(right.root, cover);
    // Livre suivant : il remonte ouvert, ou fermé et de face, couverture de devant sur les pages de droite.
    if (stayClosed) {
      carryPage(left, pages.left);
      book.classList.add('new-closed');
      left.root.animate([{ transform: LEFT_CLOSED }], { duration: 0, fill: 'forwards' });
      cover.animate([{ transform: HELD_FRONT }], { duration: 0, fill: 'forwards' });
    }
    await run(book, [{ transform: 'translateY(45%)', opacity: 0 }, { transform: 'none', opacity: 1 }], RAISE_MS, 'ease-out');
    cancelAll(book);
  };

  const open = async (): Promise<void> => {
    await Promise.all([
      run(left.root, [{ transform: LEFT_CLOSED }, { transform: FLAP_OPEN }], OPEN_MS, FLAP_EASING),
      run(cover, [{ transform: HELD_FRONT }, { transform: HELD_OPEN }], OPEN_MS, 'ease-in-out'),
      // Le bloc de pages s'aplatit avec l'ouverture : le livre ouvert n'a plus que ses tranches fines.
      run(block, [{ transform: 'scaleZ(1)' }, { transform: 'scaleZ(0.01)' }], OPEN_MS, FLAP_EASING),
    ]);
    book.classList.remove('new-closed');
    cancelAll(left.root, cover, block);
  };

  return { play, open };
};
