import { getLocale, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';

/** Une durée lisible, à la seconde : « 45 secondes », « 2 minutes », « 1 min 30 ». */
export const durationText = (seconds: number): string => {
  const whole = Math.max(1, Math.round(seconds));
  const [m, s] = [Math.floor(whole / 60), whole % 60];
  const text =
    m === 0
      ? t('ui.letter.time.seconds').replace('{n}', String(s))
      : s > 0
        ? t('ui.letter.time.minuteSeconds').replace('{m}', String(m)).replace('{s}', String(s).padStart(2, '0'))
        : m === 1
          ? t('ui.letter.time.minute')
          : t('ui.letter.time.minutes').replace('{n}', String(m));
  return writeDigits(text);
};

/** Le temps qui reste, en chiffres d'horloge : « 1:42 ». */
export const clockText = (ms: number): string => {
  const whole = Math.ceil(ms / 1000);
  return writeDigits(`${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`);
};

/** Un temps d'attente, en ses deux plus grandes unités (l'auteur, 19/10 : « en jour / heure / minutes / secondes »). */
export const waitText = (seconds: number): string => {
  const whole = Math.max(1, Math.ceil(seconds));
  const parts = [
    [Math.floor(whole / 86_400), 'days'],
    [Math.floor(whole / 3600) % 24, 'hours'],
    [Math.floor(whole / 60) % 60, 'minutes'],
    [whole % 60, 'seconds'],
  ] as const;
  const first = parts.findIndex(([value]) => value > 0);
  return writeDigits(
    parts
      .slice(first, first + 2)
      .filter(([value]) => value > 0)
      // Les jours peuvent être sans fin (un gros lot à petit rythme) : écrits comme tous les grands nombres du jeu.
      .map(([value, unit]) =>
        t(`whiteBook.intuition.units.${unit}`).replace('{n}', unit === 'days' ? formatNumber(value, getLocale()) : String(value)),
      )
      .join(' '),
  );
};
