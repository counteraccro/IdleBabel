import type { Turner } from './turner';

/** D'où viennent les pages qui tournent seules. */
export interface AutoTurnSource {
  /** Pages entières produites jusqu'ici (systems/production.ts) : une page tourne à chacune. */
  produced: () => number;
  /** Pages tournées au plus par seconde ; 0 : les pages ne tournent pas seules. */
  max: () => number;
}

/**
 * Pages qui tournent seules au rythme de la production : une page part chaque fois que le compteur de
 * pages passe à l'entier suivant, pour que les deux avancent ensemble. Au plus une page en attente, au
 * plus `max` par seconde, et rien n'est rattrapé tant que le lecteur a la main ou que le livre n'est pas
 * ouvert. Des pages demandées vite s'enchaînent en feuilletage (turner). Renvoie la fonction à appeler à
 * chaque image.
 */
export const createAutoTurn3d = ({ produced, max }: AutoTurnSource) => {
  let seen = produced();
  let pending = 0;
  /** Temps à attendre avant la page suivante (plafond) ; négatif : de l'avance, pour tenir le rythme exact. */
  let wait = 0;
  return (dt: number, turner: Turner, lastSpread: number, ready: boolean): void => {
    const now = produced();
    const fresh = now - seen;
    seen = now;
    const cap = max();
    if (!ready || cap <= 0 || turner.target >= lastSpread) {
      pending = 0;
      wait = 0;
      return;
    }
    wait = Math.max(-1 / cap, wait - dt);
    pending = Math.min(1, pending + fresh);
    if (pending < 1 || wait > 0) return;
    pending -= 1;
    wait += 1 / cap;
    turner.go(turner.target + 1);
  };
};
