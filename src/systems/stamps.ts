import type { GameState } from '../core/state';

/**
 * Les tampons (l'auteur, 22/10 puis 30/10 ; .ai/plan-taches.md, « Le guichet et les tampons ») : ce que rapportent les
 * tâches, à la place des jetons. Chaque tâche faite met un tampon dateur sur la carte de lecteur du livre blanc, ce
 * qu'elle a rapporté noté à côté ; une carte pleine est rangée et une neuve la remplace. Le solde est un compteur à part :
 * rien n'est perdu.
 */

/** Les cases d'une carte de lecteur (4 × 6, maquette validée le 31/10). */
export const CARD_CELLS = 24;

/** Une tâche faite (à `at`, ms) rapporte `n` tampons : un tampon dateur sur la carte, le solde qui monte. */
export const addStamps = (state: GameState, n: number, at: number): void => {
  if (n <= 0) return;
  const stamps = state.tasks.stamps;
  if (stamps.cells.length >= CARD_CELLS) {
    stamps.card += 1;
    stamps.cells = [];
  }
  stamps.cells.push({ at, n });
  stamps.balance += n;
  stamps.earned += n;
};
