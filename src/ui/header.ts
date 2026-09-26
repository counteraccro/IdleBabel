import { el } from './dom';
import { t } from '../i18n';
import type { Component } from './dom';

export const createHeader = (languageSwitch: HTMLElement): Component => {
  const root = el('header');
  root.append(el('h1', undefined, 'Idle Babel'), el('p', 'subtitle', t('ui.subtitle')), languageSwitch);
  return { root, update: () => {} };
};
