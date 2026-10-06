import { createLeafPage, type LeafPage } from '../strangeBook/pages';
import { folio, heading, type Item } from '../strangeBook/pageItems';
import { paragraph } from '../whiteBook/paragraph';
import { ETHERIUM_TREES, type EtheriumTreeId } from '../../data/etherium';
import { TOOLS } from '../../data/tools';
import { nextEtherPages, nextNodeCost, nodesOf, takeNode } from '../../systems/prestige';
import { formatCount, formatNumber, writeDigits } from '../../core/format';
import { getLocale, t } from '../../i18n';
import type { GameState } from '../../core/state';

/**
 * Les pages de l'Etherium (repère de la page : 640 × 800) : la garde, avec l'Éther à dépenser, le sommaire,
 * puis un arbre par page (conception §4.2). Chaque arbre est une tige dorée à mesure que ses nœuds sont pris,
 * du bas vers le haut ; le nœud suivant se prend d'un clic s'il y a assez d'Éther.
 */

const plain = (value: number): string => formatNumber(value, getLocale());

/** Un multiplicateur, au centième (×1,25) : les grands nombres, eux, ne se lisent qu'au dixième. */
const factor = (value: number): string => writeDigits(new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value));

/** Ce que donne le nœud `index` (à partir de 0) d'un arbre. */
const nodeEffect = (id: EtheriumTreeId, index: number): string => {
  const tree = ETHERIUM_TREES.find((candidate) => candidate.id === id)!;
  const effect = t(`etherium.trees.${id}.effect`);
  // La Mémoire garde une phrase de plus à chaque nœud : celle de la méthode suivante de l'Âge Manuel.
  if (id === 'memory') return effect.replace('{method}', t(`tools.${TOOLS[index]?.id}.name`));
  return effect.replace('{v}', factor(tree.values[index]));
};

const titleItems = (state: GameState): Item[] => [
  {
    kind: 'text',
    text: t('etherium.name').toLocaleUpperCase(),
    x: 320,
    y: 230,
    size: 32,
    align: 'center',
    spacing: 6,
    face: 'title',
    initial: true,
  },
  { kind: 'rule', y: 294, width: 260 },
  { kind: 'text', text: plain(state.ether), x: 320, y: 380, size: 64, align: 'center', face: 'title', gold: true },
  { kind: 'text', text: t('etherium.ether'), x: 320, y: 470, size: 20, align: 'center', italic: true, faded: true, spacing: 3 },
  {
    kind: 'text',
    // Ce qu'il reste à lire : « dans 125 milliards de pages » (le « de » des toutes lettres : formatCount).
    text: t('etherium.next').replace('{n}', formatCount(Math.max(0, nextEtherPages(state) - state.totalPagesRead), getLocale())),
    x: 320,
    y: 620,
    size: 18,
    align: 'center',
    italic: true,
    faded: true,
  },
];

const ENTRY_TOP = 200;
const ENTRY_STEP = 60;

const contentsItems = (first: number): Item[] => [
  ...heading(t('etherium.contents')),
  ...ETHERIUM_TREES.flatMap((tree, index): Item[] => {
    const y = ENTRY_TOP + index * ENTRY_STEP;
    return [
      { kind: 'text', text: t(`etherium.trees.${tree.id}.name`), x: 100, y, size: 26, align: 'left', spacing: 2 },
      { kind: 'dots', x1: 380, x2: 520, y: y + 20 },
      { kind: 'text', text: writeDigits(String(first + index + 1)), x: 550, y, size: 26, align: 'right' },
      { kind: 'link', y: y - 10, height: ENTRY_STEP - 4, target: first + index },
    ];
  }),
];

/** Où sont les nœuds : du bas (le premier) vers le haut. */
const NODE_X = 170;
const NODE_BOTTOM = 640;
const NODE_TOP = 280;
const NODE_SIZE = 64;

const treeItems = (state: GameState, id: EtheriumTreeId): Item[] => {
  const tree = ETHERIUM_TREES.find((candidate) => candidate.id === id)!;
  const taken = nodesOf(state, id);
  const step = (NODE_BOTTOM - NODE_TOP) / Math.max(1, tree.costs.length - 1);
  const yOf = (index: number): number => NODE_BOTTOM - index * step;
  const description = paragraph(t(`etherium.trees.${id}.description`), 168, {
    left: 110,
    width: 420,
    size: 20,
    line: 28,
    align: 'center',
    italic: true,
    faded: true,
  });
  const next = nextNodeCost(state, id);
  const affordable = next !== undefined && state.ether >= next;
  return [
    ...heading(t(`etherium.trees.${id}.name`)),
    ...description.items,
    // La tige : dorée jusqu'au dernier nœud pris, pâle au-delà.
    { kind: 'stem', x: NODE_X, y1: yOf(tree.costs.length - 1), y2: yOf(0) },
    ...(taken > 1 ? [{ kind: 'stem', x: NODE_X, y1: yOf(taken - 1), y2: yOf(0), gold: true } satisfies Item] : []),
    ...tree.costs.flatMap((cost, index): Item[] => {
      const y = yOf(index);
      const done = index < taken;
      const isNext = index === taken;
      const note = done ? t('etherium.taken') : t(isNext && affordable ? 'etherium.take' : 'etherium.cost').replace('{n}', plain(cost));
      return [
        {
          kind: 'seal',
          id: `etherium:${id}:${index}`,
          series: `etherium:${id}`,
          tier: index,
          look: done ? 'gold' : 'embossed',
          x: NODE_X,
          y,
          size: NODE_SIZE,
        },
        { kind: 'text', text: nodeEffect(id, index), x: 230, y: y - 26, size: 21, align: 'left', faded: !done && !isNext },
        {
          kind: 'text',
          text: note,
          x: 230,
          y: y + 4,
          size: 24,
          align: 'left',
          face: 'hand',
          faded: !(isNext && affordable),
          steady: true,
        },
        ...(isNext && affordable ? [{ kind: 'action', id: 'take', x: 120, width: 420, y: y - 34, height: 70 } satisfies Item] : []),
      ];
    }),
  ];
};

/** Toutes les pages : garde, sommaire, un arbre par page. Un nœud pris se voit aussitôt sur la page. */
export const createEtheriumPages = (state: GameState, goTo: (page: number) => void): LeafPage[] => {
  const first = 2;
  return [
    createLeafPage(() => titleItems(state), goTo),
    createLeafPage(() => [...contentsItems(first), folio(2)], goTo),
    ...ETHERIUM_TREES.map((tree, index) =>
      createLeafPage(() => [...treeItems(state, tree.id), folio(first + index + 1)], goTo, {
        onAct: (action) => {
          if (action === 'take') takeNode(state, tree.id);
        },
      }),
    ),
  ];
};
