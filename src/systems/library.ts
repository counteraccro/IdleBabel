import { firstBookKept } from './books';
import { fakeEndingsFound } from './endings';
import type { GameState } from '../core/state';

/** Les livres rangés dans la bibliothèque : le premier livre gardé, les livres rares trouvés, et les tomes de « L'histoire de Babel ». */
export const libraryBookCount = (state: GameState): number =>
  (firstBookKept(state) ? 1 : 0) + Object.keys(state.rareBooks).length + fakeEndingsFound(state);

/** Un livre y attend que le joueur vienne le voir : la clé brille. */
export const libraryHasNews = (state: GameState): boolean => libraryBookCount(state) > state.libraryBooksSeen;

/** Le joueur entre dans la bibliothèque : il voit tous ses livres, la clé s'éteint. */
export const visitLibrary = (state: GameState): void => {
  state.libraryBooksSeen = libraryBookCount(state);
};
