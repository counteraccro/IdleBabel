import { el } from '../dom';
import { clockText } from './duration';

/** Un effet en cours : un bonus de la lettre, ou un bonus ou un malus de la Loterie (la Mimic dorée comprise). */
export interface Medal {
  key: string;
  icon: string;
  text: string;
  left: number;
  total: number;
  /** Un malus : cerclé de rouge. */
  curse?: boolean;
  /** Sans fin (la Mimic ne part pas d'elle-même) : cercle plein, pas d'horloge. */
  endless?: boolean;
}

/** Ses dix dernières secondes, il clignote (s'il durait plus que ça). */
const ENDING_MS = 10_000;
/** Le temps de s'effacer (voir .boon-medal). */
const FADE_MS = 600;

/** L'effet qui finit le premier (un effet sans fin passe après tous les autres) : le médaillon du groupe le montre. */
export const soonest = (medals: Medal[]): Medal | undefined =>
  medals.reduce<Medal | undefined>((best, medal) => {
    if (!best) return medal;
    const left = medal.endless ? Infinity : medal.left;
    const bestLeft = best.endless ? Infinity : best.left;
    return left < bestLeft ? medal : best;
  }, undefined);

const svg = (icon: string): string => `<svg viewBox="0 0 20 20" aria-hidden="true">${icon}</svg>`;

export interface MedalGroup {
  root: HTMLElement;
  /** Les effets de ce groupe en ce moment (aucun : le médaillon s'efface). */
  update: (medals: Medal[]) => void;
}

/**
 * Les bonus en cours réunis en un médaillon, ou les malus (maquette .ai/maquette-menus.html, piste M1, l'auteur, 21/10 :
 * « essayons ») : seul, c'est le médaillon de toujours (au survol, ce qu'il fait et son temps). À plusieurs, il montre
 * celui qui finit le premier (son icône, son anneau), leur nombre dans une pastille ; au survol, la liste : chacun avec
 * son icône, ce qu'il fait et son temps.
 */
export const createMedalGroup = (curse: boolean): MedalGroup => {
  const root = el('div', curse ? 'boon-medal medal-group curse' : 'boon-medal medal-group');
  const ring = el('div', 'boon-medal-ring');
  const icon = el('div', 'boon-medal-icon');
  const tip = el('div', 'boon-medal-tip');
  const clock = el('span', 'clock');
  const count = el('span', 'medal-group-count');
  const panel = el('div', 'medal-group-panel');
  root.append(ring, icon, tip, count, panel);
  root.hidden = true;
  let shownIcon = '';
  let rowsKey = '';
  let rows: { clock: HTMLElement; text: HTMLElement; mini: HTMLElement }[] = [];
  let hideTimer = 0;

  const update = (medals: Medal[]): void => {
    const first = soonest(medals);
    if (!first) {
      if (!root.hidden && root.classList.contains('on')) {
        root.classList.remove('on');
        hideTimer = window.setTimeout(() => (root.hidden = true), FADE_MS);
      }
      return;
    }
    if (root.hidden || !root.classList.contains('on')) {
      window.clearTimeout(hideTimer);
      root.hidden = false;
      requestAnimationFrame(() => root.classList.add('on'));
    }
    if (shownIcon !== first.icon) icon.innerHTML = svg((shownIcon = first.icon));
    root.style.setProperty('--left', String(first.left / first.total));
    root.classList.toggle('ending', !first.endless && first.left < ENDING_MS && first.total > ENDING_MS);
    const many = medals.length > 1;
    root.classList.toggle('many', many);
    count.textContent = many ? String(medals.length) : '';
    // Seul : l'infobulle de toujours (le texte refait à chaque tick, la langue peut changer ; l'horloge à part).
    if (!many) {
      const text = first.endless ? first.text : `${first.text} · `;
      if (tip.firstChild?.textContent !== text) {
        tip.textContent = text;
        if (!first.endless) tip.append(clock);
      }
      if (!first.endless) clock.textContent = clockText(first.left);
      return;
    }
    // À plusieurs : la liste, refaite quand un effet arrive ou s'en va ; textes et horloges à chaque tick.
    const key = medals.map((medal) => medal.key).join('|');
    if (key !== rowsKey) {
      rowsKey = key;
      panel.replaceChildren();
      rows = medals.map((medal) => {
        const row = el('div', 'medal-group-row');
        const mini = el('div', medal.curse ? 'boon-medal on curse' : 'boon-medal on');
        mini.innerHTML = `<div class="boon-medal-ring"></div><div class="boon-medal-icon">${svg(medal.icon)}</div>`;
        const text = el('span', 'medal-group-text');
        const time = el('span', 'medal-group-clock');
        row.append(mini, text, time);
        panel.append(row);
        return { clock: time, text, mini };
      });
    }
    medals.forEach((medal, index) => {
      const row = rows[index];
      if (row.text.textContent !== medal.text) row.text.textContent = medal.text;
      const time = medal.endless ? '' : clockText(medal.left);
      if (row.clock.textContent !== time) row.clock.textContent = time;
      row.mini.style.setProperty('--left', String(medal.left / medal.total));
    });
  };
  return { root, update };
};
