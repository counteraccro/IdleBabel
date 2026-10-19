import { el } from '../dom';
import { getLocale, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { AUTOMATIC_AGE, DIGITAL_AGE } from '../../data/tools';
import { gearAges, gearChoice, gearKnown, gearWait } from '../../systems/gear';
import type { GameState } from '../../core/state';

const SVG = 'http://www.w3.org/2000/svg';

/** Une roue dentée de dix dents (repère 100 × 100), son moyeu et son axe. */
const gearIcon = (): SVGSVGElement => {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const teeth = 10;
  const points: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const w = (Math.PI * 2) / teeth;
    for (const [f, r] of [
      [0, 40],
      [0.15, 50],
      [0.45, 50],
      [0.6, 40],
    ]) {
      points.push(`${(50 + r * Math.cos(a + f * w)).toFixed(1)},${(50 + r * Math.sin(a + f * w)).toFixed(1)}`);
    }
  }
  const wheel = document.createElementNS(SVG, 'polygon');
  wheel.setAttribute('points', points.join(' '));
  wheel.setAttribute('class', 'gear-wheel');
  const hub = document.createElementNS(SVG, 'circle');
  hub.setAttribute('cx', '50');
  hub.setAttribute('cy', '50');
  hub.setAttribute('r', '22');
  hub.setAttribute('class', 'gear-hub');
  const axle = document.createElementNS(SVG, 'circle');
  axle.setAttribute('cx', '50');
  axle.setAttribute('cy', '50');
  axle.setAttribute('r', '7');
  axle.setAttribute('class', 'gear-axle');
  svg.append(wheel, hub, axle);
  return svg;
};

/** Une attente en bref : 4 s, 3 min, 2 h. */
const wait = (seconds: number): string =>
  seconds < 60 ? `${Math.ceil(seconds)} s` : seconds < 3600 ? `${Math.ceil(seconds / 60)} min` : `${Math.ceil(seconds / 3600)} h`;

/** Le nom de chaque Âge que le Rouage peut acheter. */
const ageName = (age: string): string =>
  age === '' ? t('ui.gearManual') : t(`etherium.stars.ages.${age === AUTOMATIC_AGE ? 'auto' : age === DIGITAL_AGE ? 'quantum' : age}.name`);

export interface MethodGear {
  root: HTMLElement;
  update: () => void;
}

/**
 * Sous la ruche, à côté du lot (maquette .ai/maquette-rouage.html, piste A, 19/10) : le Rouage, une fois acheté dans
 * l'Etherium. En marche, il est doré et tourne, « AUTO » à côté ; arrêté, il est mat et immobile, « AUTO » barré. Un clic
 * l'arrête ou le relance (gardé au prestige). Au survol : ce qu'il achètera ensuite, les Âges qu'il achète.
 */
export const createMethodGear = (state: GameState, changed: () => void): MethodGear => {
  const root = el('button', 'method-gear');
  root.type = 'button';
  const label = el('span', 'method-gear-label', t('ui.gearAuto'));
  const tip = el('span', 'method-gear-tip');
  const tipTitle = el('strong');
  const tipNext = el('span');
  const tipAges = el('em');
  const tipClick = el('span', 'method-gear-click');
  tip.append(tipTitle, tipNext, tipAges, tipClick);
  tip.setAttribute('aria-hidden', 'true');
  root.append(gearIcon(), label, tip);
  root.addEventListener('click', () => {
    state.gear.on = !state.gear.on;
    changed();
  });

  const update = (): void => {
    root.hidden = !gearKnown(state);
    if (root.hidden) return;
    const on = state.gear.on;
    const locale = getLocale();
    root.classList.toggle('on', on);
    root.setAttribute('aria-pressed', String(on));
    tipTitle.textContent = `${t('ui.gear')} ${t(on ? 'ui.gearOn' : 'ui.gearOff')}`;
    const choice = on ? gearChoice(state) : undefined;
    const seconds = choice && gearWait(state);
    tipNext.hidden = !on;
    tipNext.textContent = !choice
      ? t('ui.gearNothing')
      : t(seconds && seconds >= 1 ? 'ui.gearNext' : 'ui.gearNextNow')
          .replace('{name}', t(`tools.${choice.id}.name`))
          .replace('{k}', formatNumber(choice.count, locale))
          .replace('{s}', wait(seconds ?? 0));
    tipAges.textContent = t('ui.gearAges').replace('{ages}', gearAges(state).map(ageName).join(', '));
    tipClick.textContent = t(on ? 'ui.gearStop' : 'ui.gearStart');
    root.setAttribute('aria-label', `${tipTitle.textContent}. ${tipAges.textContent}. ${tipClick.textContent}`);
  };
  update();
  return { root, update };
};
