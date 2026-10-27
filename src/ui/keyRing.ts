import { el } from './dom';
import { bookMedalIcon } from './bookMedalIcons';
import { t } from '../i18n';
import type { BookMedals } from './bookMedals';

/**
 * Le trousseau (l'auteur, 26/10 : « il y a trop de boutons dans le menu » ; maquette .ai/maquette-atelier-interface.html,
 * piste « Trousseau ») : dès la première curiosité, la clé de la bibliothèque devient un trousseau ; au clic, ses deux clés
 * paraissent dessous, l'une sous l'autre, leur nom écrit à gauche : la bibliothèque (l'anneau rond) et l'atelier (l'anneau
 * carré). Un clic ailleurs le referme. Une curiosité arrivée, une presse finie : l'étoile sur le trousseau et sur la clé de
 * l'atelier, jusqu'à ce qu'on l'ouvre.
 */
export interface KeyRing {
  /** Le trousseau est-il là (sinon, la clé seule) ? Redessine le médaillon, et l'étoile de la clé de l'atelier. */
  update: (ring: boolean, atelierNews: boolean) => void;
  toggle: (open?: boolean) => void;
}

export const createKeyRing = (medals: BookMedals, open: { library: () => void; atelier: () => void }): KeyRing => {
  const fan = el('div', 'key-fan');
  fan.innerHTML = (['library', 'atelier'] as const)
    .map(
      (id) =>
        `<button type="button" class="book-medal" data-key="${id}"><span class="book-medal-ring"></span><span class="book-medal-icon">${bookMedalIcon(id)}</span><span class="book-medal-star" aria-hidden="true">✦</span><span class="key-name"></span></button>`,
    )
    .join('');
  medals.root.append(fan);
  const medal = (): HTMLElement | null => medals.root.querySelector<HTMLElement>('[data-id="library"]');
  const toggle = (opened = !fan.classList.contains('open')): void => {
    // Sous le trousseau, où qu'il soit dans la rangée (le médaillon de débogage peut le suivre).
    const ring = medal();
    if (ring) fan.style.right = `calc(${medals.root.clientWidth - ring.offsetLeft - ring.offsetWidth}px + 0.139em)`;
    fan.classList.toggle('open', opened);
  };
  fan.addEventListener('click', (event) => {
    const key = (event.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key;
    if (!key) return;
    toggle(false);
    if (key === 'atelier') open.atelier();
    else open.library();
  });
  document.addEventListener('click', (event) => {
    if (!medals.root.contains(event.target as Node)) toggle(false);
  });
  let shown: boolean | null = null;
  return {
    toggle,
    update: (ring, atelierNews) => {
      for (const button of fan.querySelectorAll<HTMLElement>('[data-key]')) {
        const name = t(button.dataset.key === 'atelier' ? 'atelier.keys.atelier' : 'atelier.keys.library');
        const label = button.querySelector('.key-name')!;
        if (label.textContent !== name) label.textContent = name;
        button.setAttribute('aria-label', name);
      }
      fan.querySelector('[data-key="atelier"]')!.classList.toggle('news', atelierNews);
      if (shown === ring) return;
      shown = ring;
      const icon = medal()?.querySelector('.book-medal-icon');
      if (icon) icon.innerHTML = bookMedalIcon(ring ? 'ring' : 'library');
      if (!ring) toggle(false);
    },
  };
};
