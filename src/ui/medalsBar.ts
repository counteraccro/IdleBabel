import { el, type Component } from './dom';
import { createBoonMedals } from './letter/boonMedals';
import { createRelicMedal } from './relics/relicMedal';
import type { GameState } from '../core/state';

/**
 * Les médaillons, à côté du titre du jeu (l'auteur, 19/10 : autour du compteur, ils suivaient sa largeur et bougeaient
 * sans cesse) : d'abord la relique qui agit (`onRelic` : il ouvre la vitrine), puis les bonus de la lettre et de la Loterie.
 */
export const createMedalsBar = (state: GameState, onRelic: () => void): Component => {
  const root = el('div', 'medals-bar');
  const relic = createRelicMedal(state, onRelic);
  const boons = createBoonMedals(state);
  root.append(relic.root, boons.root);
  const update = (): void => {
    relic.update();
    boons.update();
  };
  update();
  return { root, update };
};
