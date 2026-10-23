import { readPage } from '../../systems/click';
import { bookSpread, turnBookPage } from '../../systems/books';
import { tellLore } from '../../systems/lore';
import { meetStrangeBook } from '../../systems/decipher';
import { isStrangeBook } from '../../systems/strangeBook';
import { takeBook } from '../../systems/rareBooks';
import { takeTome } from '../../systems/endings';
import { DEBUG_BOOK_EVENT } from '../../debug/events';
import { BOOK_MOVED_EVENT } from '../../core/absence';
import { heldBookReplacement } from '../../mods/heldBook';
import { el } from '../dom';
import { createHeldBook3d, type HeldBook } from './heldBook3d';
import { createModHeldBook, type ModHeld } from './modHeldBook';
import { handBook3d } from './handBook3d';
import { createHandFinds } from './handFinds';
import type { Component } from '../dom';
import type { GameState } from '../../core/state';

/**
 * Le livre que le chercheur tient en main, en 3D, branché sur la partie :
 * chaque feuille tournée par le lecteur, ce sont deux pages lues ; chaque feuille posée fait avancer le livre
 * et donne ses trouvailles ; au bout de 205 feuilles (410 pages), il se referme et le chercheur en prend un autre.
 * Un mod peut le remplacer (IdleBabel.replaceHeldBook : la liseuse) pour les livres ordinaires ; un livre rare, le
 * Grand Livre, et le premier livre tant que son récit n'est pas lu restent en 3D.
 */
export const createHandReading3d = (state: GameState): Component => {
  const finds = createHandFinds(state);
  // Le livre 3D ou la vue du mod : l'un ou l'autre là-dedans, à la place du livre dans la grille.
  const root = el('div', 'hand-reading');
  // Tout début de partie : le chercheur vient d'attraper ce livre (lore firstBook). Il reste fermé tant
  // que le récit n'est pas lu, puis s'ouvre (« Lire le livre »), même si les pages ne tournent pas seules.
  let waitingForLore = state.bookPage === 0 && !state.loreSeen.includes('firstBook');
  const onLeaf = (spread: number, counted: boolean): boolean => {
    if (counted) readPage(state);
    finds.gain(spread, counted);
    return turnBookPage(state);
  };
  // Le premier livre refermé, encore en main : le chercheur le garde (rangé dans la bibliothèque).
  const onClosed = (): void => tellLore(state, 'firstBookKept');

  const create3d = (startClosed: boolean): HeldBook =>
    createHeldBook3d(handBook3d(state, state.booksFinished, finds), {
      sway: () => state.settings.bookSway,
      startSpread: bookSpread(state),
      startClosed,
      stayClosed: () => {
        if (waitingForLore) {
          if (!state.loreSeen.includes('firstBook')) return true;
          waitingForLore = false;
          return false;
        }
        return !state.settings.autoTurn;
      },
      onLeaf,
      onClosed,
      // Le Grand Livre arrive en main, encore fermé : son récit l'annonce avant qu'il s'ouvre.
      onArrived: () => meetStrangeBook(state),
    });

  /** Le livre n° `index` est-il ordinaire ? Il arrive en main : s'il est rare, ou un tome, il est trouvé (comme handBook3d). */
  const ordinary = new Map<number, boolean>();
  const isOrdinary = (index: number): boolean => {
    if (!ordinary.has(index))
      ordinary.set(index, !isStrangeBook(index) && !takeBook(state, index) && takeTome(state, index, true) === undefined);
    return ordinary.get(index)!;
  };
  const wantsMod = (): boolean =>
    heldBookReplacement() !== null && !(waitingForLore && !state.loreSeen.includes('firstBook')) && isOrdinary(state.booksFinished);

  let held: { kind: '3d'; book: HeldBook } | { kind: 'mod'; book: ModHeld };
  /** Page ou numéro du livre changés hors de l'écran (absence, modale, débogage) : le livre en main suit. */
  const follow = (signal: AbortSignal, moved: () => void): void => {
    window.addEventListener(DEBUG_BOOK_EVENT, moved, { signal });
    window.addEventListener(BOOK_MOVED_EVENT, moved, { signal });
  };
  const mount3d = (startClosed: boolean): void => {
    const book = create3d(startClosed);
    held = { kind: '3d', book };
    root.replaceChildren(book.root);
    follow(book.signal, () => {
      const closed = state.bookPage === 0 && !state.settings.autoTurn;
      book.reset(handBook3d(state, state.booksFinished, finds), bookSpread(state), closed);
    });
  };
  const mountMod = (): boolean => {
    const factory = heldBookReplacement();
    const book = factory && createModHeldBook(state, factory, { finds, onLeaf, onClosed });
    if (!book) return false;
    held = { kind: 'mod', book };
    root.replaceChildren(book.root);
    follow(book.signal, book.reset);
    return true;
  };
  mount3d(waitingForLore);
  /** Un mod qui plante ne remplace plus le livre (sinon, il le referait à chaque instant). */
  let broken = false;

  return {
    root,
    update: () => {
      if (broken) return;
      if (held.kind === '3d' && wantsMod() && held.book.settled()) broken = !mountMod();
      else if (held.kind === 'mod' && !wantsMod()) {
        // Le livre suivant est rare, ou le Grand Livre : il arrive fermé, en 3D.
        mount3d(true);
        meetStrangeBook(state);
      }
    },
  };
};
