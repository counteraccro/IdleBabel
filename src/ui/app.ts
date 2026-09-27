import { createHeader } from './header';
import { createCounter } from './counter';
import { createToolsPanel } from './toolsPanel';
import { createReading } from './reading';
import { createFooter } from './footer';
import { createOptionsPage } from './options/optionsPage';
import { setLocale } from '../i18n';
import { deleteSave, saveGame } from '../core/save';
import { createInitialState, type GameState } from '../core/state';
import type { Component } from './dom';

const OPTIONS_HASH = '#options';

/**
 * Construit l'écran : le jeu, ou la page des options (adresse #options, le bouton « retour »
 * du navigateur ramène au jeu). Renvoie la fonction de mise à jour appelée à chaque tick.
 */
export const mountApp = (root: HTMLElement, state: GameState): (() => void) => {
  let components: Component[] = [];
  // Options ouvertes depuis le jeu : « retour » revient en arrière dans l'historique du navigateur.
  let openedFromGame = false;

  const game = (): Component[] => [
    createHeader(() => {
      openedFromGame = true;
      window.location.hash = OPTIONS_HASH;
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
      onSettings: () => saveGame(state),
      onReset: () => {
        deleteSave();
        Object.assign(state, createInitialState(state.locale), { settings: state.settings });
        saveGame(state);
      },
      onBack: () => {
        if (openedFromGame) window.history.back();
        else window.location.hash = '';
      },
    }),
  ];

  const render = (): void => {
    document.documentElement.lang = state.locale;
    components = window.location.hash === OPTIONS_HASH ? options() : game();
    root.replaceChildren(...components.map((c) => c.root));
  };

  window.addEventListener('hashchange', render);
  render();
  return () => components.forEach((c) => c.update());
};
