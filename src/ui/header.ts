import { el } from './dom';
import type { Component } from './dom';

export const createHeader = (languageSwitch: HTMLElement): Component => {
  const root = el('header');
  root.append(el('h1', undefined, 'Idle Babel'), languageSwitch);
  return { root, update: () => {} };
};
