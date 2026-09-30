import { createHeader } from './header';
import { createCounter } from './counter';
import { createToolsPanel } from './toolsPanel';
import { createFooter } from './footer';
import { createOptionsPage } from './options/optionsPage';
import { createBook3dPage } from './book3d/book3dPage';
import { whiteBook3d } from './book3d/whiteBook3d';
import { strangeBook3d } from './book3d/strangeBook3d';
import { createHandReading3d } from './book3d/handReading3d';
import { revealStats, strangeBookFound } from '../systems/strangeBook';
import { setLocale, t } from '../i18n';
import { deleteSave, saveGame } from '../core/save';
import { createInitialState, type GameState } from '../core/state';
import { showWelcome } from './welcome';
import { loreTold, tellLore } from '../systems/lore';
import { mountLore } from './lore';
import type { Component } from './dom';

const OPTIONS_HASH = '#options';
const STRANGE_BOOK_HASH = '#livre';
const WHITE_BOOK_HASH = '#blanc';

/** Réglages qui s'appliquent à toute la page par une classe sur <html>. */
const applySettings = (state: GameState): void => {
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
      onWhiteBook: open(WHITE_BOOK_HASH),
      onStrangeBook: open(STRANGE_BOOK_HASH),
      strangeBookFound: () => strangeBookFound(state),
      hasNewSeals: () => state.newSeals.length > 0,
    }),
    createCounter(state),
    createToolsPanel(state),
    createHandReading3d(state),
    createFooter(state.settings),
  ];

  const options = (): Component[] => [
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
    if (window.location.hash === WHITE_BOOK_HASH) {
      tellLore(state, 'whiteBook');
      // Tant qu'il n'en est jamais sorti, le joueur ne connaît pas encore le jeu : il lève les yeux du
      // livre, et le récit continue (firstBook).
      const first = !loreTold(state, 'firstBook');
      const leave = (): void => {
        tellLore(state, 'firstBook');
        back();
      };
      return [createBook3dPage(whiteBook3d(state), leave, first ? t('ui.lookAround') : undefined)];
    }
    if (window.location.hash === STRANGE_BOOK_HASH && strangeBookFound(state)) return [createBook3dPage(strangeBook3d(state), back)];
    return game();
  };

  const render = (): void => {
    document.documentElement.lang = state.locale;
    components = screen();
    root.replaceChildren(...components.map((c) => c.root));
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
