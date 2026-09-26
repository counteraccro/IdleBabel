import { createHeader } from './header';
import { createLanguageSwitch } from './languageSwitch';
import { createCounter } from './counter';
import { createToolCard } from './toolCard';
import { createFooter } from './footer';
import { TOOLS } from '../data/tools';
import { setLocale } from '../i18n';
import { deleteSave, saveGame } from '../core/save';
import { createInitialState, type GameState } from '../core/state';
import type { Component } from './dom';

/** Construit l'écran complet ; renvoie la fonction de mise à jour appelée à chaque tick. */
export const mountApp = (root: HTMLElement, state: GameState): (() => void) => {
  let components: Component[] = [];

  const render = (): void => {
    document.documentElement.lang = state.locale;
    const languageSwitch = createLanguageSwitch((locale) => {
      state.locale = locale;
      setLocale(locale);
      saveGame(state);
      render();
    });
    components = [
      createHeader(languageSwitch),
      createCounter(state),
      ...TOOLS.map((tool) => createToolCard(state, tool.id)),
      createFooter(() => {
        deleteSave();
        Object.assign(state, createInitialState(state.locale));
      }),
    ];
    root.replaceChildren(...components.map((c) => c.root));
  };

  render();
  return () => components.forEach((c) => c.update());
};
