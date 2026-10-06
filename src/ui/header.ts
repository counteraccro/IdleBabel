import './pile3d.css';
import { el } from './dom';
import { t } from '../i18n';
import { createPile3d } from './book3d/pile3d';
import { createGameTitle } from './gameTitle';
import { libraryKey } from './library/libraryKey';
import type { Book3d } from './book3d/book3dBook';
import type { Component } from './dom';

/** Le contour de l'Etherium : le violet de sa goutte. */
const ETHERIUM_GLOW = 0xb47cff;

export interface HeaderHandlers {
  onOptions: () => void;
  onWhiteBook: () => void;
  onStrangeBook: () => void;
  /** L'Etherium, ouvert : le prestige (« L'ouvrir ? ») ou, au réveil, ses pages. */
  onEtherium: () => void;
  /** Ses pages sont à lui depuis le réveil : il s'ouvre comme les autres livres. */
  etheriumInHand: () => boolean;
  /** Son ouverture rapporte au moins 1 Éther (le prestige) : il luit de violet. */
  etheriumWaiting: () => boolean;
  /** Son nom est paru sur sa couverture (1 million de pages lues à vie) ; avant, c'est un livre violet. */
  etheriumNamed: () => boolean;
  /** Le livre de débogage : seulement avec ?debug (sinon absent de la pile). */
  onDebugBook?: () => void;
  /** Les modèles 3D des trois livres du joueur. */
  books: { options: () => Book3d; white: () => Book3d; strange: () => Book3d; etherium: () => Book3d; debug?: () => Book3d };
  /** Le livre étrange a-t-il été trouvé ? Il n'est avec les autres qu'ensuite. */
  strangeBookFound: () => boolean;
  /** Des sceaux obtenus ou une partie devenue lisible attendent d'être vus : le contour du Grand Livre luit. */
  strangeBookNews: () => boolean;
  /** Le livre ouvert en ce moment (sa page à l'écran), absent de la pile ; null : le jeu. */
  openBook: () => 'white' | 'strange' | 'options' | 'etherium' | 'debug' | 'library' | null;
  /** Entrer dans la bibliothèque personnelle (la clé). */
  onLibrary: () => void;
  /** La clé est posée près de la pile : un livre rare a été trouvé (ou débogage). */
  libraryKey: () => boolean;
  /** Un livre nouveau attend dans la bibliothèque : la clé brille. */
  libraryNews: () => boolean;
  /** Morceaux écrits dans le livre blanc : quand il y en a un de plus, le livre sursaute. */
  writtenCount: () => number;
}

export const createHeader = (handlers: HeaderHandlers): Component => {
  const root = el('header');
  // Les livres du joueur, posés en vrac : le livre blanc, qu'il a sur lui dès son réveil, le livre
  // étrange trouvé plus tard, et le cahier tout en haut, bien de travers (on voit sa couverture).
  const pile = createPile3d(
    [
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
      // L'Etherium, debout à côté de la pile (elle en a déjà quatre), au contour violet, là dès le début. Tant que
      // l'ouvrir ne rapporte pas 1 Éther, il ne s'ouvre pas : on le regarde (sa couverture), il résiste.
      {
        id: 'etherium',
        label: () =>
          t(
            handlers.etheriumInHand()
              ? 'etherium.name'
              : handlers.etheriumWaiting()
                ? 'etherium.open'
                : handlers.etheriumNamed()
                  ? 'etherium.name'
                  : 'etherium.unnamed',
          ),
        book: handlers.books.etherium,
        onOpen: () => (handlers.etheriumInHand() || handlers.etheriumWaiting() ? handlers.onEtherium() : pile.shake('etherium')),
        yaw: -0.1,
        dx: 0,
        dz: 0.04,
        outline: ETHERIUM_GLOW,
        stays: () => !handlers.etheriumInHand(),
      },
      // Débogage : la plaque d'obsidienne posée sur tout le reste, sa couverture vers le ciel.
      ...(handlers.books.debug && handlers.onDebugBook
        ? [
            {
              id: 'debug',
              label: () => 'Débogage',
              book: handlers.books.debug,
              onOpen: handlers.onDebugBook,
              yaw: 0.25,
              dx: -0.12,
              dz: 0.06,
            },
          ]
        : []),
    ],
    // La clé de la bibliothèque, posée sur la pile dès le premier livre rare trouvé.
    [libraryKey(handlers.onLibrary)],
  );
  // Déjà trouvé à l'affichage : le livre est là. Trouvé pendant la partie : il tombe sur la pile.
  let found = handlers.strangeBookFound();
  pile.show('strange', found);
  pile.show('etherium', true);
  let written = handlers.writtenCount();
  pile.show('library', handlers.libraryKey());
  const update = (): void => {
    const now = handlers.strangeBookFound();
    if (now !== found) pile.show('strange', now, true);
    found = now;
    pile.news('strange', handlers.strangeBookNews());
    // Le prestige rapporte : l'Etherium luit tant qu'il attend d'être ouvert.
    pile.news('etherium', handlers.etheriumWaiting());
    const count = handlers.writtenCount();
    if (count > written) pile.shake('white');
    written = count;
    pile.away(handlers.openBook());
    pile.relabel();
    pile.show('library', handlers.libraryKey());
    pile.news('library', handlers.libraryNews());
  };
  root.append(createGameTitle(), pile.root);
  return { root, update };
};
