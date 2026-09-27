import { el } from './dom';
import { t } from '../i18n';
import type { Component } from './dom';

export interface HeaderHandlers {
  onOptions: () => void;
  onStrangeBook: () => void;
  /** Le livre étrange a-t-il été trouvé ? Son bouton n'apparaît qu'ensuite. */
  strangeBookFound: () => boolean;
}

export const createHeader = (handlers: HeaderHandlers): Component => {
  const root = el('header');
  const options = el('button', 'options-open', t('ui.options'));
  options.addEventListener('click', handlers.onOptions);
  const strangeBook = el('button', 'options-open', t('ui.strangeBook'));
  strangeBook.addEventListener('click', handlers.onStrangeBook);
  const update = (): void => {
    strangeBook.hidden = !handlers.strangeBookFound();
  };
  update();
  root.append(el('h1', undefined, 'Idle Babel'), options, strangeBook);
  return { root, update };
};
