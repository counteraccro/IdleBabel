import './reminiscence.css';
import { el, type Component } from '../dom';
import { t, getLocale } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { rememberStatus, reminiscenceKnown, reminiscing } from '../../systems/reminiscence';
import { intuitionName } from '../whiteBook/intuitionPage';
import type { GameState } from '../../core/state';

/** Une flèche qui revient sur elle-même (repère 20 × 20). */
const ICON =
  '<path d="M15.6 7.2A6 6 0 1 0 16 10" fill="none" stroke="#e8c776" stroke-width="1.5" stroke-linecap="round"/><path d="M16.3 3.6l-.4 3.9-3.9-.4" fill="none" stroke="#e8c776" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
/** Le temps de l'éclat, quand une intuition revient (voir .reminiscence-medal.flash). */
const FLASH_MS = 1200;

/**
 * Le médaillon de la Réminiscence (l'auteur, 20/10 : « peut-être indiqué comme les bonus et malus ») : tant qu'il reste
 * des niveaux à retrouver. Son anneau, la Connaissance réunie pour la prochaine intuition ; un éclat quand elle revient ;
 * au survol, ce qui reste et la prochaine ; un clic la met en pause (gris) ou la relance, comme la note au crayon.
 */
export const createReminiscenceMedal = (state: GameState): Component => {
  const root = el('div', 'reminiscence-medals');
  const medal = el('div', 'boon-medal reminiscence-medal');
  medal.innerHTML = `<div class="boon-medal-ring"></div><div class="boon-medal-icon"><svg viewBox="0 0 20 20" aria-hidden="true">${ICON}</svg></div>`;
  const tip = el('div', 'boon-medal-tip');
  // Trois lignes courtes : le médaillon est près du bord gauche, une seule longue ligne sortirait de l'écran.
  const line = el('span', 'line');
  const nextLine = el('span', 'line');
  const hint = el('span', 'line hint');
  tip.append(line, nextLine, hint);
  medal.append(tip);
  root.append(medal);
  root.hidden = true;
  medal.addEventListener('click', () => {
    state.reminiscence.on = !state.reminiscence.on;
    update();
  });
  let lastLevels: number | undefined;
  let flashTimer = 0;

  const update = (): void => {
    const { levels, next } = reminiscenceKnown(state) ? rememberStatus(state) : { levels: 0, next: undefined };
    const on = reminiscing(state);
    // Une intuition revenue : il brille un instant.
    if (lastLevels !== undefined && levels < lastLevels && levels > 0) {
      medal.classList.remove('flash');
      void medal.offsetWidth;
      medal.classList.add('flash');
      window.clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => medal.classList.remove('flash'), FLASH_MS);
    }
    lastLevels = levels;
    if (levels === 0) {
      if (!root.hidden) {
        medal.classList.remove('on');
        root.hidden = true;
      }
      return;
    }
    if (root.hidden) {
      root.hidden = false;
      requestAnimationFrame(() => medal.classList.add('on'));
    }
    medal.classList.toggle('paused', !on);
    const count = writeDigits(String(levels));
    const text = !on
      ? t('ui.reminiscence.paused').replace('{n}', count)
      : levels === 1
        ? t('ui.reminiscence.leftOne')
        : t('ui.reminiscence.left').replace('{n}', count);
    if (line.textContent !== text) line.textContent = text;
    const nextText =
      on && next
        ? t('ui.reminiscence.next').replace('{name}', intuitionName(next.id)).replace('{price}', formatNumber(next.price, getLocale()))
        : '';
    if (nextLine.textContent !== nextText) nextLine.textContent = nextText;
    nextLine.hidden = nextText === '';
    const hintText = t(on ? 'ui.reminiscence.pause' : 'ui.reminiscence.resume');
    if (hint.textContent !== hintText) hint.textContent = hintText;
    medal.style.setProperty('--left', String(next ? Math.min(1, state.knowledge / next.price) : 0));
  };
  update();
  return { root, update };
};
