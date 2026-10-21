import './bookMedals.css';
import { el } from './dom';
import { bookMedalIcon } from './bookMedalIcons';
import { createNewsStar, type NewsStar } from './newsStar';
import { flying, flyingHome, launchFlightFromMedal } from './book3d/bookFlight';
import { isDebugEnabled } from '../debug/enabled';

/** Un médaillon de l'en-tête : un livre du joueur (ou la clé, le jeton des tâches). */
export interface BookMedalSpec {
  id: string;
  /** Relu à chaque mise à jour : la langue peut changer, l'Etherium prend son nom. */
  label: () => string;
  onOpen: () => void;
  /** Un livre en 3D s'ouvre : il sort du médaillon et vole jusqu'à sa page. Sinon (la clé, le jeton), la page s'ouvre sans vol. */
  flies?: boolean;
  /** Cerclé de violet (l'Etherium). */
  violet?: boolean;
}

export interface BookMedals {
  root: HTMLElement;
  /** Montre ou cache un médaillon (le Grand Livre, trouvé plus tard) ; `arrive` : il paraît en sursautant. */
  show: (id: string, shown: boolean, arrive?: boolean) => void;
  /** Le livre ouvert devant le lecteur (sa page) : son médaillon pâlit, vide. */
  away: (id: string | null) => void;
  /** Le médaillon sursaute une fois (un mot s'est écrit dans le livre blanc). */
  shake: (id: string) => void;
  /** Une nouveauté attend : un sursaut à son arrivée, puis une étoile fixe jusqu'à ce qu'on ouvre le livre. */
  news: (id: string, waiting: boolean) => void;
  /** Noms réécrits dans la langue courante. */
  relabel: () => void;
}

interface Medal {
  spec: BookMedalSpec;
  button: HTMLButtonElement;
  tip: HTMLElement;
  star: NewsStar;
}

/** Aucun livre qui revient. */
const NONE: string[] = [];

/**
 * Les livres du joueur, en haut à droite : une rangée de médaillons d'or, du même dessin que ceux de gauche (relique,
 * bonus), un trait par livre, le nom au survol (l'auteur, 21/10 : le rebord de livres « pas cohérent » ; maquette
 * .ai/maquette-menu-naturel.html, piste 3). Au clic, le livre en 3D sort du médaillon et vole jusqu'à sa page
 * (bookFlight.ts) ; il y revient au retour. Rien ne luit en boucle : une nouveauté fait sursauter le médaillon une fois,
 * puis une étoile fixe reste jusqu'à l'ouverture (newsStar.ts).
 */
export const createBookMedals = (specs: BookMedalSpec[]): BookMedals => {
  const root = el('nav', 'book-medals');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  const medals: Medal[] = specs.map((spec) => {
    const button = el('button', `book-medal${spec.violet ? ' violet' : ''}`);
    button.type = 'button';
    button.dataset.id = spec.id;
    button.innerHTML = `<span class="book-medal-ring"></span><span class="book-medal-icon">${bookMedalIcon(spec.id)}</span><span class="book-medal-star" aria-hidden="true">✦</span>`;
    const tip = el('span', 'book-medal-tip');
    button.append(tip);
    const medal: Medal = { spec, button, tip, star: createNewsStar() };
    button.addEventListener('click', () => open(medal));
    button.addEventListener('animationend', () => button.classList.remove('hop', 'arrive'));
    root.append(button);
    return medal;
  });
  const find = (id: string): Medal | undefined => medals.find((medal) => medal.spec.id === id);

  const hop = (medal: Medal, arrive = false): void => {
    if (still.matches) return;
    medal.button.classList.remove('hop', 'arrive');
    // Relancer l'animation si elle tournait encore.
    void medal.button.offsetWidth;
    medal.button.classList.add(arrive ? 'arrive' : 'hop');
  };

  /** Le livre dont la page est ouverte (demandé par l'en-tête, ou cliqué à l'instant). */
  let wanted: string | null = null;
  /** Le médaillon du livre ouvert pâlit ; celui d'un livre qui y revient aussi, jusqu'à ce qu'il soit arrivé. */
  const applyAway = (): void => {
    const home = flying() ? flyingHome() : NONE;
    for (const medal of medals) {
      const away = medal.spec.id === wanted || home.includes(medal.spec.id);
      if (medal.spec.id === wanted) medal.star.seen();
      if (medal.button.classList.contains('away') !== away) {
        medal.button.classList.toggle('away', away);
        medal.button.disabled = away;
      }
      medal.button.classList.toggle('news', medal.star.lit);
    }
  };

  function open(medal: Medal): void {
    if (medal.button.disabled) return;
    if (medal.spec.flies && !still.matches)
      launchFlightFromMedal(medal.spec.id, medal.button.querySelector('.book-medal-icon')!.getBoundingClientRect());
    wanted = medal.spec.id;
    applyAway();
    medal.spec.onOpen();
  }

  const relabel = (): void => {
    for (const medal of medals) {
      const label = medal.spec.label();
      if (medal.tip.textContent !== label) {
        medal.tip.textContent = label;
        medal.button.setAttribute('aria-label', label);
      }
    }
  };
  relabel();

  const bookMedals: BookMedals = {
    root,
    show: (id, shown, arrive = false) => {
      const medal = find(id);
      if (!medal || !medal.button.hidden === shown) return;
      medal.button.hidden = !shown;
      if (shown && arrive) hop(medal, true);
    },
    away: (id) => {
      wanted = id;
      applyAway();
    },
    shake: (id) => {
      const medal = find(id);
      if (medal) hop(medal);
    },
    news: (id, waiting) => {
      const medal = find(id);
      if (!medal) return;
      if (medal.star.update(waiting) && !medal.button.hidden) hop(medal);
      medal.button.classList.toggle('news', medal.star.lit);
    },
    relabel,
  };
  // Débogage : les médaillons depuis la console (window.bookMedals.shake('white')…), ?debug seulement.
  if (isDebugEnabled()) (window as unknown as { bookMedals?: BookMedals }).bookMedals = bookMedals;
  return bookMedals;
};
