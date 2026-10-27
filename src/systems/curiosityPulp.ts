import { PARTS, PULP_KEEP_CHOICES, PULP_MAX_PERCENT, PULP_PER_PERCENT, PULP_POINTS, type PieceId } from '../data/curiosities';
import type { GameState } from '../core/state';

/**
 * Le pilon (l'auteur, 27/10 : « pas fan de l'usure. Pourquoi ne pas recycler les pièces en éther » ; « ok pour le pilon, % du
 * prestige et les deux ») : les pièces ordinaires des tiroirs y deviennent de l'Éther pour le prochain prestige (médiocre 1
 * point, usagé 2, bon 3, neuf 4 ; 100 points = +1 %, au plus +5 %). À la main, un état à la fois ; et tout seul, au-delà du
 * stock gardé par tiroir. Plein, il n'avale plus rien jusqu'au prestige, où il repart à zéro. Jamais une pièce S.
 */

/** Ce que le pilon ajoute à l'Éther du prochain prestige, en pour cent (0 à 5). */
export const pulpPercent = (state: GameState): number => Math.min(PULP_MAX_PERCENT, Math.floor(state.atelier.pulp / PULP_PER_PERCENT));

export const pulpFull = (state: GameState): boolean => state.atelier.pulp >= PULP_MAX_PERCENT * PULP_PER_PERCENT;

/** Jusqu'à `count` pièces d'un tiroir au pilon (rien quand il est plein). Renvoie combien y sont parties. */
export const toPulp = (state: GameState, part: PieceId, pieceState: number, count: number): number => {
  const drawer = state.atelier.drawers[part];
  let done = 0;
  while (done < count && drawer[pieceState] > 0 && !pulpFull(state)) {
    drawer[pieceState] -= 1;
    state.atelier.pulp += PULP_POINTS[pieceState];
    done += 1;
  }
  return done;
};

/** Toutes les pièces d'un état, de tous les tiroirs, au pilon (à la main). */
export const pulpState = (state: GameState, pieceState: number): number =>
  PARTS.reduce((sum, part) => sum + toPulp(state, part, pieceState, state.atelier.drawers[part][pieceState]), 0);

/** Au-delà du stock gardé, le surplus d'un tiroir part tout seul au pilon. Renvoie true si une pièce y est partie. */
export const autoPulp = (state: GameState, part: PieceId, pieceState: number): boolean => {
  const { keep, drawers } = state.atelier;
  if (keep < 0 || drawers[part][pieceState] <= keep) return false;
  return toPulp(state, part, pieceState, drawers[part][pieceState] - keep) > 0;
};

/** Le stock gardé par tiroir (une des valeurs de la feuille) ; le surplus de chaque tiroir y part aussitôt. */
export const setPulpKeep = (state: GameState, keep: number): void => {
  if (!(PULP_KEEP_CHOICES as readonly number[]).includes(keep)) return;
  state.atelier.keep = keep;
  for (const part of PARTS) for (let pieceState = 0; pieceState < 4; pieceState++) autoPulp(state, part, pieceState);
};
