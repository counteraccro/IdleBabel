import { el, type Component } from './dom';
import { t } from '../i18n';
import { createToolCard } from './toolCard';
import { TOOLS } from '../data/tools';
import type { GameState } from '../core/state';

/** Panneau des méthodes de lecture, posé sur les étagères de gauche. */
export const createToolsPanel = (state: GameState): Component => {
  const root = el('section', 'panel tools');
  const cards = TOOLS.map((tool) => createToolCard(state, tool.id));
  root.append(el('h2', undefined, t('ui.methods')), ...cards.map((card) => card.root));
  return { root, update: () => cards.forEach((card) => card.update()) };
};
