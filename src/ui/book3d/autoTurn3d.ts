import { TICK_MS } from '../../core/loop';
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
 * pages passe à l'entier suivant, pour que les deux avancent ensemble. En attente, au plus ce que `max`
 * permet de tourner d'un pas de la partie à l'autre (core/loop.ts), une page au moins ; au plus `max` par seconde, et rien n'est rattrapé tant que le lecteur a la main ou que le livre n'est pas
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
    // Le compteur n'avance que tous les 100 ms : une seule page en attente, c'était 10 par seconde au plus,
    // quel que soit le plafond (bug trouvé le 09/10 : 24 feuilles par seconde promises, 10 tournées).
    pending = Math.min(Math.max(1, Math.ceil((cap * TICK_MS) / 1000)), pending + fresh);
    if (pending < 1 || wait > 0) return;
    pending -= 1;
    wait += 1 / cap;
    turner.go(turner.target + 1);
  };
};
