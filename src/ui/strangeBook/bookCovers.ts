import { el } from '../dom';
import { gutterCss } from '../book/pageRender';
import { createFlap } from '../book/bookFlap';
import { applyBinding, type Binding } from '../book/bindings';
import { cloneWithFreshIds } from '../cloneFresh';
import { createClosedEdges } from '../book/closedEdges';

const MOVE_MS = 750;
/** Inclinaison du livre fermé : penché en arrière et vu un peu de la droite, pour montrer son épaisseur (sa tranche du bas, son dos bombé, un peu sa tranche de côté). */
const TILT = 'rotateX(30deg) rotateY(-18deg) rotateZ(-3deg)';
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

/** Reliure d'un grand livre et décor de ses plats extérieurs. */
export interface CoverLook {
  binding: Binding;
  /** Tranche du livre fermé : couleur des feuilles vues de profil, et de la ligne entre deux feuilles. */
  edge: { paper: string; line: string };
  dress: (outside: { front: HTMLElement; back: HTMLElement }) => void;
}

/**
 * Couvertures d'un grand livre : les rabats du livre en main (cuir intérieur, plat décoré).
 * Double page : la couverture de devant se rabat sur la page de droite, le dos sur celle de gauche,
 * et le livre se recentre. Page seule : les deux rabats pivotent autour du bord gauche (le dos).
 */
export const createStrangeCovers = (book: HTMLElement, single: () => boolean, look: CoverLook): StrangeCovers => {
  applyBinding(book, look.binding);
  book.style.setProperty('--edge-paper', look.edge.paper);
  book.style.setProperty('--edge-line', look.edge.line);
  const edges = createClosedEdges({ bound: true });
  const layer = el('div', 'sb-covers');
  const front = createFlap('left');
  const back = createFlap('right');
  // Page emportée par le rabat pendant qu'il bouge (la page fixe est cachée pendant ce temps).
  const carried = { front: el('div', 'sb-carried'), back: el('div', 'sb-carried') };
  carried.front.style.setProperty('--gutter', gutterCss('270deg'));
  carried.back.style.setProperty('--gutter', gutterCss('90deg'));
  front.root.firstElementChild!.append(carried.front);
  back.root.firstElementChild!.append(carried.back);
  look.dress({ front: front.outside, back: back.outside });
  layer.append(front.root, back.root);
  // La tranche sous les couvertures : elle ne se voit que livre fermé.
  book.append(edges.root, layer);

  const flap = (side: ClosedSide): HTMLElement => (side === 'front' ? front : back).root;
  const angle = (side: ClosedSide): string => (side === 'front' ? 'rotateY(180deg)' : 'rotateY(-180deg)');
  /**
   * Livre fermé : recentré sur sa moitié visible, et incliné vers le lecteur (on voit sa tranche à
   * droite et en dessous). L'inclinaison pivote autour du centre de la couverture : le décalage est
   * appliqué avant elle.
   */
  const shift = (side: ClosedSide): string =>
    `${TILT}${single() ? '' : ` translateX(${side === 'front' ? -25 : 25}%)`}`;

  const clear = (): void => {
    for (const element of [front.root, back.root, book]) element.getAnimations().forEach((a) => a.cancel());
    book.classList.remove('closed', 'closed-front', 'closed-back', 'moving-front', 'moving-back', 'depth');
    // Page emportée : elle ne sert que pendant le mouvement. Restée sur le rabat, elle se verrait
    // par-dessus la page de gauche (l'intérieur du rabat reste visible).
    carried.front.replaceChildren();
    carried.back.replaceChildren();
    edges.show(null);
  };
  const hold = (element: HTMLElement, transform: string): void => {
    element.animate([{ transform }], { duration: 0, fill: 'forwards' });
  };

  const showClosed = (side: ClosedSide): void => {
    clear();
    book.classList.add('closed', `closed-${side}`, 'depth');
    edges.show(side);
    hold(flap(side), angle(side));
    hold(book, shift(side));
  };

  const move = async (side: ClosedSide, page: HTMLElement | null, closing: boolean): Promise<void> => {
    clear();
    carried[side].replaceChildren(...(page && !single() ? [cloneWithFreshIds(page)] : []));
    // En 3D le temps du mouvement : l'épaisseur se voit tant que le livre n'est pas tout à fait ouvert.
    book.classList.add(`moving-${side}`, 'depth');
    // Toujours animé, comme les pages : ouvrir et fermer le livre est un geste, pas une décoration.
    const options: KeyframeAnimationOptions = { duration: MOVE_MS, easing: EASING, fill: 'forwards' };
    const flat = 'rotateY(0deg)';
    const [flapFrom, flapTo] = closing ? [flat, angle(side)] : [angle(side), flat];
    const [bookFrom, bookTo] = closing ? ['none', shift(side)] : [shift(side), 'none'];
    await Promise.all([
      flap(side).animate([{ transform: flapFrom }, { transform: flapTo }], options).finished,
      book.animate([{ transform: bookFrom }, { transform: bookTo }], options).finished,
      edges.move(side, closing, options),
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
