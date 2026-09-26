import type { GameState } from '../core/state';

/**
 * Brouillard de compréhension : il ne voit que ce qu'il comprend.
 * Provisoire, en attendant les Âges : au réveil il est dans la pénombre,
 * puis sa pièce se révèle en entier au fil des premières centaines de pages.
 * 0 = seul le plus proche est visible, 1 = tout est visible.
 */
export const clarity = (state: GameState): number =>
  0.35 + 0.75 * Math.min(1, Math.log10(1 + state.pages) / 2.7);

/**
 * Ce qu'il devine derrière la vitre : à l'Âge Manuel, rien — il croit à un vrai dehors.
 * Les Âges suivants feront apparaître la Bibliothèque qui se répète (jusqu'à ~0,35).
 */
export const beyond = (_state: GameState): number => 0;
