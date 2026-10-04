import { getLocale, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { TOOLS } from '../../data/tools';
import { PAGES_PER_BOOK } from '../../systems/books';
import { pagesPerSecond } from '../../systems/production';
import { meaningfulCovers } from '../../systems/stats';
import { findChance } from '../../systems/knowledge';
import { BASE_FIND_CHANCE } from '../../data/knowledge';
import { filterMultiplier } from '../../systems/technologies';
import { sealFindMultiplier } from '../../systems/seals';
import { isDeciphered } from '../../systems/decipher';
import { statsRevealed } from '../../systems/strangeBook';
import type { PartId } from '../../data/decipher';
import type { GameState } from '../../core/state';

/**
 * Contenu du livre étrange : des chiffres sans légende. Les titres et les légendes sont en
 * symboles de Babel (mots fixes, toujours les mêmes) jusqu'à ce que la Connaissance les déchiffre.
 */
export interface Figure {
  /** Clé de la légende en clair (strangeBook.figures.<id> ; tools.<id>.name pour une méthode). */
  id: string;
  caption: string;
  value: (state: GameState) => string;
  /** Un chiffre n'apparaît qu'une fois qu'il existe vraiment. */
  shown?: (state: GameState) => boolean;
  /** Une ligne d'un relevé (nom … nombre), en haut de la page, au lieu d'un grand chiffre : les méthodes. */
  row?: boolean;
  /** De quoi il est fait, en petit sous le chiffre (les mots, une fois le chapitre déchiffré). */
  detail?: (state: GameState, readable: boolean) => string;
}

export interface Chapter {
  /** C'est aussi la partie à déchiffrer pour lire ses légendes. */
  id: Exclude<PartId, 'contents' | 'seals'>;
  title: string;
  shown: (state: GameState) => boolean;
  figures: Figure[];
}

export const CONTENTS_TITLE = 'ilgaz hotue';

const number = (value: number): string => formatNumber(Math.floor(value), getLocale());

const pad = (value: number): string => String(value).padStart(2, '0');

/** Heures, minutes, secondes : 53:07:42 (les heures ne repassent pas à zéro). */
const clock = (seconds: number): string => {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
};

const percent = (value: number): string =>
  writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 2 }).format(value));
const factor = (value: number): string => `×${formatNumber(value, getLocale())}`;

/** La chance de trouvaille, décomposée : le hasard, × le filtre sémantique, × les sceaux. */
const findChanceParts = (state: GameState, readable: boolean): string => {
  const parts = [percent(BASE_FIND_CHANCE), factor(filterMultiplier(state)), factor(sealFindMultiplier(state))];
  if (!readable) return parts.join('  ');
  const [base, filter, seals] = parts;
  return t('strangeBook.figures.findChanceParts').replace('{base}', base).replace('{filter}', filter).replace('{seals}', seals);
};

const startedAt = (state: GameState): number => state.history.find((e) => e.type === 'gameStarted')?.at ?? Date.now();

const DAY_MS = 86_400_000;

/** Trouvailles d'une sorte. */
const found = (state: GameState, kind: string): number => state.finds.filter((find) => find.kind === kind).length;

const TOOL_CAPTIONS: Record<string, string> = {
  diagonal: 'bruda vex',
  finger: 'olmo dite',
  thumb: 'parsu nel',
  voice: 'vox teduri',
  wide: 'larbe io',
  double: 'dimpa roel',
  mirror: 'cuprel ana',
  lectern: 'lotiz perma',
  ladder: 'escal u virn',
};

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'pages',
    title: 'xorbe',
    shown: () => true,
    figures: [
      { id: 'totalPages', caption: 'lacimo tev', value: (s) => number(s.totalPagesRead) },
      { id: 'stock', caption: 'dru pesna', value: (s) => number(s.pages) },
      { id: 'clicks', caption: 'mao nirvel', value: (s) => number(s.stats.clicks), shown: (s) => s.stats.clicks > 0 },
    ],
  },
  {
    id: 'books',
    title: 'vuntale',
    shown: () => true,
    figures: [
      { id: 'booksFinished', caption: 'odrez mui', value: (s) => number(s.booksFinished) },
      { id: 'bookPage', caption: 'faso lu tren', value: (s) => writeDigits(`${s.bookPage} / ${PAGES_PER_BOOK}`) },
      { id: 'meaningfulCovers', caption: 'quel sabiro', value: (s) => number(meaningfulCovers(s)), shown: (s) => meaningfulCovers(s) > 0 },
    ],
  },
  {
    id: 'time',
    title: 'ecrubo',
    shown: () => true,
    figures: [
      { id: 'playTime', caption: 'tisal ore', value: (s) => writeDigits(clock(s.stats.playSeconds)) },
      {
        id: 'startDate',
        caption: 'gonda vi pel',
        value: (s) =>
          writeDigits(new Date(startedAt(s)).toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })),
      },
      { id: 'days', caption: 'ruma teo', value: (s) => number((Date.now() - startedAt(s)) / DAY_MS) },
    ],
  },
  {
    id: 'methods',
    title: 'hesmodar',
    shown: (s) => s.stats.bestPagesPerSecond > 0,
    figures: [
      ...TOOLS.map((tool) => ({
        id: tool.id,
        caption: TOOL_CAPTIONS[tool.id] ?? tool.id,
        value: (s: GameState) => number(s.tools[tool.id]),
        shown: (s: GameState) => s.tools[tool.id] > 0,
        row: true,
      })),
      { id: 'pagesPerSecond', caption: 'zo selim', value: (s) => formatNumber(pagesPerSecond(s), getLocale()) },
      { id: 'bestPagesPerSecond', caption: 'amprel duc', value: (s) => formatNumber(s.stats.bestPagesPerSecond, getLocale()) },
    ],
  },
  {
    id: 'knowledge',
    title: 'semavir',
    shown: (s) => s.lifetimeKnowledge > 0,
    figures: [
      { id: 'knowledge', caption: 'olbi farent', value: (s) => number(s.knowledge) },
      { id: 'lifetimeKnowledge', caption: 'tuzma led', value: (s) => number(s.lifetimeKnowledge) },
      {
        id: 'finds',
        caption: 'pirno dalce vomi',
        value: (s) => ['word', 'piece', 'sentence'].map((kind) => number(found(s, kind))).join(' · '),
      },
      {
        id: 'findChance',
        caption: 'gilo mepar',
        value: (s) => percent(findChance(s)),
        detail: findChanceParts,
      },
    ],
  },
];

/** Débogage : « statistiques visibles » montre tous les chapitres, tous les chiffres, et les légendes en clair. */
export const chapterShown = (state: GameState, chapter: Chapter): boolean => statsRevealed() || chapter.shown(state);
export const figureShown = (state: GameState, figure: Figure): boolean => statsRevealed() || (figure.shown?.(state) ?? true);

export const contentsTitle = (state: GameState): string => (isDeciphered(state, 'contents') ? t('strangeBook.contents') : CONTENTS_TITLE);
export const chapterTitle = (state: GameState, chapter: Chapter): string =>
  isDeciphered(state, 'contents') ? t(`strangeBook.chapters.${chapter.id}`) : chapter.title;
export const figureCaption = (state: GameState, chapter: Chapter, figure: Figure): string => {
  if (!isDeciphered(state, chapter.id)) return figure.caption;
  return figure.id in TOOL_CAPTIONS ? t(`tools.${figure.id}.name`) : t(`strangeBook.figures.${figure.id}`);
};
