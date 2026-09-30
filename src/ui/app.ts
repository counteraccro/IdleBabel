import { setNotation } from '../core/format';
import { createHeader } from './header';
import { createCounter } from './counter';
import { createMethodHive } from './methods/methodHive';
import { createFooter } from './footer';
import { createOptionsPage } from './options/optionsPage';
import { createBook3dPage } from './book3d/book3dPage';
import { whiteBook3d } from './book3d/whiteBook3d';
import { strangeBook3d } from './book3d/strangeBook3d';
import { createHandReading3d } from './book3d/handReading3d';
import { notebook3d } from './options/notebook3d';
import { revealStats, strangeBookFound } from '../systems/strangeBook';
import { setLocale, t } from '../i18n';
import { deleteSave, saveGame } from '../core/save';
import { createInitialState, type GameState } from '../core/state';
import { showWelcome } from './welcome';
import { loreTold, tellLore } from '../systems/lore';
import { mountLore } from './lore';
import { isDebugEnabled, DEBUG_BOOK_HASH } from '../debug/enabled';
import { debugBook3d } from '../debug/book/debugBook3d';
import type { Component } from './dom';

const OPTIONS_HASH = '#options';
const STRANGE_BOOK_HASH = '#livre';
const WHITE_BOOK_HASH = '#blanc';
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
  const open = (hash: string) => (): void => {
    // D'un livre à un autre (pile de l'en-tête) : la page remplace celle d'avant dans l'historique, et
    // « retour » ramène au jeu, pas au livre qu'on vient de quitter.
    if (openBook() !== null) {
      window.location.replace(hash);
      return;
    }
    openedFromGame = true;
    window.location.hash = hash;
  };
  const back = (): void => {
    if (openedFromGame) window.history.back();
    else window.location.hash = '';
  };

  /** Le livre dont la page est ouverte (null : le jeu). */
  const openBook = (): 'white' | 'strange' | 'options' | 'debug' | null => {
    const hash = window.location.hash;
    if (hash === OPTIONS_HASH) return 'options';
    if (hash === DEBUG_BOOK_HASH && debugging) return 'debug';
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
    books: {
      options: () => notebook3d(state, { onLocale: () => {}, onSettings: () => {}, onReset: () => {} }),
      white: () => whiteBook3d(state),
      strange: () => strangeBook3d(state),
      debug: debugging ? debugBook3d : undefined,
    },
    strangeBookFound: () => strangeBookFound(state),
    hasNewSeals: () => state.newSeals.length > 0,
    writtenCount: () => Object.values(state.written).reduce((sum, done) => sum + done.length, 0),
    openBook,
  });

  // Le compteur aussi : au-dessus du jeu comme des livres ouverts, il ne clignote pas d'un écran à l'autre.
  const counter = createCounter(state);
  const lasting: Component[] = [header, counter];

  const game = (): Component[] => [header, counter, createMethodHive(state), createHandReading3d(state), createFooter(state.settings)];

  const options = (): Component[] => [
    header,
    counter,
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
    }),
  ];

  const screen = (): Component[] => {
    if (window.location.hash === OPTIONS_HASH) return options();
    if (window.location.hash === DEBUG_BOOK_HASH && debugging) return [header, counter, createBook3dPage(debugBook3d(), back)];
    if (window.location.hash === WHITE_BOOK_HASH) {
      tellLore(state, 'whiteBook');
      // Tant qu'il n'en est jamais sorti, le joueur ne connaît pas encore le jeu : il lève les yeux du
      // livre, et le récit continue (firstBook).
      const first = !loreTold(state, 'firstBook');
      const leave = (): void => {
        tellLore(state, 'firstBook');
        back();
      };
      return [header, counter, createBook3dPage(whiteBook3d(state), leave, first ? t('ui.lookAround') : undefined)];
    }
    if (window.location.hash === STRANGE_BOOK_HASH && strangeBookFound(state))
      return [header, counter, createBook3dPage(strangeBook3d(state), back)];
    return game();
  };

  const render = (): void => {
    document.documentElement.lang = state.locale;
    // L'en-tête et le compteur restent ; le reste de l'écran d'avant s'efface puis s'en va, le nouveau
    // apparaît en fondu (la page d'un livre venu de la pile gère elle-même son arrivée).
    const leaving = components.filter((c) => !lasting.includes(c));
    components = screen();
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
      if (lasting.includes(c)) continue;
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
  render();
  // Moments de lore en attente (partie rechargée, trouvaille hors-ligne) : racontés une fois le joueur présenté.
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
