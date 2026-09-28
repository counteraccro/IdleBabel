import { findWhileAway } from '../systems/knowledge';
import type { GameState } from './state';

/**
 * Trouvailles pendant l'absence : jeu fermé (depuis la dernière sauvegarde) ou onglet caché, quand
 * les pages ne tournent plus à l'écran. Les pages lues hors-ligne, elles, ne sont pas encore comptées.
 */
export const watchAbsence = (state: GameState): void => {
  findWhileAway(state, (Date.now() - state.lastTick) / 1000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt) findWhileAway(state, (Date.now() - hiddenAt) / 1000);
  });
};
