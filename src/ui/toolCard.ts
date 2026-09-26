import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { formatNumber } from '../core/format';
import { buyTool, nextToolCost } from '../systems/tools';
import type { ToolId } from '../data/tools';
import type { GameState } from '../core/state';

export const createToolCard = (state: GameState, id: ToolId): Component => {
  const root = el('section', 'tool');
  const info = el('div');
  const owned = el('small');
  info.append(el('strong', undefined, t(`tools.${id}.name`)), el('p', undefined, t(`tools.${id}.description`)), owned);
  const button = el('button');
  button.addEventListener('click', () => buyTool(state, id));
  root.append(info, button);

  const update = (): void => {
    const cost = nextToolCost(state, id);
    owned.textContent = `${t('ui.owned')} : ${state.tools[id]}`;
    button.textContent = `${t('ui.buy')} — ${formatNumber(Math.ceil(cost), getLocale())} 📄`;
    button.disabled = state.pages < cost;
  };
  update();
  return { root, update };
};
