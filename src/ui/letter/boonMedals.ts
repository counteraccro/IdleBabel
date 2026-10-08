import './letter.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { activeBoons } from '../../systems/boons';
import { tranceFactor } from '../../systems/etherium';
import { BOON, type BoonId } from '../../data/letter';
import { clockText } from './duration';
import type { GameState } from '../../core/state';

/** Les icônes des bonus qui durent (repère 20 × 20), comme dans la maquette. */
const ICONS: Partial<Record<BoonId, string>> = {
  trance: '<path d="M3 4h7v12H3zM10 4h7v12h-7" fill="none" stroke="#e8c776" stroke-width="1.4"/>',
  eye: '<path d="M2 10q8-8 16 0q-8 8-16 0z" fill="none" stroke="#e8c776" stroke-width="1.4"/><circle cx="10" cy="10" r="2.6" fill="#e8c776"/>',
  hand: '<path d="M7 17V6a1.5 1.5 0 0 1 3 0v5m0-6a1.5 1.5 0 0 1 3 0v6m0-4a1.5 1.5 0 0 1 3 0v6c0 3-2 4-5 4H9l-4-4" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linecap="round"/>',
  mind: '<path d="M10 3l1.8 4.6L16.5 8l-3.6 3 1.1 4.8L10 13.3 6 15.8 7.1 11 3.5 8l4.7-.4z" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linejoin="round"/>',
  deal: '<path d="M4 4h6l7 7-6 6-7-7z" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linejoin="round"/><circle cx="7.5" cy="7.5" r="1.3" fill="#e8c776"/>',
};

/** Ses dix dernières secondes, il clignote (s'il durait plus que ça). */
const ENDING_MS = 10_000;
/** Le temps de s'effacer (voir .boon-medal). */
const FADE_MS = 600;

/** Ce que dit le médaillon au survol : « Transe · lecture ×2 ». */
export const boonShort = (state: GameState, id: BoonId): string =>
  t(`ui.letter.boons.${id}.short`).replace('{x}', String(tranceFactor(state, BOON.trance)));

/**
 * Les médaillons des bonus en cours, à droite du compteur (maquette validée le 08/10) : un par bonus, cerclé du temps
 * qui reste ; au survol, ce qu'il fait et ce temps.
 */
export const createBoonMedals = (state: GameState): Component => {
  const root = el('div', 'boon-medals');
  const shown = new Map<BoonId, { medal: HTMLElement; tip: HTMLElement; clock: HTMLElement }>();

  const update = (): void => {
    const boons = activeBoons();
    for (const [id, view] of shown)
      if (!boons.some((boon) => boon.id === id)) {
        view.medal.classList.remove('on');
        window.setTimeout(() => view.medal.remove(), FADE_MS);
        shown.delete(id);
      }
    for (const boon of boons) {
      let view = shown.get(boon.id);
      if (!view) {
        const medal = el('div', 'boon-medal');
        medal.innerHTML = `<div class="boon-medal-ring"></div><div class="boon-medal-icon"><svg viewBox="0 0 20 20" aria-hidden="true">${ICONS[boon.id] ?? ''}</svg></div>`;
        const tip = el('div', 'boon-medal-tip');
        const clock = el('span', 'clock');
        medal.append(tip);
        root.append(medal);
        requestAnimationFrame(() => medal.classList.add('on'));
        view = { medal, tip, clock };
        shown.set(boon.id, view);
      }
      // Le texte refait à chaque tick (la langue, la Transe de la Plume peuvent changer) ; l'horloge à part.
      const text = `${boonShort(state, boon.id)} · `;
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
