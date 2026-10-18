import { el, type Component } from '../dom';
import { relicBonusText, relicName } from './relicText';
import { relicBonus } from '../../systems/relics';
import { dailyTokensLeft } from '../../systems/tokenRelic';
import { writeDigits } from '../../core/format';
import { t } from '../../i18n';
import { relicIcon } from './relicIcons';
import type { RelicId } from '../../data/relics';
import type { GameState } from '../../core/state';

/**
 * Le médaillon de la relique qui agit (maquette validée le 12/10, piste A) : à gauche du compteur, sans cercle de temps
 * (elle ne s'use pas), son dessin ; au survol, son nom et ce qu'elle donne ; un clic ouvre la vitrine pour en changer.
 */
export const createRelicMedal = (state: GameState, onOpen: () => void): Component => {
  const root = el('div', 'relic-medals');
  const medal = el('div', 'relic-medal');
  const icon = el('div', 'boon-medal-icon');
  const tip = el('div', 'boon-medal-tip');
  medal.append(el('div', 'boon-medal-ring'), icon, tip);
  root.append(medal);
  medal.addEventListener('click', onOpen);
  let shown: RelicId | null = null;
  let text = '';

  const update = (): void => {
    const active = state.relics.active;
    medal.classList.toggle('on', active !== null);
    root.hidden = active === null;
    if (!active) return;
    if (shown !== active) {
      shown = active;
      icon.innerHTML = relicIcon(active);
    }
    // Le Jeton : les jetons du jour qui restent (« 3 jetons du jour sur 5 »).
    const line =
      active === 'token'
        ? `${relicName(active)} · ${writeDigits(
            t('ui.relics.tokensLeft')
              .replace('{left}', String(dailyTokensLeft(state)))
              .replace('{n}', String(relicBonus(state, active))),
          )}`
        : `${relicName(active)} · ${relicBonusText(state, active)}`;
    if (line !== text) tip.textContent = text = line;
  };
  update();
  return { root, update };
};
