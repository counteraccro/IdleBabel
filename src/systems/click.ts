import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { gainPages, pagesPerSecond } from './production';
import { clickShare } from './technologies';
import { PAGES_PER_LEAF } from './books';
import { etherReading, handsMultiplier } from './etherium';
import { clickBoon, fourTen } from './boons';
import { relicReading } from './relics';
import { hookProduct } from '../mods/hooks';
import { modded } from '../mods/quantities';

/** Une feuille tournée à la main : ses deux pages lues. */
export const PAGES_PER_CLICK = PAGES_PER_LEAF;

/**
 * Une feuille tournée à la main (ses pages comptent à vie : pagesByHand) ; la Mémoire musculaire (et les doigts
 * de l'Etherium) y ajoute une part de la production d'une seconde, les Mains de l'Etherium multiplient le tout. L'Éther
 * reçu, le Sablier et Quatre cent dix multiplient la feuille elle-même (la production l'est déjà : sinon, ×410 deux fois) ;
 * la Main légère de la lettre et les mods (crochet `click`, grandeur `click`), le tout.
 */
export const readPage = (state: GameState): void => {
  const read =
    (PAGES_PER_CLICK * etherReading(state) * relicReading(state) * fourTen() + pagesPerSecond(state) * clickShare(state)) *
    handsMultiplier(state) *
    clickBoon() *
    hookProduct('click') *
    modded('click');
  gainPages(state, read);
  state.pagesByHand += read;
  state.stats.clicks += 1;
  recordOnce(state, 'firstClick');
};
