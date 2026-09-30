import type { GameState } from '../core/state';

/** Pages lues à partir desquelles la pièce de l'Âge Manuel est entièrement visible. */
const ROOM_REVEALED_AT = 2_500;

/**
 * Âge Manuel : il se réveille dans le noir et ne distingue que les livres à portée de main,
 * puis découvre sa pièce au fil de sa lecture. Basé sur les pages lues à vie :
 * dépenser ne rend pas l'obscurité, et une fois la pièce vue, il ne l'oublie plus.
 * 0 = seul le plus proche est visible, au-delà de 1 = tout est visible.
 */
export const clarity = (state: GameState): number => 0.14 + 0.96 * Math.min(1, Math.sqrt(state.totalPagesRead / ROOM_REVEALED_AT));

/**
 * Ce qu'il devine derrière la vitre : à l'Âge Manuel, rien — il croit à un vrai dehors.
 * Les Âges suivants feront apparaître la Bibliothèque qui se répète (jusqu'à ~0,35).
 */
export const beyond = (_state: GameState): number => 0;
