import { el } from './dom';
import { t } from '../i18n';
import { createBookMedals, type BookMedalSpec } from './bookMedals';
import { createGameTitle } from './gameTitle';
import type { Book3d } from './book3d/book3dBook';
import type { Component } from './dom';

export interface HeaderHandlers {
  onOptions: () => void;
  onWhiteBook: () => void;
  onStrangeBook: () => void;
  /** L'Etherium, pris en main : sa couverture, son dos ; l'ouvrir, c'est le prestige (ou, au réveil, ses pages). */
  onEtherium: () => void;
  /** Son ouverture rapporte au moins 1 Éther (le prestige) : son médaillon porte l'étoile des nouveautés. */
  etheriumWaiting: () => boolean;
  /** Son nom est paru sur sa couverture (1 million de pages lues à vie) ; avant, c'est un livre violet. */
  etheriumNamed: () => boolean;
  /** Le livre de débogage : seulement avec ?debug (sinon pas de médaillon). */
  onDebugBook?: () => void;
  /** Les modèles 3D des livres du joueur : ils sortent de leur médaillon et volent jusqu'à leur page. */
  books: { options: () => Book3d; white: () => Book3d; strange: () => Book3d; etherium: () => Book3d; debug?: () => Book3d };
  /** Le livre étrange a-t-il été trouvé ? Il n'est avec les autres qu'ensuite. */
  strangeBookFound: () => boolean;
  /** Des sceaux obtenus ou une partie devenue lisible attendent d'être vus : l'étoile du Grand Livre. */
  strangeBookNews: () => boolean;
  /** Le livre ouvert en ce moment (sa page à l'écran), son médaillon pâli ; null : le jeu. */
  openBook: () => 'white' | 'strange' | 'options' | 'etherium' | 'debug' | 'library' | 'notes' | null;
  /** Entrer dans la bibliothèque personnelle (la clé). */
  onLibrary: () => void;
  /** La clé a son médaillon : un livre rare a été trouvé (ou débogage). */
  libraryKey: () => boolean;
  /** Un livre nouveau attend dans la bibliothèque : l'étoile de la clé. */
  libraryNews: () => boolean;
  /** Le jeton des tâches (dès le Nord allumé), juste après le livre blanc : son nom, ce qu'il ouvre, s'il est là, s'il attend. */
  taskToken: Pick<BookMedalSpec, 'label' | 'onOpen'>;
  tasksShown: () => boolean;
  tasksNews: () => boolean;
  /** Morceaux écrits dans le livre blanc : quand il y en a un de plus, son médaillon sursaute. */
  writtenCount: () => number;
}

export const createHeader = (handlers: HeaderHandlers): Component => {
  const root = el('header');
  // Les livres du joueur, en médaillons, de gauche à droite (maquette .ai/maquette-menu-naturel.html, piste 3, l'auteur,
  // 21/10) : le livre blanc, qu'il a sur lui dès son réveil, et le jeton de ses tâches ; le Grand Livre trouvé plus tard ;
  // l'Etherium ; le cahier ; la clé de la bibliothèque.
  const medals = createBookMedals([
    { id: 'white', label: () => t('ui.whiteBook'), book: handlers.books.white, onOpen: handlers.onWhiteBook },
    { id: 'tasks', ...handlers.taskToken },
    { id: 'strange', label: () => t('ui.strangeBook'), book: handlers.books.strange, onOpen: handlers.onStrangeBook },
    // L'Etherium, cerclé de violet, là dès le début ; tant que l'ouvrir ne rapporte pas 1 Éther, sa couverture résiste.
    {
      id: 'etherium',
      // Son nom dès qu'il paraît sur la couverture, même quand il peut s'ouvrir (l'auteur, 06/10).
      label: () => t(handlers.etheriumNamed() ? 'etherium.name' : 'etherium.unnamed'),
      book: handlers.books.etherium,
      onOpen: handlers.onEtherium,
      violet: true,
    },
    { id: 'options', label: () => t('ui.options'), book: handlers.books.options, onOpen: handlers.onOptions },
    // Le même nom que la page ouverte (openBook) : dans la bibliothèque, la clé est pâlie.
    { id: 'library', label: () => t('ui.library'), onOpen: handlers.onLibrary },
    // Débogage : la plaque d'obsidienne, au bout.
    ...(handlers.books.debug && handlers.onDebugBook
      ? [{ id: 'debug', label: () => 'Débogage', book: handlers.books.debug, onOpen: handlers.onDebugBook }]
      : []),
  ]);
  // Déjà trouvé à l'affichage : le médaillon est là. Trouvé pendant la partie : il paraît.
  let found = handlers.strangeBookFound();
  medals.show('strange', found);
  let written = handlers.writtenCount();
  medals.show('library', handlers.libraryKey());
  medals.show('tasks', handlers.tasksShown());
  const update = (): void => {
    const now = handlers.strangeBookFound();
    if (now !== found) medals.show('strange', now, true);
    found = now;
    medals.show('library', handlers.libraryKey());
    medals.show('tasks', handlers.tasksShown());
    medals.news('strange', handlers.strangeBookNews());
    // Le prestige rapporte : l'étoile de l'Etherium, jusqu'à ce qu'on l'ouvre.
    medals.news('etherium', handlers.etheriumWaiting());
    medals.news('library', handlers.libraryNews());
    medals.news('tasks', handlers.tasksNews());
    const count = handlers.writtenCount();
    if (count > written) medals.shake('white');
    written = count;
    medals.away(handlers.openBook());
    medals.relabel();
  };
  root.append(createGameTitle(), medals.root);
  return { root, update };
};
