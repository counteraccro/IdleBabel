import { el } from '../dom';
import { BOOK_THICKNESS_PX, createPageBlock } from './bookBlock';

const CLOSE_MS = 750;
const LOWER_MS = 500;
const RAISE_MS = 550;

export interface BookClosing {
  /** Referme le livre, le repose, et en lève un autre préparé par `swap`. */
  play: (swap: () => void) => Promise<void>;
}

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Livre en main, ouvert (comme .book-cover) puis fermé : recentré et bien tourné, car la couverture
 * déborde des pages et les cache si on regarde le livre trop de face.
 */
const HELD_OPEN = 'translateX(0%) translateY(0%) rotateX(14deg) rotateY(0deg) rotateZ(-1.5deg)';
const HELD_CLOSED = 'translateX(25%) translateY(-18%) rotateX(24deg) rotateY(62deg) rotateZ(-3deg)';

/**
 * Fermeture du livre terminé : la moitié droite de la couverture, page comprise, se rabat d'un bloc
 * sur les pages de gauche pendant que le chercheur recentre et tourne le livre (on voit son épaisseur),
 * puis le livre descend hors de la vue et le suivant remonte entre ses mains.
 */
export const createBookClosing = (book: HTMLElement, cover: HTMLElement, right: HTMLElement): BookClosing => {
  // Moitié droite de la couverture : cuir intérieur (avec la page, pendant la fermeture) et plat extérieur.
  const flap = el('span', 'book-flap');
  const inside = el('span', 'flap-inside');
  const flapPage = el('span', 'book-page book-right flap-page');
  inside.append(flapPage);
  flap.append(inside, el('span', 'flap-leather'));
  cover.prepend(flap, createPageBlock());

  const run = (element: HTMLElement, keyframes: Keyframe[], duration: number, easing: string): Promise<void> =>
    element
      .animate(keyframes, { duration: reducedMotion() ? 1 : duration, easing, fill: 'forwards' })
      .finished.then(() => undefined);

  const play = async (swap: () => void): Promise<void> => {
    // La page de droite est recopiée sur le rabat, qui l'emporte en se refermant.
    flapPage.replaceChildren(...[...right.childNodes].map((node) => node.cloneNode(true)));
    book.classList.add('closing');
    // Le rabat tourne autour du dos et finit posé sur le bloc de pages, à son épaisseur.
    await Promise.all([
      run(
        flap,
        [
          { transform: 'translateZ(1px) rotateY(0deg)' },
          { transform: `translateZ(${BOOK_THICKNESS_PX + 1}px) rotateY(-180deg)` },
        ],
        CLOSE_MS,
        'cubic-bezier(0.45, 0, 0.25, 1)',
      ),
      run(cover, [{ transform: HELD_OPEN }, { transform: HELD_CLOSED }], CLOSE_MS * 1.3, 'ease-in-out'),
    ]);
    await run(book, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(45%) rotateX(20deg)', opacity: 0 }], LOWER_MS, 'ease-in');
    swap();
    book.classList.remove('closing');
    [flap, cover].forEach((element) => element.getAnimations().forEach((animation) => animation.cancel()));
    await run(book, [{ transform: 'translateY(45%)', opacity: 0 }, { transform: 'none', opacity: 1 }], RAISE_MS, 'ease-out');
    book.getAnimations().forEach((animation) => animation.cancel());
  };

  return { play };
};
