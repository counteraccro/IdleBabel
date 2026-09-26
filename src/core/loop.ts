import type { GameState } from './state';
import { produce } from '../systems/production';

const TICK_MS = 100;

/** Boucle de jeu : avance la simulation selon le temps réellement écoulé. */
export const startLoop = (state: GameState, onTick: () => void): void => {
  setInterval(() => {
    const now = Date.now();
    produce(state, (now - state.lastTick) / 1000);
    state.lastTick = now;
    onTick();
  }, TICK_MS);
};
