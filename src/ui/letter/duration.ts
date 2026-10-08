import { t } from '../../i18n';
import { writeDigits } from '../../core/format';

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
