import './letter.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { activeBoons } from '../../systems/boons';
import { tranceFactor } from '../../systems/etherium';
import { BOON, type BoonId } from '../../data/letter';
import { createMedalGroup, type Medal } from './medalGroup';
import { lotteryEffects } from '../../systems/lotteryEffects';
import { goldenHere } from '../../systems/goldenMimic';
import { mimicHere, mimicReading } from '../../systems/mimic';
import { effectText } from '../library/lotteryText';
import { GOLDEN_SECONDS, type LotteryEffectId } from '../../data/lottery';
import type { GameState } from '../../core/state';

/** Les icônes des bonus qui durent (repère 20 × 20), comme dans la maquette. */
const ICONS: Partial<Record<BoonId, string>> = {
  trance: '<path d="M3 4h7v12H3zM10 4h7v12h-7" fill="none" stroke="#e8c776" stroke-width="1.4"/>',
  eye: '<path d="M2 10q8-8 16 0q-8 8-16 0z" fill="none" stroke="#e8c776" stroke-width="1.4"/><circle cx="10" cy="10" r="2.6" fill="#e8c776"/>',
  hand: '<path d="M7 17V6a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-4a1.5 1.5 0 0 1 3 0v6c0 3-2 4-5 4H9l-4-4" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linecap="round"/>',
  mind: '<path d="M10 3l1.8 4.6L16.5 8l-3.6 3 1.1 4.8L10 13.3 6 15.8 7.1 11 3.5 8l4.7-.4z" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linejoin="round"/>',
  deal: '<path d="M4 4h6l7 7-6 6-7-7z" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="1.3" fill="#e8c776"/>',
  fourTen: '<text x="10" y="13" text-anchor="middle" font-size="8.5" font-family="Georgia,serif" fill="#e8c776">410</text>',
};

/** Les icônes des bonus et malus de la Loterie : ce qu'ils font, en chiffres. */
const LOTTERY_ICONS: Record<LotteryEffectId | 'golden', string> = {
  all15: '×1½',
  all2: '×2',
  all3: '×3',
  method10: '×10',
  half: '÷2',
  stopped: '‖',
  golden: 'M',
};
/** La Mimic : une gueule dentée. */
const MIMIC_ICON =
  '<path d="M3 5h14M3 15h14M3 5l2.3 4.5 2.4-4.5 2.3 4.5 2.3-4.5 2.4 4.5 2.3-4.5M3 15l2.3-4.5 2.4 4.5 2.3-4.5 2.3 4.5 2.4-4.5 2.3 4.5" fill="none" stroke="#e8c776" stroke-width="1.5" stroke-linejoin="round"/>';
const textIcon = (text: string): string =>
  `<text x="10" y="13.5" text-anchor="middle" font-size="${text.length > 3 ? 7 : 9.5}" font-family="Georgia,serif" fill="#e8c776">${text}</text>`;

/** Ce que dit le médaillon au survol : « Transe · lecture ×2 ». */
export const boonShort = (state: GameState, id: BoonId): string =>
  t(`ui.letter.boons.${id}.short`).replace('{x}', String(tranceFactor(state, BOON.trance)));

/**
 * Les médaillons des effets en cours (maquette validée le 08/10), cerclés du temps qui reste ; au survol, ce qu'ils font et
 * ce temps. Ceux de la Loterie aussi (16/10), les malus cerclés de rouge ; la Mimic tant qu'elle est là (19/10). Les bonus
 * réunis en un médaillon, les malus en un autre (medalGroup.ts, l'auteur, 21/10) : la rangée ne s'allonge plus.
 */
export const createBoonMedals = (state: GameState): Component => {
  const root = el('div', 'boon-medals');
  const boons = createMedalGroup(false);
  const curses = createMedalGroup(true);
  root.append(boons.root, curses.root);

  const medals = (): Medal[] => {
    const now = Date.now();
    const list: Medal[] = activeBoons(now).map((boon) => ({
      key: boon.id,
      icon: ICONS[boon.id] ?? '',
      text: boonShort(state, boon.id),
      left: boon.left,
      total: boon.total,
    }));
    for (const effect of lotteryEffects(state, now))
      list.push({
        key: `lottery:${effect.id}:${effect.method ?? ''}`,
        icon: textIcon(LOTTERY_ICONS[effect.id]),
        text: t('ui.lottery.medal').replace('{e}', effectText(state, effect.id, effect.method)),
        left: effect.end - now,
        total: effect.total,
        curse: effect.id === 'half' || effect.id === 'stopped',
      });
    if (goldenHere(state, now)) {
      const left = state.lottery.golden!.until - now;
      list.push({
        key: 'lottery:golden',
        icon: textIcon(LOTTERY_ICONS.golden),
        text: t('ui.lottery.golden.name'),
        left,
        total: Math.max(left, state.lottery.golden!.total ?? GOLDEN_SECONDS * 1000),
        curse: true,
      });
    }
    // La Mimic ordinaire, tant qu'elle est là (l'auteur, 19/10) : ce qu'elle enlève aux méthodes, la Connaissance dévorée.
    if (mimicHere(state))
      list.push({
        key: 'mimic',
        icon: MIMIC_ICON,
        text: t('ui.mimic.medal').replace('{p}', String(Math.round((1 - mimicReading(state)) * 100))),
        left: 1,
        total: 1,
        curse: true,
        endless: true,
      });
    return list;
  };

  const update = (): void => {
    const list = medals();
    boons.update(list.filter((medal) => !medal.curse));
    curses.update(list.filter((medal) => medal.curse));
  };
  update();
  return { root, update };
};
