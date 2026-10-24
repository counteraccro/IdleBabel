import type { GameState } from '../core/state';
import { AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE } from '../data/tools';
import { starLit } from '../systems/etherium';

/**
 * Les fonds du jeu : des salles de la Bibliothèque peintes avec Draw Things (recette dans .ai/scenes.md),
 * chacune avec sa carte de profondeur (Depth Anything V2, blanc = proche).
 * Un fond par Âge (choix de l'auteur, 10/10), et le joueur pourra garder celui qu'il préfère (à venir).
 */
export interface SceneDefinition {
  id: SceneId;
  image: string;
  depth: string;
  /** L'Âge qui l'apporte : 1 Manuel, 2 Automatique, 3 Numérique, 4 Quantique. */
  age: 1 | 2 | 3 | 4;
  /** Point de fuite (la fenêtre ou la porte du fond), en coordonnées d'image de 0 à 1. */
  vanishing: { x: number; y: number };
}

export type SceneId = 'nuit' | 'desert' | 'verriere' | 'jour-nuit';

export const SCENES: readonly SceneDefinition[] = [
  { id: 'desert', age: 1, image: 'scenes/desert.jpg', depth: 'scenes/desert-depth.png', vanishing: { x: 0.5, y: 0.55 } },
  { id: 'nuit', age: 2, image: 'scenes/nuit.jpg', depth: 'scenes/nuit-depth.png', vanishing: { x: 0.5, y: 0.6 } },
  { id: 'verriere', age: 3, image: 'scenes/verriere.jpg', depth: 'scenes/verriere-depth.png', vanishing: { x: 0.49, y: 0.6 } },
  // L'Âge Quantique (choisie le 23/10, graine 2965596720) : une verrière de nuit au plafond, deux arches ouvertes sur le
  // désert en plein jour. Il y fait jour et nuit à la fois.
  { id: 'jour-nuit', age: 4, image: 'scenes/jour-nuit.jpg', depth: 'scenes/jour-nuit-depth.png', vanishing: { x: 0.5, y: 0.6 } },
];

/** L'Âge atteint : 1 Manuel, 2 Automatique, 3 Numérique, 4 Quantique (un Âge s'achète dans l'Etherium et y reste). */
const ageReached = (state: GameState): number =>
  starLit(state, QUANTUM_AGE) ? 4 : starLit(state, DIGITAL_AGE) ? 3 : starLit(state, AUTOMATIC_AGE) ? 2 : 1;

/** Le fond de l'Âge atteint. */
export const sceneOfAge = (state: GameState): SceneId => SCENES.filter((scene) => scene.age <= ageReached(state)).at(-1)!.id;

/** Un fond déjà vu : son Âge est atteint. Les autres restent un cadre vide dans le cahier. */
export const sceneSeen = (state: GameState, id: SceneId): boolean =>
  SCENES.some((scene) => scene.id === id && scene.age <= ageReached(state));

/**
 * Le fond à montrer : celui que le joueur garde, s'il l'a déjà vu (une sauvegarde effacée garde ses réglages,
 * pas son Âge), sinon celui de l'Âge.
 */
export const sceneShown = (state: GameState): SceneId => {
  const kept = state.settings.scene;
  return kept && sceneSeen(state, kept) ? kept : sceneOfAge(state);
};
