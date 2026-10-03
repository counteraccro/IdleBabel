import { findWhileAway } from '../systems/knowledge';
import { gameRandom } from './random';
import { recordOnce } from './history';
import type { GameState } from './state';

/** Une absence d'au moins tant (en secondes), pages qui tournent seules : le livre de la fin la raconte. */
const TOLD_ABSENCE = 15 * 60;

/** Pages tournées sans le chercheur : la première longue absence est un moment du livre de la fin. */
const away = (state: GameState, seconds: number): void => {
  // Tiré de la graine de la partie, et de là où en est la lecture.
  findWhileAway(state, seconds, gameRandom(`away:${state.totalPagesRead}:${state.lifetimeKnowledge}`));
  if (state.settings.autoTurn && seconds >= TOLD_ABSENCE) recordOnce(state, 'firstAbsence');
};

/**
 * Trouvailles pendant l'absence : jeu fermé (depuis la dernière sauvegarde) ou onglet caché, quand
 * les pages ne tournent plus à l'écran. Les pages lues hors-ligne, elles, ne sont pas encore comptées.
 */
export const watchAbsence = (state: GameState): void => {
  away(state, (Date.now() - state.lastTick) / 1000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt) away(state, (Date.now() - hiddenAt) / 1000);
  });
};
