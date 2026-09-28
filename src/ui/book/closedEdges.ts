import './closedEdges.css';
import { el } from '../dom';

export type ClosedEdgesSide = 'front' | 'back' | null;

export interface ClosedEdges {
  root: HTMLElement;
  /** Livre fermé sur sa couverture (`front`), sur son dos (`back`), ou ouvert (`null`, rien ne se voit). */
  show: (side: ClosedEdgesSide) => void;
  /**
   * Pendant que la couverture bouge : la tranche s'amincit jusqu'à disparaître (ouverture) ou reprend
   * son épaisseur (fermeture), au rythme de la couverture.
   */
  move: (side: Exclude<ClosedEdgesSide, null>, closing: boolean, options: KeyframeAnimationOptions) => Promise<void>;
}

/**
 * Épaisseur d'un livre fermé, en vraie 3D : derrière la couverture, le bloc des pages (un peu plus
 * petit qu'elle : la couverture déborde) et le plat arrière. Le livre fermé est incliné (voir le CSS
 * du livre) : on voit la tranche à droite et en dessous. Fermé sur son dos, le côté droit est le dos du
 * livre (le cuir), pas les pages. Placé dans l'élément du livre, qui doit garder la 3D de ses enfants
 * (preserve-3d) ; la couverture fermée occupe la moitié droite (devant) ou gauche (dos), sauf en page
 * seule (`single` : tout le livre).
 * `bound` : livre relié, sa reliure se voit au bout de la tranche du bas, côté dos.
 * Couleurs : --edge-paper (tranche), --edge-line (lignes des feuilles), --leather et --leather-deep.
 */
export const createClosedEdges = ({ bound = false } = {}): ClosedEdges => {
  // Livre relié (pas le carnet à spirale) : la reliure de cuir enveloppe le bloc côté dos.
  const root = el('div', bound ? 'closed-edges bound' : 'closed-edges');
  const block = el('div', 'edge-block');
  // Plat arrière (au fond), tranches des feuilles, chants des deux plats, et le dos bombé (livre relié).
  block.append(
    el('span', 'edge-board'),
    el('span', 'edge-side'),
    el('span', 'edge-bottom'),
    el('span', 'edge-plate front-plate side'),
    el('span', 'edge-plate front-plate bottom'),
    el('span', 'edge-plate back-plate side'),
    el('span', 'edge-plate back-plate bottom'),
    ...(bound ? [el('span', 'edge-spine')] : []),
  );
  root.append(block);
  const show = (side: ClosedEdgesSide): void => {
    root.getAnimations().forEach((animation) => animation.cancel());
    root.classList.toggle('front', side === 'front');
    root.classList.toggle('back', side === 'back');
  };
  const move = async (side: Exclude<ClosedEdgesSide, null>, closing: boolean, options: KeyframeAnimationOptions): Promise<void> => {
    show(side);
    const full = getComputedStyle(root).getPropertyValue('--edge-depth').trim() || '12px';
    const [from, to] = closing ? ['0px', full] : [full, '0px'];
    await root.animate([{ '--edge-depth': from }, { '--edge-depth': to }], { ...options, fill: 'forwards' }).finished;
    show(closing ? side : null);
  };
  return { root, show, move };
};
