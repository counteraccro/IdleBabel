import { t } from '../i18n';
import type { HistoryEntry } from '../core/history';
import type { GameState } from '../core/state';

/**
 * Le livre de la fin : la partie du joueur racontée depuis l'historique (core/history.ts), au « tu »
 * et au passé composé, chaque moment placé par une durée depuis le précédent, jamais par une date.
 * Recalculé à chaque lecture : la sauvegarde ne garde que les moments. Un chapitre par Âge.
 */

/** Un paragraphe : un moment raconté, ou (`note`) une action de débogage, écrite en marge. */
export interface Told {
  text: string;
  /** Le moment vient d'une action de débogage. */
  debug?: boolean;
  /** Pas un moment : une action de débogage (ce qui a été touché), jamais racontée. */
  note?: boolean;
}

export interface FinalChapter {
  title: string;
  paragraphs: Told[];
}

export interface FinalBook {
  title: string;
  /** Avant le réveil : les vies d'avant, dont le livre se souvient. */
  before: string;
  chapters: FinalChapter[];
  end: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Durée écoulée → sa tournure (finalBook.when.*) : arrondie, comme la sent quelqu'un qui a perdu le temps. */
const WHEN: [below: number, key: string][] = [
  [MINUTE, 'now'],
  [7 * MINUTE, 'minutes'],
  [15 * MINUTE, 'tenMinutes'],
  [25 * MINUTE, 'twentyMinutes'],
  [45 * MINUTE, 'halfHour'],
  [90 * MINUTE, 'hour'],
  [6 * HOUR, 'hours'],
  [20 * HOUR, 'manyHours'],
  [36 * HOUR, 'day'],
  [5 * DAY, 'days'],
  [10 * DAY, 'week'],
  [25 * DAY, 'weeks'],
  [45 * DAY, 'month'],
  [300 * DAY, 'months'],
];

export const whenKey = (elapsed: number): string => WHEN.find(([below]) => elapsed < below)?.[1] ?? 'years';

/** Le texte d'une clé, ou rien si elle n'existe pas (t renvoie alors la clé elle-même). */
const text = (path: string): string | undefined => {
  const value = t(`finalBook.${path}`);
  return value === `finalBook.${path}` ? undefined : value;
};

/** Le texte d'un moment, avant que `{when}` soit remplacé ; rien s'il n'a pas (encore) de phrase. */
const template = (entry: HistoryEntry, state: GameState): string | undefined => {
  const detail = entry.detail ?? '';
  switch (entry.type) {
    case 'gameStarted':
      return text('moments.gameStarted')?.replaceAll('{name}', state.playerName || '…');
    case 'firstTool':
      return text(`methods.${detail}`);
    case 'memory':
      return text(`memories.${detail}`) ?? text('moments.memory');
    case 'books':
      return text(`books.${detail}`);
    case 'pages':
      return text(`pages.${detail}`);
    case 'secretSeal':
      return text(`secrets.${detail}`);
    case 'rareBook':
      return text('moments.rareBook')?.replaceAll('{title}', t(`rareBooks.${detail}.name`));
    case 'debug':
      return undefined;
    default:
      return text(`moments.${entry.type}`);
  }
};

/** Le titre du livre (pas encore choisi par l'auteur : provisoire). */
export const finalBookTitle = (): string => text('title') ?? '';

/** Toute la partie racontée, dans l'ordre où elle a eu lieu. */
export const tellFinalBook = (state: GameState): FinalBook => {
  const entries = [...state.history].sort((a, b) => a.at - b.at);
  const paragraphs: Told[] = [];
  // Les durées se comptent d'un vrai moment à l'autre : le débogage ne fait pas passer le temps.
  let last: number | null = null;
  for (const entry of entries) {
    if (entry.type === 'debug') {
      paragraphs.push({ text: `Débogage · ${entry.detail ?? ''}`, note: true });
      continue;
    }
    const line = template(entry, state);
    if (!line) continue;
    const when = text(`when.${whenKey(last === null ? 0 : entry.at - last)}`) ?? '';
    paragraphs.push(entry.debug ? { text: line.replaceAll('{when}', when), debug: true } : { text: line.replaceAll('{when}', when) });
    if (!entry.debug) last = entry.at;
  }
  // Un seul Âge pour l'instant : les suivants ouvriront chacun leur chapitre.
  return {
    title: finalBookTitle(),
    before: text('before') ?? '',
    chapters: [{ title: text('ages.manual') ?? '', paragraphs }],
    end: text('moments.end') ?? '',
  };
};
