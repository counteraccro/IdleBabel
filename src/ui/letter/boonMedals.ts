import './letter.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { activeBoons } from '../../systems/boons';
import { tranceFactor } from '../../systems/etherium';
import { BOON, type BoonId } from '../../data/letter';
import { clockText } from './duration';
import { lotteryEffects } from '../../systems/lotteryEffects';
import { goldenHere } from '../../systems/goldenMimic';
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
const textIcon = (text: string): string =>
  `<text x="10" y="13.5" text-anchor="middle" font-size="${text.length > 3 ? 7 : 9.5}" font-family="Georgia,serif" fill="#e8c776">${text}</text>`;

/** Un médaillon : un bonus de la lettre, ou un bonus ou un malus de la Loterie (la Mimic dorée comprise). */
interface Medal {
  key: string;
  icon: string;
  text: string;
  left: number;
  total: number;
  /** Un malus : cerclé de rouge. */
  curse?: boolean;
}

/** Ses dix dernières secondes, il clignote (s'il durait plus que ça). */
const ENDING_MS = 10_000;
/** Le temps de s'effacer (voir .boon-medal). */
const FADE_MS = 600;

/** Ce que dit le médaillon au survol : « Transe · lecture ×2 ». */
export const boonShort = (state: GameState, id: BoonId): string =>
  t(`ui.letter.boons.${id}.short`).replace('{x}', String(tranceFactor(state, BOON.trance)));

/**
 * Les médaillons des bonus en cours, à droite du compteur (maquette validée le 08/10) : un par bonus, cerclé du temps
 * qui reste ; au survol, ce qu'il fait et ce temps. Ceux de la Loterie aussi (16/10), les malus cerclés de rouge.
 */
export const createBoonMedals = (state: GameState): Component => {
  const root = el('div', 'boon-medals');
  const shown = new Map<string, { medal: HTMLElement; tip: HTMLElement; clock: HTMLElement }>();

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
        text: t('ui.lottery.medal').replace('{e}', effectText(effect.id, effect.method)),
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
    return list;
  };

  const update = (): void => {
    const boons = medals();
    for (const [id, view] of shown)
      if (!boons.some((boon) => boon.key === id)) {
        view.medal.classList.remove('on');
        window.setTimeout(() => view.medal.remove(), FADE_MS);
        shown.delete(id);
      }
    for (const boon of boons) {
      let view = shown.get(boon.key);
      if (!view) {
        const medal = el('div', boon.curse ? 'boon-medal curse' : 'boon-medal');
        medal.innerHTML = `<div class="boon-medal-ring"></div><div class="boon-medal-icon"><svg viewBox="0 0 20 20" aria-hidden="true">${boon.icon}</svg></div>`;
        const tip = el('div', 'boon-medal-tip');
        const clock = el('span', 'clock');
        medal.append(tip);
        root.append(medal);
        requestAnimationFrame(() => medal.classList.add('on'));
        view = { medal, tip, clock };
        shown.set(boon.key, view);
      }
      // Le texte refait à chaque tick (la langue, la Transe de la Plume peuvent changer) ; l'horloge à part.
      const text = `${boon.text} · `;
      if (view.tip.firstChild?.textContent !== text) {
        view.tip.textContent = text;
        view.tip.append(view.clock);
      }
      view.clock.textContent = clockText(boon.left);
      view.medal.style.setProperty('--left', String(boon.left / boon.total));
      view.medal.classList.toggle('ending', boon.left < ENDING_MS && boon.total > ENDING_MS);
    }
  };
  update();
  return { root, update };
};
