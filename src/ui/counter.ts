import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { formatNumber } from '../core/format';
import { pagesPerSecond } from '../systems/production';
import type { GameState } from '../core/state';

export const createCounter = (state: GameState): Component => {
  const root = el('section', 'counter');
  const value = el('div', 'value');
  const rate = el('div', 'label');
  root.append(value, rate);

  const update = (): void => {
    value.textContent = formatNumber(Math.floor(state.pages), getLocale());
    rate.textContent = `${t('ui.pages')} · ${formatNumber(pagesPerSecond(state), getLocale())}${t('ui.perSecond')}`;
  };
  update();
  return { root, update };
};
