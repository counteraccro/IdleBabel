import type { Turner } from './turner';

/**
 * Pages qui tournent seules au rythme de la production (`rate` : pages par seconde), comme le livre en
 * main (book/autoTurn.ts) : au plus une page en attente, et rien n'est rattrapé tant que le lecteur a la
 * main ou que le livre n'est pas ouvert. Des pages demandées vite s'enchaînent en feuilletage (turner).
 * Renvoie la fonction à appeler à chaque image.
 */
export const createAutoTurn3d = (rate: () => number) => {
  let due = 0;
  return (dt: number, turner: Turner, lastSpread: number, ready: boolean): void => {
    if (!ready || turner.target >= lastSpread) {
      due = 0;
      return;
    }
    due = Math.min(1, due + rate() * dt);
    if (due < 1) return;
    due -= 1;
    turner.go(turner.target + 1);
  };
};
