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
  // Les nombres dans leur propre élément, dorés (classe number).
  const [pages, speed, carried] = [el('span', 'number'), el('span', 'number'), el('span', 'number')];
  const pagesLabel = document.createTextNode('');
  const perSecond = document.createTextNode('');
  const knowledgeLabel = document.createTextNode('');
  value.append(pages);
  rate.append(pagesLabel, speed, perSecond);
  knowledge.append(knowledgeLabel, carried);
  const set = (node: Node, text: string): void => {
    if (node.textContent !== text) node.textContent = text;
  };

  const update = (): void => {
    set(pages, formatNumber(Math.floor(state.pages), getLocale()));
    set(pagesLabel, `${t('ui.pages')} · `);
    set(speed, formatNumber(pagesPerSecond(state), getLocale()));
    set(perSecond, t('ui.perSecond'));
    knowledge.hidden = state.lifetimeKnowledge === 0;
    set(knowledgeLabel, `${t('ui.knowledge')} `);
    set(carried, formatNumber(state.knowledge, getLocale()));
  };
  update();
  return { root, update };
};
