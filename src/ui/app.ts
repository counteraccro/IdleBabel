import { setNotation } from '../core/format';
import { createHeader } from './header';
import { createCounter } from './counter';
import { createMethodHive } from './methods/methodHive';
import { createFooter } from './footer';
import { createOptionsPage } from './options/optionsPage';
import { BIG_BOOK_REWRITE } from './book3d/book3dBook';
import { createBook3dPage } from './book3d/book3dPage';
import { whiteBook3d } from './book3d/whiteBook3d';
import { strangeBook3d } from './book3d/strangeBook3d';
import { createHandReading3d } from './book3d/handReading3d';
import { notebook3d } from './options/notebook3d';
import { revealStats, strangeBookFound } from '../systems/strangeBook';
import { anyPartNews, meetStrangeBook } from '../systems/decipher';
import { mountAwayNotice } from './awayNotice/awayNotice';
import { setLocale, t } from '../i18n';
import { deleteSave, saveGame } from '../core/save';
import { createInitialState, type GameState } from '../core/state';
import { showWelcome } from './welcome';
import { loreTold, tellLore } from '../systems/lore';
import { mountLore } from './lore';
import { isDebugEnabled, DEBUG_BOOK_HASH, RARE_BOOK_HASH } from '../debug/enabled';
import { DEBUG_LIBRARY_EVENT } from '../debug/events';
import { rareBook3d } from './rareBooks/rareBook3d';
import { debugBook3d } from '../debug/book/debugBook3d';
import {
  LIBRARY_CREDITS_BOOK,
  LIBRARY_DEBUG_BOOK,
  LIBRARY_FINAL_BOOK,
  LIBRARY_FIRST_BOOK,
  createLibraryPage,
  shelfBook3d,
  type LibraryPage,
} from './library/libraryPage';
import { firstBookKept } from '../systems/books';
import { libraryHasNews, visitLibrary } from '../systems/library';
import { showDebugBookError } from './library/debugBookError';
import { isRareBookFound } from '../systems/rareBooks';
import { etherium3d } from './etherium/etherium3d';
import { ETHERIUM_HASH, openEtherium } from './etherium/prestigeStory';
import { takeStrangeBookPage } from './strangeBook/openAt';
import { closeEtherium, prestigeReady } from '../systems/prestige';
import { ETHERIUM_NAMED_PAGES } from '../data/etherium';
import type { Component } from './dom';

const OPTIONS_HASH = '#options';
const STRANGE_BOOK_HASH = '#livre';
const WHITE_BOOK_HASH = '#blanc';
/** La bibliothèque personnelle, et un de ses livres ouvert en grand (#bibliotheque:<id>). */
const LIBRARY_HASH = '#bibliotheque';
const LIBRARY_BOOK_HASH = '#bibliotheque:';
/** Changement d'écran : l'ancien s'efface en fondu pendant que le nouveau apparaît (voir .screen-out). */
const SCREEN_FADE_MS = 800;

/** Réglages qui s'appliquent à toute la page par une classe sur <html>. */
const applySettings = (state: GameState): void => {
  setNotation(state.settings.notation);
  document.documentElement.classList.toggle('reduce-blur', state.settings.reduceBlur);
  document.documentElement.classList.toggle('page-arrows', state.settings.pageArrows);
};

/**
 * Construit l'écran : le jeu, la page des options (adresse #options), le livre blanc (#blanc) ou le livre étrange (#livre) ;
 * le bouton « retour » du navigateur ramène au jeu. Renvoie la fonction de mise à jour appelée à chaque tick.
 */
export const mountApp = (root: HTMLElement, state: GameState): (() => void) => {
  let components: Component[] = [];
  applySettings(state);
  // Page ouverte depuis le jeu : « retour » revient en arrière dans l'historique du navigateur.
  let openedFromGame = false;
  // Livre de la pile ouvert depuis la bibliothèque : il s'ouvre par-dessus la vitrine, « retour » y ramène
  // (en arrière dans l'historique si elle y est juste avant).
  let overLibrary = false;
  let libraryBelow = false;
  const open = (hash: string) => (): void => {
    // La clé, depuis un livre ouvert par-dessus la vitrine : on y retourne.
    if (overLibrary && hash === LIBRARY_HASH) return back();
    if (inLibrary() && hash !== LIBRARY_HASH) {
      overLibrary = true;
      if (window.location.hash === LIBRARY_HASH) {
        libraryBelow = true;
        window.location.hash = hash;
      } else {
        // Depuis un livre de la vitrine : il est rangé, la page de la pile prend sa place dans l'historique.
        libraryBelow = openedFromLibrary;
        openedFromLibrary = false;
        window.location.replace(hash);
      }
      return;
    }
    // D'un livre à un autre (pile de l'en-tête) : la page remplace celle d'avant dans l'historique, et
    // « retour » ramène au jeu (ou à la vitrine), pas au livre qu'on vient de quitter.
    if (openBook() !== null) {
      window.location.replace(hash);
      return;
    }
    openedFromGame = true;
    window.location.hash = hash;
  };
  /** Le bouton de retour d'un livre de la pile : vers la vitrine s'il a été ouvert depuis elle. */
  const backLabel = (): string => t(overLibrary ? 'ui.backToLibrary' : 'ui.back');
  function back(): void {
    if (overLibrary) {
      overLibrary = false;
      if (libraryBelow) window.history.back();
      else window.location.replace(LIBRARY_HASH);
      return;
    }
    if (openedFromGame) window.history.back();
    else window.location.hash = '';
  }

  /** Le livre rare de la bibliothèque ouvert en grand (#bibliotheque:<id>), s'il a bien été trouvé. */
  const libraryBook = (): string | null => {
    const hash = window.location.hash;
    if (!hash.startsWith(LIBRARY_BOOK_HASH)) return null;
    const id = decodeURIComponent(hash.slice(LIBRARY_BOOK_HASH.length));
    return isRareBookFound(state, id) ||
      id === LIBRARY_CREDITS_BOOK ||
      ((id === LIBRARY_DEBUG_BOOK || id === LIBRARY_FINAL_BOOK) && debugging) ||
      (id === LIBRARY_FIRST_BOOK && firstBookKept(state))
      ? id
      : null;
  };
  /** La bibliothèque est ouverte : sa vitrine, ou l'un de ses livres. */
  const inLibrary = (): boolean => window.location.hash === LIBRARY_HASH || window.location.hash.startsWith(LIBRARY_BOOK_HASH);

  /** Le livre dont la page est ouverte (null : le jeu). */
  const openBook = (): 'white' | 'strange' | 'options' | 'etherium' | 'debug' | 'library' | null => {
    const hash = window.location.hash;
    if (hash === OPTIONS_HASH) return 'options';
    if (hash === ETHERIUM_HASH) return 'etherium';
    if (inLibrary()) return 'library';
    if ((hash === DEBUG_BOOK_HASH || hash.startsWith(RARE_BOOK_HASH)) && debugging) return 'debug';
    if (hash === WHITE_BOOK_HASH) return 'white';
    return hash === STRANGE_BOOK_HASH && strangeBookFound(state) ? 'strange' : null;
  };
  // L'en-tête reste à l'écran d'une page à l'autre : la pile ne se recharge pas, le livre ouvert y laisse
  // sa place vide et y revient.
  const debugging = isDebugEnabled();
  const header = createHeader({
    onOptions: open(OPTIONS_HASH),
    onWhiteBook: open(WHITE_BOOK_HASH),
    onStrangeBook: open(STRANGE_BOOK_HASH),
    onDebugBook: debugging ? open(DEBUG_BOOK_HASH) : undefined,
    // On le prend toujours en main (sa couverture, son dos) ; c'est l'ouvrir qui fait le prestige (screen).
    onEtherium: open(ETHERIUM_HASH),
    etheriumWaiting: () => prestigeReady(state),
    etheriumNamed: () => state.totalPagesRead >= ETHERIUM_NAMED_PAGES,
    books: {
      options: () => notebook3d(state, { onLocale: () => {}, onSettings: () => {}, onReset: () => {} }),
      white: () => whiteBook3d(state),
      strange: () => strangeBook3d(state),
      etherium: () => etherium3d(state),
      debug: debugging ? debugBook3d : undefined,
    },
    strangeBookFound: () => strangeBookFound(state),
    strangeBookNews: () => state.newSeals.length > 0 || anyPartNews(state),
    writtenCount: () => Object.values(state.written).reduce((sum, done) => sum + done.length, 0),
    openBook,
    onLibrary: open(LIBRARY_HASH),
    libraryKey: () => debugging || firstBookKept(state) || Object.keys(state.rareBooks).length > 0,
    libraryNews: () => libraryHasNews(state),
  });

  // Le compteur aussi : au-dessus du jeu comme des livres ouverts, il ne clignote pas d'un écran à l'autre.
  const counter = createCounter(state);
  const lasting: Component[] = [header, counter];

  const game = (): Component[] => [header, counter, createMethodHive(state), createHandReading3d(state), createFooter(state.settings)];

  const options = (): Component[] =>
    pileBook(
      createOptionsPage(state, {
        // Le cahier se réécrit lui-même, ouvert là où il est : l'écran n'est pas reconstruit.
        onLocale: (locale) => {
          state.locale = locale;
          setLocale(locale);
          document.documentElement.lang = locale;
          saveGame(state);
        },
        onSettings: () => {
          applySettings(state);
          saveGame(state);
        },
        onReset: () => {
          deleteSave();
          // Nouvelle partie : le livre étrange est à retrouver, même si le débogage le montrait.
          revealStats(false);
          Object.assign(state, createInitialState(state.locale), { settings: state.settings });
          saveGame(state);
          // On repart de zéro à l'accueil du site : page rechargée, sans #options ni ?debug.
          window.location.replace(import.meta.env.BASE_URL);
        },
        onBack: back,
        backLabel,
      }),
    );

  // Un livre de la vitrine : il s'ouvre par-dessus elle, et « retour » y ramène.
  let openedFromLibrary = false;
  /** La vitrine à l'écran : gardée telle quelle quand un de ses livres s'ouvre par-dessus, et au retour. */
  let shelves: LibraryPage | null = null;
  const libraryPage = (): LibraryPage => {
    // Le joueur entre dans la bibliothèque (vitrine, ou un de ses livres) : il a vu tous ses livres.
    visitLibrary(state);
    if (shelves && components.includes(shelves)) return shelves;
    shelves = createLibraryPage(
      state,
      (id) => {
        openedFromLibrary = true;
        window.location.hash = `${LIBRARY_BOOK_HASH}${encodeURIComponent(id)}`;
      },
      () => {
        if (openedFromGame) window.history.back();
        else window.location.hash = '';
      },
      debugging,
    );
    return shelves;
  };
  const library = (): Component[] => {
    const page = libraryPage();
    page.setBackdrop(false);
    return [header, counter, page];
  };
  const libraryBookPage = (id: string): Component[] => {
    const leave = (): void => {
      if (openedFromLibrary) window.history.back();
      else window.location.hash = LIBRARY_HASH;
      openedFromLibrary = false;
    };
    // La vitrine reste en fond, floue, sous le livre ouvert.
    const page = libraryPage();
    page.setBackdrop(true, id);
    const spec = shelfBook3d(state, id, debugging);
    // Le livre de débogage, hors du mode ?debug : on le prend en main, mais il refuse de s'ouvrir.
    if (id === LIBRARY_DEBUG_BOOK && !debugging) spec.sealed = showDebugBookError;
    return [header, counter, page, createBook3dPage(spec, leave, t('ui.shelveBook'))];
  };

  /** La page d'un livre de la pile ; ouvert depuis la bibliothèque, la vitrine reste en fond, floue. */
  const pileBook = (page: Component): Component[] => {
    if (!overLibrary) return [header, counter, page];
    const shelf = libraryPage();
    shelf.setBackdrop(true);
    return [header, counter, shelf, page];
  };

  const screen = (): Component[] => {
    if (window.location.hash === OPTIONS_HASH) return options();
    if (window.location.hash === LIBRARY_HASH) return library();
    const shelved = libraryBook();
    if (shelved) return libraryBookPage(shelved);
    if (inLibrary()) return library();
    if (window.location.hash === DEBUG_BOOK_HASH && debugging) return pileBook(createBook3dPage(debugBook3d(), back, backLabel()));
    // Débogage : un livre rare ouvert en grand, comme il sera lu dans la bibliothèque.
    if (window.location.hash.startsWith(RARE_BOOK_HASH) && debugging)
      return [header, counter, createBook3dPage(rareBook3d(state, window.location.hash.slice(RARE_BOOK_HASH.length)), back)];
    if (window.location.hash === WHITE_BOOK_HASH) {
      tellLore(state, 'whiteBook');
      // Tant qu'il n'en est jamais sorti, le joueur ne connaît pas encore le jeu : il lève les yeux du
      // livre, et le récit continue (firstBook).
      const first = !loreTold(state, 'firstBook');
      const leave = (): void => {
        tellLore(state, 'firstBook');
        back();
      };
      return pileBook(createBook3dPage(whiteBook3d(state), leave, first ? t('ui.lookAround') : backLabel()));
    }
    // L'Etherium, pris en main : sa couverture ne s'ouvre que pour le prestige (confirmé) ; au réveil, ses pages
    // sont là. Une fois reposé, il ne se rouvre plus avant le prochain prestige (render).
    if (window.location.hash === ETHERIUM_HASH) {
      const spec = etherium3d(state);
      if (!state.etheriumInHand)
        spec.sealed = (cover) =>
          openEtherium(
            state,
            () => {
              delete spec.sealed;
              // Ses pages ont été dessinées avant le prestige : la garde redessinée montre l'Éther qu'il vient de verser.
              window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
              cover.open();
            },
            cover.nudge,
          );
      return pileBook(createBook3dPage(spec, back, state.etheriumInHand ? t('etherium.close') : backLabel()));
    }
    if (window.location.hash === STRANGE_BOOK_HASH && strangeBookFound(state))
      return pileBook(createBook3dPage(strangeBook3d(state, takeStrangeBookPage()), back, backLabel()));
    return game();
  };

  /** L'Etherium était en main : quitté, de quelque façon que ce soit, il est refermé, et retourne sur la pile. */
  let etheriumOpen = false;
  const render = (): void => {
    document.documentElement.lang = state.locale;
    if (etheriumOpen && openBook() !== 'etherium') {
      closeEtherium(state);
      saveGame(state);
    }
    etheriumOpen = openBook() === 'etherium';
    // L'en-tête et le compteur restent ; le reste de l'écran d'avant s'efface puis s'en va, le nouveau
    // apparaît en fondu (la page d'un livre venu de la pile gère elle-même son arrivée).
    // Plus de livre de la pile ouvert (retour du navigateur…) : il ne l'est plus par-dessus la vitrine.
    const book = openBook();
    if (book === null || book === 'library') overLibrary = false;
    const next = screen();
    // Ce qui reste d'un écran à l'autre (en-tête, compteur, vitrine sous un livre ouvert) ne bouge pas.
    const leaving = components.filter((c) => !lasting.includes(c) && !next.includes(c));
    // La vitrine quittée n'est plus retenue (sa scène, ses images) : la prochaine visite en refait une.
    if (shelves && leaving.includes(shelves)) shelves = null;
    components = next;
    for (const old of leaving) {
      // Livre qui retourne à la pile : sa page reste jusqu'à ce qu'il y soit, puis s'en va d'elle-même.
      if (old.root.classList.contains('homing')) continue;
      old.root.classList.remove('screen-in');
      old.root.classList.add('screen-out');
      window.setTimeout(() => old.root.remove(), SCREEN_FADE_MS);
    }
    if (!header.root.isConnected) root.prepend(header.root);
    if (!counter.root.isConnected) header.root.after(counter.root);
    for (const c of components) {
      if (lasting.includes(c) || c.root.isConnected) continue;
      if (openBook() === null && leaving.length > 0) {
        c.root.classList.add('screen-in');
        // Fondu fini, l'animation est retirée : elle tiendrait l'opacité à 1 et empêcherait le fondu de sortie.
        const done = (event: AnimationEvent): void => {
          if (event.target !== c.root) return;
          c.root.classList.remove('screen-in');
          c.root.removeEventListener('animationend', done);
        };
        c.root.addEventListener('animationend', done);
      }
      root.append(c.root);
    }
    // Page d'un livre : le titre du jeu laisse sa place au bouton de retour.
    root.classList.toggle('book-open', openBook() !== null);
    header.update();
  };

  window.addEventListener('hashchange', render);
  // Débogage : livres trouvés ou oubliés, la vitrine à l'écran est refaite (elle place ses livres à sa création).
  window.addEventListener(DEBUG_LIBRARY_EVENT, () => {
    if (!shelves || !components.includes(shelves)) return;
    shelves = null;
    render();
  });
  render();
  // Moments de lore en attente (partie rechargée, trouvaille hors-ligne) : racontés une fois le joueur présenté.
  // Partie qui a refermé son premier livre avant que ce moment existe : il est raconté une fois.
  if (state.booksFinished > 0) tellLore(state, 'firstBookKept');
  // Partie qui avait déjà le Grand Livre avant que son récit existe : il est raconté une fois.
  meetStrangeBook(state);
  // Retour d'une longue absence : avant les récits en attente, qui le suivent.
  mountAwayNotice(state);
  const tellPendingLore = mountLore(state);
  // Nouvelle partie (ou partie d'avant le nom) : le joueur se présente et choisit sa langue.
  if (!state.playerName)
    showWelcome((name, locale) => {
      state.playerName = name;
      state.locale = locale;
      setLocale(locale);
      tellLore(state, 'lookAround');
      saveGame(state);
      render();
      tellPendingLore();
    });
  return () => components.forEach((c) => c.update());
};
