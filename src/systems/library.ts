import { firstBookKept } from './books';
import type { GameState } from '../core/state';

/** Les livres rangés dans la bibliothèque : le premier livre gardé, puis les livres rares trouvés. */
export const libraryBookCount = (state: GameState): number => (firstBookKept(state) ? 1 : 0) + Object.keys(state.rareBooks).length;

/** Un livre y attend que le joueur vienne le voir : la clé brille. */
export const libraryHasNews = (state: GameState): boolean => libraryBookCount(state) > state.libraryBooksSeen;

/** Le joueur entre dans la bibliothèque : il voit tous ses livres, la clé s'éteint. */
export const visitLibrary = (state: GameState): void => {
  state.libraryBooksSeen = libraryBookCount(state);
};
