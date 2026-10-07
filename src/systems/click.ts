import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { gainPages, pagesPerSecond } from './production';
import { clickShare } from './technologies';
import { PAGES_PER_LEAF } from './books';
import { etherReading, handsMultiplier } from './etherium';

/** Une feuille tournée à la main : ses deux pages lues. */
export const PAGES_PER_CLICK = PAGES_PER_LEAF;

/**
 * Une feuille tournée à la main (ses pages comptent à vie : pagesByHand) ; la Mémoire musculaire (et les doigts
 * de l'Etherium) y ajoute une part de la production d'une seconde, les Mains de l'Etherium multiplient le tout. L'Éther
 * reçu multiplie la feuille elle-même (la production l'est déjà).
 */
export const readPage = (state: GameState): void => {
  const read = (PAGES_PER_CLICK * etherReading(state) + pagesPerSecond(state) * clickShare(state)) * handsMultiplier(state);
  gainPages(state, read);
  state.pagesByHand += read;
  state.stats.clicks += 1;
  recordOnce(state, 'firstClick');
};
