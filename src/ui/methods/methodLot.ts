import { el } from '../dom';
import { t } from '../../i18n';
import { BUY_LOTS, type BuyLot } from '../../data/tools';

const label = (lot: BuyLot): string => (lot === 'max' ? 'max' : `×${lot}`);

export interface MethodLot {
  root: HTMLElement;
  /** Le lot affiché (Maj enfoncée : ×10, le temps du clic), parmi ceux que la Brassée a ouverts. */
  show: (lot: BuyLot, lots: readonly BuyLot[]) => void;
}

/**
 * Sous la ruche, combien un clic achète de méthodes (maquette .ai/maquette-achat-par-lots.html, D) :
 * au repos, la seule marque du choix, dorée et soulignée ; au survol, les quatre choix se déplient sur la
 * ligne, un clic en prend un, et la ligne se referme quand la souris s'en va. Sans souris (toucher,
 * clavier), toucher la marque ouvre la ligne. Chaque niveau de la Brassée y ajoute un choix ; sans elle,
 * pas de marque : on achète une par une.
 */
export const createMethodLot = (choose: (lot: BuyLot) => void): MethodLot => {
  const root = el('div', 'method-lot');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', t('ui.buyLot'));
  const open = (on: boolean): void => {
    root.classList.toggle('open', on);
  };
  const buttons = BUY_LOTS.map((lot) => {
    const button = el('button', undefined, label(lot));
    button.addEventListener('click', () => {
      if (!root.classList.contains('open')) return open(true);
      choose(lot);
      open(false);
    });
    root.append(button);
    return { lot, button };
  });
  root.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') open(true);
  });
  root.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') open(false);
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) open(false);
  });
  return {
    root,
    show: (shown, lots) => {
      root.hidden = lots.length < 2;
      for (const { lot, button } of buttons) {
        button.hidden = !lots.includes(lot);
        const on = lot === shown;
        button.classList.toggle('on', on);
        button.setAttribute('aria-pressed', String(on));
        // Repliés, les autres choix ne se prennent pas au clavier : on ouvre d'abord la ligne.
        button.tabIndex = on || root.classList.contains('open') ? 0 : -1;
      }
    },
  };
};
