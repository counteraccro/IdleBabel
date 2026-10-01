import { readPage } from '../../systems/click';
import { bookSpread, turnBookPage } from '../../systems/books';
import { DEBUG_BOOK_EVENT } from '../../debug/events';
import { createHeldBook3d } from './heldBook3d';
import { handBook3d } from './handBook3d';
import { createHandFinds } from './handFinds';
import type { Component } from '../dom';
import type { GameState } from '../../core/state';

/**
 * Le livre que le chercheur tient en main, en 3D, branché sur la partie :
 * chaque feuille tournée par le lecteur, ce sont deux pages lues ; chaque feuille posée fait avancer le livre
 * et donne ses trouvailles ; au bout de 205 feuilles (410 pages), il se referme et le chercheur en prend un autre.
 */
export const createHandReading3d = (state: GameState): Component => {
  const finds = createHandFinds(state);
  // Tout début de partie : le chercheur vient d'attraper ce livre (lore firstBook). Il reste fermé tant
  // que le récit n'est pas lu, puis s'ouvre (« Lire le livre »), même si les pages ne tournent pas seules.
  let waitingForLore = state.bookPage === 0 && !state.loreSeen.includes('firstBook');
  const held = createHeldBook3d(handBook3d(state, state.booksFinished, finds), {
    sway: () => state.settings.bookSway,
    startSpread: bookSpread(state),
    startClosed: waitingForLore,
    stayClosed: () => {
      if (waitingForLore) {
        if (!state.loreSeen.includes('firstBook')) return true;
        waitingForLore = false;
        return false;
      }
      return !state.settings.autoTurn;
    },
    onLeaf: (spread, counted) => {
      if (counted) readPage(state);
      finds.gain(spread);
      return turnBookPage(state);
    },
  });
  // Débogage : page ou numéro du livre changés à la main, le livre en main suit.
  const onDebugBook = (): void => {
    const closed = state.bookPage === 0 && !state.settings.autoTurn;
    held.reset(handBook3d(state, state.booksFinished, finds), bookSpread(state), closed);
  };
  window.addEventListener(DEBUG_BOOK_EVENT, onDebugBook, { signal: held.signal });
  return held;
};
