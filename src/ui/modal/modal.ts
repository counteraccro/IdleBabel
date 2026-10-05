import './modal.css';
import { el } from '../dom';
import { babelName } from '../../systems/seals';
import { pauseAnimations, resumeAnimations } from '../animationClock';

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
  /**
   * La touche Entrée lance l'action principale (par défaut). false pour une action qu'on ne peut pas défaire
   * (le prestige) : Entrée n'affiche que le récit en entier, l'action se choisit au clic.
   */
  enterConfirms?: boolean;
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
 * Une modale est-elle ouverte (récit, question…) ? Le décor derrière se fige (ui/animationClock.ts), le jeu
 * continue : pas de page qui tourne à l'écran, ses trouvailles sont comptées comme pendant une absence.
 */
export const modalOpen = (): boolean => document.querySelector('.modal-backdrop') !== null;

/** Modales ouvertes : les animations reprennent quand la dernière se ferme. */
let opened = 0;

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
  enterConfirms = true,
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
    // Après onClose : une modale qui en ouvre une autre (récits à la suite) ne relance pas le décor entre les deux.
    opened -= 1;
    if (opened === 0) resumeAnimations();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && dismissible) close();
    // Entrée fait comme un clic : elle affiche d'abord le récit en entier, puis lance l'action principale.
    // Dans un champ ou sur un bouton de la modale, le navigateur s'en charge (envoi du formulaire, clic).
    if (event.key !== 'Enter' || event.repeat) return;
    // L'appui s'arrête à la modale : le livre derrière (qui tourne une page à Entrée) ne le voit pas.
    event.stopPropagation();
    if (finishStory()) return void event.preventDefault();
    if (card.contains(document.activeElement)) return;
    event.preventDefault();
    if (enterConfirms) card.requestSubmit();
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
  /** Récit qui apparaît paragraphe par paragraphe (.modal-story) : affiché en entier ; false s'il l'était déjà. */
  const finishStory = (): boolean => {
    const telling = card
      .getAnimations({ subtree: true })
      .filter((animation) => (animation as CSSAnimation).animationName === 'modal-story-in' && animation.playState !== 'finished');
    telling.forEach((animation) => animation.finish());
    return telling.length > 0;
  };
  // Un clic n'importe où affiche le récit en entier, sans rien déclencher d'autre (le bouton encore
  // invisible ne compte pas).
  backdrop.addEventListener(
    'click',
    (event) => {
      if (!finishStory()) return;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );
  if (dismissible) backdrop.addEventListener('click', (event) => event.target === backdrop && close());
  document.addEventListener('keydown', onKey);
  opened += 1;
  pauseAnimations();
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
