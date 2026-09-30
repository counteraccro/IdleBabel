import './pile3d.css';
import { el } from './dom';
import { t } from '../i18n';
import { createPile3d } from './book3d/pile3d';
import { createGameTitle } from './gameTitle';
import type { Book3d } from './book3d/book3dBook';
import type { Component } from './dom';

export interface HeaderHandlers {
  onOptions: () => void;
  onWhiteBook: () => void;
  onStrangeBook: () => void;
  /** Le livre de débogage : seulement avec ?debug (sinon absent de la pile). */
  onDebugBook?: () => void;
  /** Les modèles 3D des trois livres du joueur. */
  books: { options: () => Book3d; white: () => Book3d; strange: () => Book3d; debug?: () => Book3d };
  /** Le livre étrange a-t-il été trouvé ? Il n'est avec les autres qu'ensuite. */
  strangeBookFound: () => boolean;
  /** Des sceaux obtenus attendent d'être vus : le contour du livre étrange luit. */
  hasNewSeals: () => boolean;
  /** Le livre ouvert en ce moment (sa page à l'écran), absent de la pile ; null : le jeu. */
  openBook: () => 'white' | 'strange' | 'options' | 'debug' | null;
  /** Morceaux écrits dans le livre blanc : quand il y en a un de plus, le livre sursaute. */
  writtenCount: () => number;
}

export const createHeader = (handlers: HeaderHandlers): Component => {
  const root = el('header');
  // Les livres du joueur, posés en vrac : le livre blanc, qu'il a sur lui dès son réveil, le livre
  // étrange trouvé plus tard, et le cahier tout en haut, bien de travers (on voit sa couverture).
  const pile = createPile3d([
    { id: 'white', label: () => t('ui.whiteBook'), book: handlers.books.white, onOpen: handlers.onWhiteBook, yaw: 0.02, dx: 0, dz: 0 },
    {
      id: 'strange',
      label: () => t('ui.strangeBook'),
      book: handlers.books.strange,
      onOpen: handlers.onStrangeBook,
      yaw: 0.06,
      dx: -0.05,
      dz: -0.02,
    },
    {
      id: 'options',
      label: () => t('ui.options'),
      book: handlers.books.options,
      onOpen: handlers.onOptions,
      yaw: -0.4,
      dx: 0.2,
      dz: -0.1,
      tilt: 0.05,
    },
    // Débogage : la plaque d'obsidienne posée sur tout le reste, sa couverture vers le ciel.
    ...(handlers.books.debug && handlers.onDebugBook
      ? [{ id: 'debug', label: () => 'Débogage', book: handlers.books.debug, onOpen: handlers.onDebugBook, yaw: 0.25, dx: -0.12, dz: 0.06 }]
      : []),
  ]);
  // Déjà trouvé à l'affichage : le livre est là. Trouvé pendant la partie : il tombe sur la pile.
  let found = handlers.strangeBookFound();
  pile.show('strange', found);
  let written = handlers.writtenCount();
  const update = (): void => {
    const now = handlers.strangeBookFound();
    if (now !== found) pile.show('strange', now, true);
    found = now;
    pile.news('strange', handlers.hasNewSeals());
    const count = handlers.writtenCount();
    if (count > written) pile.shake('white');
    written = count;
    pile.away(handlers.openBook());
    pile.relabel();
  };
  root.append(createGameTitle(), pile.root);
  return { root, update };
};
