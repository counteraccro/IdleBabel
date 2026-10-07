import { getLocale, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { TOOLS } from '../../data/tools';
import { PAGES_PER_BOOK } from '../../systems/books';
import { pagesPerSecond } from '../../systems/production';
import { meaningfulCovers } from '../../systems/stats';
import { findChance } from '../../systems/knowledge';
import { BASE_FIND_CHANCE } from '../../data/knowledge';
import { filterMultiplier, gestureMultiplier, rareChance } from '../../systems/technologies';
import { etherReading, readingMultiplier } from '../../systems/etherium';
import { nextRareChance } from '../../systems/rareBooks';
import { RARE_BOOKS } from '../../data/rareBooks';
import { sealFindMultiplier } from '../../systems/seals';
import { isDeciphered } from '../../systems/decipher';
import { statsRevealed } from '../../systems/strangeBook';
import { nextEtherPages, nextEtherProgress, prestigeGain } from '../../systems/prestige';
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
  /**
   * De quoi il est fait, en petit (les mots, une fois le chapitre déchiffré) : une ligne entre le chiffre et sa légende,
   * ou plusieurs, sous la légende, pour ce qui grandit sans fin (la vitesse de lecture).
   */
  detail?: (state: GameState, readable: boolean) => string | string[];
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
/** Les très petites chances gardent leurs chiffres : 0,0037 %, pas 0 %. */
const smallPercent = (value: number): string =>
  writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumSignificantDigits: 2 }).format(value));
const factor = (value: number): string => `×${formatNumber(value, getLocale())}`;

/** La chance de trouvaille, décomposée : le hasard, × les intuitions (le filtre sémantique), × les sceaux. */
const findChanceParts = (state: GameState, readable: boolean): string => {
  const parts = [percent(BASE_FIND_CHANCE), factor(filterMultiplier(state)), factor(sealFindMultiplier(state))];
  if (!readable) return parts.join('  ');
  const [base, filter, seals] = parts;
  return t('strangeBook.figures.findChanceParts').replace('{base}', base).replace('{filter}', filter).replace('{seals}', seals);
};

/**
 * La vitesse de lecture, décomposée : ce que lisent les méthodes d'elles-mêmes, × leurs intuitions (en moyenne, pesée
 * par ce que lit chacune) ; puis, après un premier prestige, une seconde ligne : × l'Etherium (le Livre ouvert) et
 * × l'Éther reçu.
 */
const pagesPerSecondParts = (state: GameState, readable: boolean): string[] => {
  const base = TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond, 0);
  const gestures = TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond * gestureMultiplier(state, tool.id), 0);
  const prestiged = state.etherReceived > 0;
  const parts = [
    formatNumber(base, getLocale()),
    factor(base > 0 ? gestures / base : 1),
    ...(prestiged ? [factor(readingMultiplier(state)), factor(etherReading(state))] : []),
  ];
  const [methods, intuitions, stars, ether] = parts;
  if (!readable) return prestiged ? [`${methods}  ${intuitions}`, `${stars}  ${ether}`] : [`${methods}  ${intuitions}`];
  const first = t('strangeBook.figures.pagesPerSecondParts').replace('{methods}', methods).replace('{intuitions}', intuitions);
  if (!prestiged) return [first];
  return [first, t('strangeBook.figures.pagesPerSecondEther').replace('{stars}', stars).replace('{ether}', ether)];
};

const rareFound = (state: GameState): number => Object.keys(state.rareBooks).length;
/** La chance que le prochain livre soit rare : le Flair, et plus basse à chaque livre rare trouvé. */
const nextRare = (state: GameState): number => nextRareChance(rareFound(state), rareChance(state));
const nextRareParts = (state: GameState, readable: boolean): string => {
  const one = number(Math.round(1 / nextRare(state)));
  return readable ? t('strangeBook.figures.rareChanceParts').replace('{n}', one) : `1 / ${one}`;
};

/** L'Éther versé dans l'Etherium, et les prestiges qui l'ont rapporté. */
const etherSpentParts = (state: GameState, readable: boolean): string => {
  const spent = number(state.etherReceived - state.ether);
  return readable ? t('strangeBook.figures.etherSpent').replace('{n}', spent) : spent;
};
const prestigesParts = (state: GameState, readable: boolean): string => {
  const count = number(state.exiles);
  return readable ? t(`strangeBook.figures.${state.exiles === 1 ? 'onePrestige' : 'prestiges'}`).replace('{n}', count) : count;
};
/** Où en est le prochain Éther, en pour cent des pages qui le séparent du dernier. */
const nextEtherParts = (state: GameState): string => percent(Math.floor(nextEtherProgress(state) * 100) / 100);

const startedAt = (state: GameState): number => state.history.find((e) => e.type === 'gameStarted')?.at ?? Date.now();

const DAY_MS = 86_400_000;

/** Trouvailles d'une sorte. */
const found = (state: GameState, kind: string): number => state.finds.filter((find) => find.kind === kind).length;

const TOOL_CAPTIONS: Record<string, string> = {
  diagonal: 'bruda vex',
  finger: 'olmo dite',
  voice: 'vox teduri',
  lectern: 'lotiz perma',
  ladder: 'escal u virn',
  cornee: 'pagna corvi',
  metronome: 'metru bal',
  wheel: 'rota libra',
  lift: 'pulo vesk',
  automaton: 'automa lir',
  clock: 'horla galen',
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
      {
        id: 'pagesPerSecond',
        caption: 'zo selim',
        value: (s) => formatNumber(pagesPerSecond(s), getLocale()),
        detail: pagesPerSecondParts,
      },
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
  {
    id: 'rareBooks',
    title: 'ravunel',
    // Une fois le premier livre rare trouvé. Combien il en reste, comme sur leur planche de sceaux : ça ne se dit pas.
    shown: (s) => rareFound(s) > 0,
    figures: [
      { id: 'rareFound', caption: 'odri sabiro', value: (s) => number(rareFound(s)) },
      {
        id: 'rareChance',
        caption: 'serbo alin',
        value: (s) => smallPercent(nextRare(s)),
        detail: nextRareParts,
        shown: (s) => rareFound(s) < RARE_BOOKS.length,
      },
      // Tous trouvés : plus de chance à dire, une phrase à la place.
      { id: 'rareAll', caption: 'nul serbo vane', value: () => '', shown: (s) => rareFound(s) >= RARE_BOOKS.length },
    ],
  },
  {
    id: 'ether',
    title: 'etravunel',
    // Après le premier prestige : ce que l'Éther est devenu, et ce qui vient.
    shown: (s) => s.etherReceived > 0,
    figures: [
      { id: 'ether', caption: 'etra dulmo', value: (s) => number(s.ether), detail: etherSpentParts },
      { id: 'etherReceived', caption: 'etra vunel', value: (s) => number(s.etherReceived), detail: prestigesParts },
      { id: 'prestigeGain', caption: 'etra sopi nar', value: (s) => number(prestigeGain(s)) },
      {
        id: 'nextEther',
        caption: 'vanu etra lis',
        value: (s) => number(Math.max(0, nextEtherPages(s) - s.totalPagesRead)),
        detail: nextEtherParts,
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
