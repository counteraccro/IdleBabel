import { createHeader } from './header';
import { createCounter } from './counter';
import { createToolsPanel } from './toolsPanel';
import { createReading } from './reading';
import { createFooter } from './footer';
import { createOptionsPage } from './options/optionsPage';
import { createStrangeBookPage } from './strangeBook/strangeBookPage';
import { revealStats, strangeBookFound } from '../systems/strangeBook';
import { setLocale } from '../i18n';
import { deleteSave, saveGame } from '../core/save';
import { createInitialState, type GameState } from '../core/state';
import type { Component } from './dom';

const OPTIONS_HASH = '#options';
const STRANGE_BOOK_HASH = '#livre';

/**
 * Construit l'écran : le jeu, la page des options (adresse #options) ou le livre étrange (#livre) ;
 * le bouton « retour » du navigateur ramène au jeu. Renvoie la fonction de mise à jour appelée à chaque tick.
 */
/** Réglages qui s'appliquent à toute la page par une classe sur <html>. */
const applySettings = (state: GameState): void => {
  document.documentElement.classList.toggle('reduce-blur', state.settings.reduceBlur);
};

export const mountApp = (root: HTMLElement, state: GameState): (() => void) => {
  let components: Component[] = [];
  applySettings(state);
  // Page ouverte depuis le jeu : « retour » revient en arrière dans l'historique du navigateur.
  let openedFromGame = false;
  const open = (hash: string) => (): void => {
    openedFromGame = true;
    window.location.hash = hash;
  };
  const back = (): void => {
    if (openedFromGame) window.history.back();
    else window.location.hash = '';
  };

  const game = (): Component[] => [
    createHeader({
      onOptions: open(OPTIONS_HASH),
      onStrangeBook: open(STRANGE_BOOK_HASH),
      strangeBookFound: () => strangeBookFound(state),
      hasNewSeals: () => state.newSeals.length > 0,
    }),
    createCounter(state),
    createToolsPanel(state),
    createReading(state),
    createFooter(state.settings),
  ];

  const options = (): Component[] => [
    createOptionsPage(state, {
      onLocale: (locale) => {
        state.locale = locale;
        setLocale(locale);
        saveGame(state);
        render();
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
      },
      onBack: back,
    }),
  ];

  const screen = (): Component[] => {
    if (window.location.hash === OPTIONS_HASH) return options();
    if (window.location.hash === STRANGE_BOOK_HASH && strangeBookFound(state)) return [createStrangeBookPage(state, back)];
    return game();
  };

  const render = (): void => {
    document.documentElement.lang = state.locale;
    components = screen();
    root.replaceChildren(...components.map((c) => c.root));
  };

  window.addEventListener('hashchange', render);
  render();
  return () => components.forEach((c) => c.update());
};
