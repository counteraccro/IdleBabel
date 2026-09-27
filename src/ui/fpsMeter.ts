import { el } from './dom';
import { t } from '../i18n';

/**
 * Compteur d'images par seconde, moyenne de la dernière seconde. En détaillé (débogage),
 * ajoute la pire image en millisecondes, qui trahit les saccades qu'une moyenne cache.
 * S'arrête tout seul quand il quitte la page.
 */
export const createFpsMeter = (className: string, detailed = false): HTMLElement => {
  const readout = el('span', className, `— ${t('ui.fps')}`);
  let frames = 0;
  let worst = 0;
  let since = performance.now();
  let previous = since;
  const tick = (now: number): void => {
    // Onglet en arrière-plan : le navigateur suspend l'affichage, la mesure repart de zéro au retour.
    if (now - previous > 1000) {
      frames = 0;
      worst = 0;
      since = now;
    } else {
      frames++;
      worst = Math.max(worst, now - previous);
    }
    previous = now;
    if (now - since >= 1000) {
      const fps = Math.round((frames * 1000) / (now - since));
      readout.textContent = `${fps} ${t('ui.fps')}${detailed ? ` · pire ${Math.round(worst)} ms` : ''}`;
      readout.classList.toggle('slow', fps < 50);
      frames = 0;
      worst = 0;
      since = now;
    }
    if (readout.isConnected || now - since < 1000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return readout;
};
