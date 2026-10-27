import type { GameState } from '../core/state';
import { recordOnce } from '../core/history';
import { gainPages, pagesPerSecond } from './production';
import { clickShare } from './technologies';
import { PAGES_PER_LEAF } from './books';
import { etherReading, handsMultiplier } from './etherium';
import { clickBoon, fourTen } from './boons';
import { relicReading } from './relics';
import { curiosityClick } from './curiosityEffects';
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
export const pagesPerClick = (state: GameState): number => {
  const { leaf, share } = clickParts(state);
  return (leaf + share) * handsMultiplier(state) * clickBoon() * curiosityClick(state) * hookProduct('click') * modded('click');
};

/**
 * Les deux parts d'un clic, avant ce qui multiplie le tout : la feuille (avec l'Éther, le Sablier, Quatre cent dix) et la part
 * de la production d'une seconde. Le chapitre « Bonus » du Grand Livre en tire ce que chacun fait vraiment au clic.
 */
export const clickParts = (state: GameState): { leaf: number; share: number } => ({
  leaf: PAGES_PER_CLICK * etherReading(state) * relicReading(state) * fourTen(),
  share: pagesPerSecond(state) * clickShare(state),
});

/** Un clic : la feuille tournée, et ce qu'elle rapporte (pagesPerClick). */
export const readPage = (state: GameState): void => {
  const read = pagesPerClick(state);
  gainPages(state, read);
  state.pagesByHand += read;
  state.stats.clicks += 1;
  recordOnce(state, 'firstClick');
};
