import type { GameState } from './state';
import { produce } from '../systems/production';
import { trackPlay } from '../systems/stats';
import { checkSeals } from '../systems/seals';

const TICK_MS = 100;

/** Boucle de jeu : avance la simulation selon le temps réellement écoulé. */
export const startLoop = (state: GameState, onTick: () => void): void => {
  setInterval(() => {
    const now = Date.now();
    const seconds = (now - state.lastTick) / 1000;
    produce(state, seconds);
    trackPlay(state, seconds);
    checkSeals(state, now);
    state.lastTick = now;
    onTick();
  }, TICK_MS);
};
