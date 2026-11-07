import { getLocale, t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { el } from '../dom';
import { TREE, TREE_ROOT, type TreeEffects } from '../../data/goldBook';
import { buyCase, canBuyCase, caseGot, caseShown } from '../../systems/goldBook';
import type { GameState } from '../../core/state';

/**
 * L'arbre du Livre d'or, à l'identique de la maquette (.ai/maquette-livre-dor.html) : il pousse du centre, chaque branche dans
 * sa part du cercle, un peu de travers. Une case paraît quand sa mère est achetée ; avant, rien ne la laisse deviner.
 */

interface Spot {
  x: number;
  y: number;
  /** Le point de courbe de la branche qui y mène. */
  cx: number;
  cy: number;
  /** La lettre qu'elle porte. */
  char: string;
}

const PARENT: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TREE).flatMap(([id, node]) => (node.kids ?? []).map((kid) => [kid, id])),
);

/** La forme, tirée d'un hasard fixe (graine 7, comme la maquette) : toujours le même dessin, dans un cadre de 760 × 400. */
const layout = (): Record<string, Spot> => {
  let seed = 7;
  const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const weight = (id: string): number =>
    Math.max(
      1,
      (TREE[id].kids ?? []).reduce((sum, kid) => sum + weight(kid), 0),
    );
  const spots: Record<string, Spot> = {};
  const grow = (id: string, depth: number, a0: number, a1: number): void => {
    const mid = (a0 + a1) / 2 + (rnd() - 0.5) * (a1 - a0) * 0.35;
    const r = depth * (1 + (rnd() - 0.5) * 0.22);
    const x = 380 + Math.cos(mid) * r * 92;
    const y = 200 + Math.sin(mid) * r * 46;
    spots[id] = { x, y, cx: x, cy: y, char: 'abcdefghijklmnopqrstuvwxyz'[Math.floor(rnd() * 26)] };
    const kids = TREE[id].kids ?? [];
    const total = kids.reduce((sum, kid) => sum + weight(kid), 0);
    let a = a0;
    for (const kid of kids) {
      const span = ((a1 - a0) * weight(kid)) / total;
      grow(kid, depth + 1, a, a + span);
      a += span;
    }
  };
  grow(TREE_ROOT, 0, -Math.PI * 0.95, Math.PI * 1.05);
  // La courbe de chaque branche, penchée au hasard.
  for (const id of Object.keys(TREE)) {
    if (id === TREE_ROOT) continue;
    const spot = spots[id];
    const parent = spots[PARENT[id]];
    const bend = (rnd() - 0.5) * 0.5;
    spot.cx = (spot.x + parent.x) / 2 - (spot.y - parent.y) * bend;
    spot.cy = (spot.y + parent.y) / 2 + (spot.x - parent.x) * bend;
  }
  return spots;
};
const SPOTS = layout();

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.append(node);
  return node;
};

const count = (value: number): string => writeDigits(String(Math.floor(value)));

/** Le nom d'une case : le sien pour les bouts de branche, sinon celui de son effet (le Trait, le Fil, la Paillette). */
const caseName = (id: string): string => {
  const own = `goldBook.tree.names.${id}`;
  const name = t(own);
  return name === own ? t(`goldBook.tree.kinds.${Object.keys(TREE[id].fx)[0]}`) : name;
};

/** Ce que fait une case. */
const caseWhat = (id: string): string => {
  const [key, value] = Object.entries(TREE[id].fx)[0] as [keyof TreeEffects, number];
  const n =
    key === 'window'
      ? (value / 1000).toLocaleString(getLocale())
      : key === 'points' || key === 'pure'
        ? String(Math.round(value * 100))
        : String(value);
  return t(`goldBook.tree.what.${key}`).replace('{n}', n);
};

/** La fenêtre de l'arbre : la poussière d'or, l'arbre, ce que fait la case survolée. Redessinée à chaque ouverture. */
export const createGoldBookTree = (state: GameState): { root: HTMLElement; draw: () => void } => {
  const dust = el('span');
  const dustLine = el('div', 'gold-book-dustline', t('goldBook.tree.dust'));
  dustLine.append(dust);
  const tree = svg('svg', { class: 'gold-book-tree', viewBox: '0 0 760 400' });
  const info = el('div', 'gold-book-treeinfo', t('goldBook.tree.hover'));
  const root = el('div', 'gold-book-treebox');
  root.append(el('h2', '', t('goldBook.tree.title')), dustLine, tree, info);

  const tell = (id: string): void => {
    const got = caseGot(state, id);
    const cost = TREE[id].cost;
    const price = t('goldBook.tree.cost').replace('{n}', count(cost));
    const short = state.goldBook.dust < cost ? ` ${t('goldBook.tree.short')}` : '';
    info.innerHTML = `<b>${caseName(id)}</b> · ${caseWhat(id)} · ${got ? t('goldBook.tree.got') : price + short}`;
  };

  /** Les pousses de la case qu'on vient d'acheter : leurs branches s'allongent, puis elles paraissent. */
  let fresh = new Set<string>();
  const draw = (): void => {
    dust.textContent = count(state.goldBook.dust);
    tree.replaceChildren();
    const filter = svg(
      'filter',
      { id: 'gold-book-glow', filterUnits: 'userSpaceOnUse', x: -50, y: -50, width: 860, height: 570 },
      svg('defs', {}, tree),
    );
    svg('feGaussianBlur', { stdDeviation: 2.5, result: 'b' }, filter);
    const merge = svg('feMerge', {}, filter);
    svg('feMergeNode', { in: 'b' }, merge);
    svg('feMergeNode', { in: 'SourceGraphic' }, merge);
    for (const id of Object.keys(TREE)) {
      if (id === TREE_ROOT || !caseShown(state, id)) continue;
      const spot = SPOTS[id];
      const parent = SPOTS[PARENT[id]];
      svg(
        'path',
        {
          d: `M${parent.x},${parent.y} Q${spot.cx},${spot.cy} ${spot.x},${spot.y}`,
          class: `branch${caseGot(state, id) ? ' got' : ''}${fresh.has(id) ? ' grow' : ''}`,
        },
        tree,
      );
    }
    for (const id of Object.keys(TREE)) {
      if (!caseShown(state, id)) continue;
      const spot = SPOTS[id];
      const got = caseGot(state, id);
      const node = svg(
        'g',
        {
          class: `node${got ? ' got' : ''}${canBuyCase(state, id) ? ' can' : ''}${fresh.has(id) ? ' new' : ''}`,
          style: `transform-origin:${spot.x}px ${spot.y}px`,
        },
        tree,
      );
      svg('circle', { cx: spot.x, cy: spot.y, r: id === TREE_ROOT ? 15 : 12 }, node);
      svg('text', { x: spot.x, y: spot.y + 5, class: 'char' }, node).textContent = spot.char;
      svg('circle', { cx: spot.x, cy: spot.y, r: 18, class: 'hit' }, node);
      node.addEventListener('mouseenter', () => tell(id));
      node.addEventListener('click', () => {
        if (buyCase(state, id)) {
          fresh = new Set(TREE[id].kids ?? []);
          draw();
        }
        tell(id);
      });
    }
    fresh = new Set();
  };

  return {
    root,
    draw: () => {
      info.textContent = t('goldBook.tree.hover');
      draw();
    },
  };
};
