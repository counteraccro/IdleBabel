import type { GameState } from '../core/state';

/** La partie en cours, pour ce qui n'en reçoit pas (les pages du livre de débogage) : posée au montage de la barre. */
let current: GameState | null = null;

export const setDebugState = (state: GameState): void => {
  current = state;
};

export const debugState = (): GameState | null => current;
