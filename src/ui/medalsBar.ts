import { el, type Component } from './dom';
import { createBoonMedals } from './letter/boonMedals';
import { createRelicMedal } from './relics/relicMedal';
import { createReminiscenceMedal } from './reminiscence/reminiscenceMedal';
import type { GameState } from '../core/state';

/**
 * Les médaillons, à côté du titre du jeu (l'auteur, 19/10 : autour du compteur, ils suivaient sa largeur et bougeaient
 * sans cesse) : d'abord la relique qui agit (`onRelic` : il ouvre la vitrine), la Réminiscence tant qu'elle a à rendre
 * (20/10), puis les bonus de la lettre et de la Loterie.
 */
export const createMedalsBar = (state: GameState, onRelic: () => void): Component => {
  const root = el('div', 'medals-bar');
  const relic = createRelicMedal(state, onRelic);
  const reminiscence = createReminiscenceMedal(state);
  const boons = createBoonMedals(state);
  root.append(relic.root, reminiscence.root, boons.root);
  const update = (): void => {
    relic.update();
    reminiscence.update();
    boons.update();
  };
  update();
  return { root, update };
};
