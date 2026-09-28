import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { formatNumber } from '../core/format';
import { pagesPerSecond } from '../systems/production';
import type { GameState } from '../core/state';

export const createCounter = (state: GameState): Component => {
  const root = el('section', 'counter');
  const value = el('div', 'value');
  const rate = el('div', 'label');
  // Connaissance : la ligne n'apparaît qu'avec la première trouvaille.
  const knowledge = el('div', 'label knowledge');
  root.append(value, rate, knowledge);

  const update = (): void => {
    value.textContent = formatNumber(Math.floor(state.pages), getLocale());
    rate.textContent = `${t('ui.pages')} · ${formatNumber(pagesPerSecond(state), getLocale())}${t('ui.perSecond')}`;
    knowledge.hidden = state.lifetimeKnowledge === 0;
    knowledge.textContent = `${t('ui.knowledge')} ${formatNumber(state.knowledge, getLocale())}`;
  };
  update();
  return { root, update };
};
