import './modal.css';
import { el } from '../dom';
import { babelName } from '../../systems/seals';

/**
 * Variante d'une modale : la même carte, un accent différent. `danger` : une action qu'on ne peut pas
 * défaire (effacer…) ; `notice` : une information, sans choix à faire.
 */
export type ModalVariant = 'default' | 'danger' | 'notice';

export interface ModalAction {
  label: string;
  /** Bouton principal (celui de la touche Entrée), secondaire, ou dangereux. */
  kind?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  /** Laisse la modale ouverte après le clic (par défaut, elle se ferme). */
  keepOpen?: boolean;
}

export interface ModalOptions {
  title: string;
  variant?: ModalVariant;
  /** Contenu entre le titre et les boutons. */
  body?: HTMLElement[];
  actions?: ModalAction[];
  /**
   * Fond : le décor assombri (par défaut), tout noir (`black`) quand rien n'a encore commencé, ou à
   * peine voilé (`light`) pour laisser voir ce qui est derrière.
   */
  backdrop?: 'dim' | 'black' | 'light';
  /** Échap ou un clic à côté la ferment (pas pour une question obligatoire). */
  dismissible?: boolean;
  onClose?: () => void;
}

export interface Modal {
  root: HTMLElement;
  title: HTMLElement;
  /** Boutons, dans l'ordre des actions (pour les réécrire ou les désactiver). */
  buttons: HTMLButtonElement[];
  close: () => void;
}

/** Filigrane doré d'un coin de l'écrin (coin haut gauche ; les trois autres en sont des reflets). */
const CORNER = `<svg viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
  <path d="M4 40 V14 Q4 4 14 4 H40"/><path d="M10 34 V18 Q10 10 18 10 H34" opacity=".6"/><path d="M14 4 Q22 16 10 22"/>
  <circle cx="22" cy="22" r="4" fill="currentColor"/><path d="M40 4 q8 -2 10 6 q-6 -2 -8 2"/><path d="M4 40 q-2 8 6 10 q-2 -6 2 -8"/></svg>`;

/**
 * Modale commune à tout le jeu (voir modal.css) : un écrin de cuir aux coins brisés, filets et filigranes
 * dorés qui débordent des angles, symboles de Babel qui s'échappent des côtés. Le style se règle en un
 * seul endroit ; chaque modale ne fournit que son contenu.
 */
export const openModal = ({
  title,
  variant = 'default',
  body = [],
  actions = [],
  backdrop: shade = 'dim',
  dismissible = false,
  onClose,
}: ModalOptions): Modal => {
  const backdrop = el('div', `modal-backdrop ${shade}`);
  const frame = el('div', `modal-frame modal-${variant}`);
  const card = el('form', `modal modal-${variant}`);
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  const heading = el('h2', 'modal-title', title);
  const footer = el('div', 'modal-actions');
  let closed = false;
  const close = (): void => {
    if (closed) return;
    closed = true;
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && dismissible) close();
  };
  const buttons = actions.map((action) => {
    const button = el('button', `modal-button ${action.kind ?? 'secondary'}`, action.label);
    button.type = action.kind === 'primary' ? 'submit' : 'button';
    if (action.kind !== 'primary')
      button.addEventListener('click', () => {
        action.onClick?.();
        if (!action.keepOpen) close();
      });
    return button;
  });
  // Entrée (ou le bouton principal) : l'action principale, si elle n'est pas désactivée.
  card.addEventListener('submit', (event) => {
    event.preventDefault();
    const index = actions.findIndex((action) => action.kind === 'primary');
    if (index < 0 || buttons[index].disabled) return;
    actions[index].onClick?.();
    if (!actions[index].keepOpen) close();
  });
  // Un récit qui apparaît paragraphe par paragraphe (.modal-story) : un clic n'importe où l'affiche en
  // entier, sans rien déclencher d'autre (le bouton encore invisible ne compte pas).
  backdrop.addEventListener(
    'click',
    (event) => {
      const telling = card
        .getAnimations({ subtree: true })
        .filter((animation) => (animation as CSSAnimation).animationName === 'modal-story-in' && animation.playState !== 'finished');
      if (!telling.length) return;
      telling.forEach((animation) => animation.finish());
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );
  if (dismissible) backdrop.addEventListener('click', (event) => event.target === backdrop && close());
  document.addEventListener('keydown', onKey);
  footer.append(...buttons);
  card.append(el('span', 'modal-filet'), heading, ...body, ...(buttons.length ? [footer] : []));
  // Colonnes de symboles de Babel qui s'échappent des deux côtés : tirées du titre, les mêmes pour une
  // même modale.
  const spill = (side: 'left' | 'right'): HTMLElement => {
    const column = el('span', `modal-spill ${side}`, babelName(`modal:${title}:${side}`, 6));
    column.setAttribute('aria-hidden', 'true');
    return column;
  };
  const corners = ['tl', 'tr', 'bl', 'br'].map((corner) => {
    const node = el('span', `modal-corner ${corner}`);
    node.innerHTML = CORNER;
    return node;
  });
  frame.append(card, spill('left'), spill('right'), ...corners);
  backdrop.append(frame);
  document.body.append(backdrop);
  return { root: card, title: heading, buttons, close };
};
