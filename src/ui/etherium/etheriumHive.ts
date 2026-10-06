import { ETHERIUM_NAMED_PAGES } from '../../data/etherium';
import { nextEtherProgress, prestigeGain } from '../../systems/prestige';
import type { GameState } from '../../core/state';

/**
 * La ruche de la couverture de l'Etherium (maquette .ai/maquette-etherium.html, B2 « Lumière seule ») : une
 * alvéole allumée par chiffre de l'Éther que l'ouverture rapporterait, du centre vers le dehors ; la suivante se
 * remplit vers la puissance de dix d'après. Avant le premier Éther, c'est l'alvéole du centre qui se remplit.
 */

/** Nombre de chiffres d'un entier ≥ 1 (au-delà de 10²¹, JavaScript l'écrit avec un exposant). */
export const digitCount = (value: number): number =>
  value < 1e21 ? String(Math.floor(value)).length : Number(value.toExponential().split('e')[1]) + 1;

/** Anneaux autour du centre pour tenir `cells` alvéoles (1 + 3k(k + 1) pour k anneaux) ; au moins un. */
export const hiveRings = (cells: number): number => {
  let rings = 1;
  while (1 + 3 * rings * (rings + 1) < cells) rings++;
  return rings;
};

const AXIAL: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

/** Les alvéoles (coordonnées axiales), du centre vers le dehors, anneau après anneau. */
export const hiveCells = (rings: number): [number, number][] => {
  const cells: [number, number][] = [[0, 0]];
  for (let k = 1; k <= rings; k++) {
    let [q, r] = [AXIAL[4][0] * k, AXIAL[4][1] * k];
    for (let side = 0; side < 6; side++)
      for (let step = 0; step < k; step++) {
        cells.push([q, r]);
        q += AXIAL[side][0];
        r += AXIAL[side][1];
      }
  }
  return cells;
};

export interface HiveView {
  /** Le nom et la ruche paraissent (1 million de pages lues à vie) ; avant, un livre violet sans rien. */
  named: boolean;
  /** Éther que rapporterait l'ouverture. */
  gain: number;
  /** Alvéoles allumées : les chiffres de `gain` (0 tant qu'il ne rapporte rien). */
  lit: number;
  /** Remplissage de l'alvéole suivante, de 0 à 1. */
  level: number;
  /** Pourcentage du prochain Éther (écrit tant que l'ouverture rapporte moins de 10). */
  percent: number;
}

export const hiveView = (state: GameState): HiveView => {
  const gain = prestigeGain(state);
  const progress = nextEtherProgress(state);
  const lit = gain >= 1 ? digitCount(gain) : 0;
  const level = gain >= 1 ? Math.log10(gain) - (lit - 1) : progress;
  return {
    named: state.totalPagesRead >= ETHERIUM_NAMED_PAGES,
    gain,
    lit,
    level: Math.min(0.999, Math.max(0, level)),
    percent: Math.floor(progress * 100),
  };
};
