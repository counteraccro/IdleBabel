import type { GameState } from './state';
import { produce } from '../systems/production';
import { trackPlay } from '../systems/stats';
import { checkSeals } from '../systems/seals';
import { chronicle } from '../systems/chronicle';
import { remember } from '../systems/reminiscence';

const TICK_MS = 100;

/**
 * Boucle de jeu : avance la simulation selon le temps réellement écoulé. Onglet caché, elle ne produit
 * plus et `lastTick` reste à l'heure où il a été caché : l'absence est comptée au retour, ou au prochain
 * chargement si le jeu est fermé avant (core/absence.ts).
 */
export const startLoop = (state: GameState, onTick: () => void): void => {
  let previous = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (!document.hidden) {
      produce(state, (now - state.lastTick) / 1000);
      state.lastTick = now;
    }
    trackPlay(state, (now - previous) / 1000);
    previous = now;
    remember(state);
    checkSeals(state, now);
    chronicle(state, now);
    onTick();
  }, TICK_MS);
};
