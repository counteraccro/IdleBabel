import type { GameState } from '../core/state';

/**
 * Ce qu'il devine derrière la vitre : à l'Âge Manuel, rien — il croit à un vrai dehors.
 * Les Âges suivants feront apparaître la Bibliothèque qui se répète (jusqu'à ~0,35).
 */
export const beyond = (_state: GameState): number => 0;
