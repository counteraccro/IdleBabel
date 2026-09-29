import './modal.css';
import { el } from '../dom';

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
   * Fond : le décor assombri (par défaut), ou tout noir (`black`) : la petite configuration avant le
   * jeu (nom, langue), quand rien n'a encore commencé.
   */
  backdrop?: 'dim' | 'black';
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

/**
 * Modale commune à tout le jeu (voir modal.css) : le décor s'assombrit derrière une carte au centre.
 * Le style se règle en un seul endroit ; chaque modale ne fournit que son contenu.
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
  if (dismissible) backdrop.addEventListener('click', (event) => event.target === backdrop && close());
  document.addEventListener('keydown', onKey);
  footer.append(...buttons);
  card.append(heading, ...body, ...(buttons.length ? [footer] : []));
  backdrop.append(card);
  document.body.append(backdrop);
  return { root: card, title: heading, buttons, close };
};
