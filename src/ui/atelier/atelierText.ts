import { getLocale, messages, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import type { FamilyId, PieceId } from '../../data/curiosities';
import type { Curiosity } from '../../core/state';

/** Les textes de l'atelier (i18n atelier.*), et les petites façons de les écrire. */

/** Un texte de l'atelier, ses {champs} remplis. */
export const at = (key: string, fields: Record<string, string | number> = {}): string =>
  Object.entries(fields).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), t(`atelier.${key}`));

export const rankName = (rank: number): string => messages().atelier.ranks[rank];
export const stateName = (state: number): string => messages().atelier.states[state];
export const statesName = (state: number): string => messages().atelier.statesPlural[state];
export const partName = (part: PieceId): string => messages().atelier.parts[part];
export const partsName = (part: PieceId): string => messages().atelier.partsPlural[part];
export const partLong = (part: PieceId): string => messages().atelier.partsLong[part];
export const partOne = (part: PieceId): string => messages().atelier.partsOne[part];
export const familyName = (family: FamilyId): string => messages().atelier.families[family];
export const setTitle = (set: number): string => messages().atelier.sets[set];

/** Le nom d'un livre : son numéro, ou le titre d'un livre S. */
export const bookName = (book: Curiosity): string => (book.set === undefined ? at('bookName', { n: book.id }) : setTitle(book.set));

/** Un nombre à une décimale au plus (« 16,9 »). */
export const decimal = (value: number): string => formatNumber(Math.round(value * 10) / 10, getLocale());

const unit = (family: FamilyId): string => (family === 'mimic' ? ` ${t('atelier.points')}` : getLocale() === 'fr' ? ' %' : '%');

/** Un bonus : « Pages lues +16,9 % » (le prix baisse). */
export const bonusText = (family: FamilyId, value: number): string =>
  `${familyName(family)} ${family === 'price' ? '−' : '+'}${decimal(value)}${unit(family)}`;
/** Un malus : « Pages d'un clic −8 % » (le prix monte). */
export const malusText = (family: FamilyId, value: number): string =>
  `${familyName(family)} ${family === 'price' ? '+' : '−'}${decimal(value)}${unit(family)}`;

/** Une durée en minutes : « 2 h 05 », « 40 min ». */
export const minutesText = (minutes: number): string => {
  const whole = Math.max(0, Math.ceil(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (!hours) return at('minutes', { m: rest });
  return rest ? at('hoursMinutes', { h: hours, m: String(rest).padStart(2, '0') }) : at('hours', { h: hours });
};
