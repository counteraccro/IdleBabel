import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { formatNumber } from '../core/format';
import { buyTool, nextToolCost } from '../systems/tools';
import { toolUnlocked } from '../systems/sentences';
import type { ToolId } from '../data/tools';
import type { GameState } from '../core/state';

export const createToolCard = (state: GameState, id: ToolId): Component => {
  const root = el('article', 'tool');
  const title = el('div', 'tool-title');
  const owned = el('span', 'tool-owned');
  title.append(el('strong', undefined, t(`tools.${id}.name`)), owned);
  const button = el('button', 'tool-buy');
  button.addEventListener('click', () => buyTool(state, id));
  root.append(title, el('p', undefined, t(`tools.${id}.description`)), button);

  // Méthode pas encore découverte (sa phrase du livre blanc est incomplète) : cachée. Découverte
  // pendant la partie : elle apparaît doucement.
  root.hidden = !toolUnlocked(state, id);
  const update = (): void => {
    const unlocked = toolUnlocked(state, id);
    if (unlocked && root.hidden) root.classList.add('discovered');
    root.hidden = !unlocked;
    const cost = nextToolCost(state, id);
    owned.textContent = String(state.tools[id]);
    owned.title = t('ui.owned');
    button.textContent = `${t('ui.buy')} — ${formatNumber(Math.ceil(cost), getLocale())} 📄`;
    button.disabled = state.pages < cost;
  };
  update();
  return { root, update };
};
