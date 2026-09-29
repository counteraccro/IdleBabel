import { readPage } from '../../systems/click';
import { turnBookPage } from '../../systems/books';
import { DEBUG_BOOK_EVENT } from '../../debug/events';
import { createHeldBook3d } from './heldBook3d';
import { handBook3d } from './handBook3d';
import { createHandFinds } from './handFinds';
import type { Component } from '../dom';
import type { GameState } from '../../core/state';

/**
 * Le livre que le chercheur tient en main, en 3D, branché sur la partie comme le livre 2D (reading.ts) :
 * chaque feuille tournée par le lecteur est une page lue, chaque feuille posée fait avancer le livre et
 * donne sa trouvaille ; au bout de 410, il se referme et le chercheur en prend un autre.
 */
export const createHandReading3d = (state: GameState): Component => {
  const finds = createHandFinds(state);
  const held = createHeldBook3d(handBook3d(state, state.booksFinished, finds), {
    sway: () => state.settings.bookSway,
    startSpread: state.bookPage,
    stayClosed: () => !state.settings.autoTurn,
    onLeaf: (spread, counted) => {
      if (counted) readPage(state);
      finds.gain(spread);
      return turnBookPage(state);
    },
  });
  // Débogage : page ou numéro du livre changés à la main, le livre en main suit.
  const onDebugBook = (): void => {
    if (!held.root.isConnected) return window.removeEventListener(DEBUG_BOOK_EVENT, onDebugBook);
    const closed = state.bookPage === 0 && !state.settings.autoTurn;
    held.reset(handBook3d(state, state.booksFinished, finds), state.bookPage, closed);
  };
  window.addEventListener(DEBUG_BOOK_EVENT, onDebugBook);
  return held;
};
