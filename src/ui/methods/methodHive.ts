import './methodHive.css';
import { el, type Component } from '../dom';
import { getLocale, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { TOOLS, type ToolId } from '../../data/tools';
import { buyTool, nextToolCost } from '../../systems/tools';
import { toolUnlocked } from '../../systems/sentences';
import { createMethodSeal } from './methodSeal';
import type { GameState } from '../../core/state';

/** Taille d'un sceau (largeur ; hexagone pointe en haut), et l'écart entre deux. */
const SEAL_WIDTH = 50;
const SEAL_HEIGHT = SEAL_WIDTH * 1.1547;
const GAP = 3;
/**
 * Sceaux par rangée (une rangée sur deux est décalée d'un demi-sceau : le nid d'abeille) : 3, et plus
 * seulement si la ruche ne tient plus en hauteur à sa place.
 */
const MIN_PER_ROW = 3;
const MAX_PER_ROW = 6;

/** Hauteur de la ruche en `rows` rangées. */
const hiveHeight = (rows: number): number => (rows > 0 ? (rows - 1) * (SEAL_HEIGHT * 0.75 + GAP) + SEAL_HEIGHT : 0);

/**
 * Les méthodes de lecture, sur les étagères de gauche : leurs sceaux (ceux du livre blanc) en nid
 * d'abeille, qui grandit à chaque méthode découverte. Doré et luisant : on peut en acheter une de plus ;
 * éteint : pas assez de pages. Le nombre possédé est dans le sceau ; au survol (ou au clavier), le nom,
 * la description et le prix. Un clic achète. Le détail de chaque méthode est dans le livre blanc.
 */
export const createMethodHive = (state: GameState): Component => {
  const root = el('section', 'tools method-hive');
  root.setAttribute('aria-label', t('ui.methods'));
  const tip = el('div', 'method-tip');
  const tipName = el('strong');
  const tipTitle = document.createTextNode('');
  const tipCount = el('span', 'number');
  tipName.append(tipTitle, tipCount);
  const tipText = el('em');
  const tipPrice = el('span', 'method-tip-price');
  tip.append(tipName, tipText, tipPrice);
  tip.setAttribute('aria-hidden', 'true');
  let pointed: ToolId | null = null;

  const seals = TOOLS.map((tool) => {
    const seal = createMethodSeal(tool.id);
    seal.root.addEventListener('click', () => {
      buyTool(state, tool.id);
      update();
    });
    const point = (on: boolean): void => {
      pointed = on ? tool.id : pointed === tool.id ? null : pointed;
      update();
    };
    seal.root.addEventListener('mouseenter', () => point(true));
    seal.root.addEventListener('mouseleave', () => point(false));
    seal.root.addEventListener('focus', () => point(true));
    seal.root.addEventListener('blur', () => point(false));
    root.append(seal.root);
    return { id: tool.id, seal, shown: toolUnlocked(state, tool.id) };
  });
  root.append(tip);

  /**
   * Place laissée à la ruche en hauteur : la rangée du milieu de la grille de l'écran (entre l'en-tête et
   * le pied de page) ; sur téléphone (une seule colonne), pas de limite.
   */
  const room = (): number => {
    const app = root.parentElement;
    if (!app) return Infinity;
    const rows = getComputedStyle(app).gridTemplateRows.split(' ').map(Number.parseFloat);
    return rows.length === 3 ? rows[1] : Infinity;
  };
  /** Sceaux par rangée, pour `count` sceaux : 3, ou plus si 3 débordent. */
  const perRow = (count: number): number => {
    const height = room();
    let columns = MIN_PER_ROW;
    while (columns < MAX_PER_ROW && hiveHeight(Math.ceil(count / columns)) > height) columns += 1;
    return columns;
  };
  let columns = MIN_PER_ROW;
  /** Pour quel nombre de sceaux, et quelle fenêtre, les rangées ont été calculées. */
  let laidOut = '';

  const update = (): void => {
    const locale = getLocale();
    // Rangées recalculées quand une méthode apparaît, ou quand la fenêtre change de taille.
    const total = seals.filter((entry) => toolUnlocked(state, entry.id)).length;
    const layout = `${total}:${window.innerWidth}x${window.innerHeight}`;
    if (layout !== laidOut && root.isConnected) {
      columns = perRow(total);
      laidOut = layout;
    }
    let place = 0;
    for (const entry of seals) {
      const { id, seal } = entry;
      const unlocked = toolUnlocked(state, id);
      // Découverte pendant la partie : le sceau apparaît doucement à sa place dans la ruche.
      if (unlocked && !entry.shown) seal.root.classList.add('discovered');
      entry.shown = unlocked;
      seal.root.hidden = !unlocked;
      if (!unlocked) continue;
      const row = Math.floor(place / columns);
      const column = place % columns;
      seal.root.style.left = `${column * (SEAL_WIDTH + GAP) + ((row % 2) * (SEAL_WIDTH + GAP)) / 2}px`;
      seal.root.style.top = `${row * (SEAL_HEIGHT * 0.75 + GAP)}px`;
      place += 1;
      const cost = Math.ceil(nextToolCost(state, id));
      const count = formatNumber(state.tools[id], locale);
      const price = t('ui.nextCost').replace('{n}', formatNumber(cost, locale));
      const name = t(`tools.${id}.name`);
      seal.show(count, state.pages >= cost);
      seal.root.setAttribute('aria-label', `${name}, ${count}. ${t(`tools.${id}.description`)} ${price}`);
      if (pointed === id) {
        tipTitle.textContent = `${name} · `;
        tipCount.textContent = count;
        tipText.textContent = t(`tools.${id}.description`);
        tipPrice.textContent = price;
        tipPrice.classList.toggle('short', state.pages < cost);
        tip.style.top = seal.root.style.top;
      }
    }
    const rows = Math.ceil(place / columns);
    root.hidden = place === 0;
    root.style.width = `${Math.min(place, columns) * (SEAL_WIDTH + GAP) + (rows > 1 ? (SEAL_WIDTH + GAP) / 2 : 0)}px`;
    root.style.height = `${hiveHeight(rows)}px`;
    tip.classList.toggle('shown', pointed !== null);
  };
  update();
  return { root, update };
};
