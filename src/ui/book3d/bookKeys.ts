import { modalOpen } from '../modal/modal';

/**
 * Le livre en main au clavier, sans avoir à cliquer dessus d'abord : Entrée, Espace ou → tournent la page, ← revient
 * (si le livre le permet). Le livre 3D comme celui d'un mod (la liseuse) s'en servent.
 */
export const attachBookKeys = (root: HTMLElement, step: (forward: boolean) => void, signal: AbortSignal): void => {
  window.addEventListener(
    'keydown',
    (event) => {
      // Écran qui s'en va (fondu), fenêtre de lore ouverte, ou touche destinée à un champ ou à un bouton
      // (Entrée, Espace) : le livre n'y répond pas.
      if (root.closest('.screen-out') || modalOpen()) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if ((event.key === 'Enter' || event.key === ' ') && target.closest('button, a')) return;
      const forward = event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight';
      if (!forward && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      // Touche gardée enfoncée : le navigateur répète l'appui ~30 fois par seconde. Chaque page tournée
      // étant une page lue, ce serait un clic automatique : un appui, une page, comme à la souris.
      if (event.repeat) return;
      step(forward);
    },
    { signal },
  );
};
