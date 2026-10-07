import { createLeafPage, type LeafPage } from '../strangeBook/pages';
import { folio, heading, type Item } from '../strangeBook/pageItems';
import { paragraph } from '../whiteBook/paragraph';
import { ETHERIUM_PAGES, KEEPS, STARS, type PageId, type Star } from '../../data/etheriumStars';
import { nextEtherPages } from '../../systems/prestige';
import { lightStar, starLit, starOpen } from '../../systems/etherium';
import { formatCount, formatNumber, writeDigits } from '../../core/format';
import { getLocale, t } from '../../i18n';
import type { GameState } from '../../core/state';

/**
 * Les pages de l'Etherium (repère de la page : 640 × 800) : la garde, avec l'Éther à dépenser, le sommaire,
 * puis une constellation par page (conception §4.2, data/etheriumStars.ts). En attendant les pages de nuit, chaque
 * page liste ses étoiles dans l'ordre ; une étoile ouverte s'allume d'un clic s'il y a assez d'Éther.
 */

const plain = (value: number): string => formatNumber(value, getLocale());

/** Les étoiles de la Ruche qui ont leur propre texte (les méthodes secrètes, celles de l'Âge Automatique). */
const STAR_TEXTS_MEMORY = new Set(['m0', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5']);

/** Le nom d'une étoile ; celles de la Ruche qui gardent une méthode du jeu portent son nom. */
const starName = (star: Star): string => {
  const [page, id] = star.id.split('.');
  const tool = Object.keys(KEEPS).find((method) => KEEPS[method] === star.id);
  return tool && !STAR_TEXTS_MEMORY.has(id) ? t(`tools.${tool}.name`) : t(`etherium.stars.${page}.${id}.name`);
};

/** Ce que donne une étoile : « ×1,25 pages par seconde ». */
const starEffect = (star: Star): string => {
  const [page, id] = star.id.split('.');
  // La Ruche : le nom de l'étoile est celui de la méthode ; reste ce qu'elle garde.
  if (page === 'memory') return STAR_TEXTS_MEMORY.has(id) ? t(`etherium.stars.memory.${id}.effect`) : t('etherium.keep');
  const value = t(`etherium.stars.${page}.${id}.value`);
  const effect = t(`etherium.stars.${page}.${id}.effect`);
  return writeDigits(effect ? `${value} ${effect}` : value);
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
const ENTRY_STEP = 56;

const contentsItems = (first: number): Item[] => [
  ...heading(t('etherium.contents')),
  ...ETHERIUM_PAGES.flatMap((page, index): Item[] => {
    const y = ENTRY_TOP + index * ENTRY_STEP;
    return [
      { kind: 'text', text: t(`etherium.pages.${page}.name`), x: 100, y, size: 26, align: 'left', spacing: 2 },
      { kind: 'dots', x1: 380, x2: 520, y: y + 20 },
      { kind: 'text', text: writeDigits(String(first + index + 1)), x: 550, y, size: 26, align: 'right' },
      { kind: 'link', y: y - 10, height: ENTRY_STEP - 4, target: first + index },
    ];
  }),
];

const ROW_TOP = 250;
const ROW_STEP = 42;
/** Hauteur que les lignes ne dépassent pas (le folio est dessous) : les pages longues se resserrent. */
const ROWS_HEIGHT = 430;

const pageItems = (state: GameState, page: PageId): Item[] => {
  const description = paragraph(t(`etherium.pages.${page}.description`), 168, {
    left: 110,
    width: 420,
    size: 20,
    line: 28,
    align: 'center',
    italic: true,
    faded: true,
  });
  const stars = STARS.filter((star) => star.page === page);
  const step = Math.min(ROW_STEP, ROWS_HEIGHT / stars.length);
  return [
    ...heading(t(`etherium.pages.${page}.name`)),
    ...description.items,
    ...stars.flatMap((star, index): Item[] => {
      const y = ROW_TOP + index * step;
      const lit = starLit(state, star.id);
      const open = starOpen(state, star.id);
      const affordable = open && state.ether >= star.cost;
      const note = lit ? t('etherium.lit') : t(affordable ? 'etherium.light' : 'etherium.cost').replace('{n}', plain(star.cost));
      return [
        { kind: 'text', text: starName(star), x: 80, y, size: 17, align: 'left', gold: lit, faded: !lit && !open },
        { kind: 'text', text: starEffect(star), x: 80, y: y + 18, size: 13, align: 'left', italic: true, faded: true },
        { kind: 'text', text: note, x: 560, y, size: 18, align: 'right', face: 'hand', faded: !affordable, steady: true },
        ...(affordable ? [{ kind: 'action', id: `light:${star.id}`, x: 70, width: 500, y: y - 6, height: step - 2 } satisfies Item] : []),
      ];
    }),
  ];
};

/** Toutes les pages : garde, sommaire, une constellation par page. Une étoile allumée se voit aussitôt sur la page. */
export const createEtheriumPages = (state: GameState, goTo: (page: number) => void): LeafPage[] => {
  const first = 2;
  return [
    createLeafPage(() => titleItems(state), goTo),
    createLeafPage(() => [...contentsItems(first), folio(2)], goTo),
    ...ETHERIUM_PAGES.map((page, index) =>
      createLeafPage(() => [...pageItems(state, page), folio(first + index + 1)], goTo, {
        onAct: (action) => {
          if (action.startsWith('light:')) lightStar(state, action.slice('light:'.length));
        },
      }),
    ),
  ];
};
