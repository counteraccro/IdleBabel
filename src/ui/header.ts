import './shelf3d.css';
import { el } from './dom';
import { t } from '../i18n';
import { createShelf3d } from './book3d/shelf3d';
import { createGameTitle } from './gameTitle';
import { libraryKey } from './library/libraryKey';
import type { Book3d } from './book3d/book3dBook';
import type { ShelfOrnament } from './book3d/shelf3d';
import type { Component } from './dom';

/** Le contour de l'Etherium : le violet de sa goutte. */
const ETHERIUM_GLOW = 0xb47cff;

export interface HeaderHandlers {
  onOptions: () => void;
  onWhiteBook: () => void;
  onStrangeBook: () => void;
  /** L'Etherium, pris en main : sa couverture, son dos ; l'ouvrir, c'est le prestige (ou, au réveil, ses pages). */
  onEtherium: () => void;
  /** Son ouverture rapporte au moins 1 Éther (le prestige) : il luit de violet. */
  etheriumWaiting: () => boolean;
  /** Son nom est paru sur sa couverture (1 million de pages lues à vie) ; avant, c'est un livre violet. */
  etheriumNamed: () => boolean;
  /** Le livre de débogage : seulement avec ?debug (sinon absent du rebord). */
  onDebugBook?: () => void;
  /** Les modèles 3D des trois livres du joueur. */
  books: { options: () => Book3d; white: () => Book3d; strange: () => Book3d; etherium: () => Book3d; debug?: () => Book3d };
  /** Le livre étrange a-t-il été trouvé ? Il n'est avec les autres qu'ensuite. */
  strangeBookFound: () => boolean;
  /** Des sceaux obtenus ou une partie devenue lisible attendent d'être vus : le contour du Grand Livre luit. */
  strangeBookNews: () => boolean;
  /** Le livre ouvert en ce moment (sa page à l'écran), absent du rebord ; null : le jeu. */
  openBook: () => 'white' | 'strange' | 'options' | 'etherium' | 'debug' | 'library' | 'notes' | null;
  /** Entrer dans la bibliothèque personnelle (la clé). */
  onLibrary: () => void;
  /** La clé est au bout du rebord : un livre rare a été trouvé (ou débogage). */
  libraryKey: () => boolean;
  /** Un livre nouveau attend dans la bibliothèque : la clé brille. */
  libraryNews: () => boolean;
  /** Le jeton des tâches, collé à la clé (dès le Nord allumé) : son modèle, s'il est là, s'il brille. */
  taskToken: ShelfOrnament;
  tasksShown: () => boolean;
  tasksNews: () => boolean;
  /** Morceaux écrits dans le livre blanc : quand il y en a un de plus, le livre sursaute. */
  writtenCount: () => number;
}

export const createHeader = (handlers: HeaderHandlers): Component => {
  const root = el('header');
  // Les livres du joueur, debout sur un rebord, de gauche à droite (maquette .ai/maquette-menus.html, piste P1, l'auteur,
  // 21/10) : le livre blanc, qu'il a sur lui dès son réveil, le Grand Livre trouvé plus tard, l'Etherium, le cahier.
  const shelf = createShelf3d(
    [
      { id: 'white', label: () => t('ui.whiteBook'), book: handlers.books.white, onOpen: handlers.onWhiteBook },
      { id: 'strange', label: () => t('ui.strangeBook'), book: handlers.books.strange, onOpen: handlers.onStrangeBook },
      // L'Etherium, au contour violet, là dès le début ; tant que l'ouvrir ne rapporte pas 1 Éther, sa couverture résiste.
      {
        id: 'etherium',
        // Son nom dès qu'il paraît sur la couverture, même quand il peut s'ouvrir (l'auteur, 06/10).
        label: () => t(handlers.etheriumNamed() ? 'etherium.name' : 'etherium.unnamed'),
        book: handlers.books.etherium,
        onOpen: handlers.onEtherium,
        outline: ETHERIUM_GLOW,
      },
      { id: 'options', label: () => t('ui.options'), book: handlers.books.options, onOpen: handlers.onOptions },
      // Débogage : la plaque d'obsidienne, au bout.
      ...(handlers.books.debug && handlers.onDebugBook
        ? [{ id: 'debug', label: () => 'Débogage', book: handlers.books.debug, onOpen: handlers.onDebugBook }]
        : []),
    ],
    // La clé de la bibliothèque, au bout de la planche dès le premier livre rare trouvé ; le jeton contre le livre blanc.
    [libraryKey(handlers.onLibrary), handlers.taskToken],
  );
  // Déjà trouvé à l'affichage : le livre est là. Trouvé pendant la partie : il tombe sur la planche.
  let found = handlers.strangeBookFound();
  shelf.show('strange', found);
  shelf.show('etherium', true);
  let written = handlers.writtenCount();
  shelf.show('library', handlers.libraryKey());
  shelf.show('tasks', handlers.tasksShown());
  const update = (): void => {
    const now = handlers.strangeBookFound();
    if (now !== found) shelf.show('strange', now, true);
    found = now;
    shelf.news('strange', handlers.strangeBookNews());
    // Le prestige rapporte : l'Etherium luit tant qu'il attend d'être ouvert.
    shelf.news('etherium', handlers.etheriumWaiting());
    const count = handlers.writtenCount();
    if (count > written) shelf.shake('white');
    written = count;
    shelf.away(handlers.openBook());
    shelf.relabel();
    shelf.show('library', handlers.libraryKey());
    shelf.news('library', handlers.libraryNews());
    shelf.show('tasks', handlers.tasksShown());
    shelf.news('tasks', handlers.tasksNews());
  };
  root.append(createGameTitle(), shelf.root);
  return { root, update };
};
