import { el } from './dom';
import { t } from '../i18n';
import type { Component } from './dom';

export const createHeader = (onOptions: () => void): Component => {
  const root = el('header');
  const options = el('button', 'options-open', t('ui.options'));
  options.addEventListener('click', onOptions);
  root.append(el('h1', undefined, 'Idle Babel'), options);
  return { root, update: () => {} };
};
