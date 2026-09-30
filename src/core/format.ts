import type { Locale } from '../i18n';

/**
 * Façons d'écrire les grands nombres, au choix du joueur (cahier d'options) : en entier, en abrégé
 * (25 M), scientifique (2,50e7), ingénieur (25,0e6, puissance multiple de 3), ou en symboles de Babel
 * (un symbole par chiffre, comme une écriture inconnue).
 */
export const NOTATIONS = ['full', 'short', 'scientific', 'engineering', 'babel'] as const;
export type Notation = (typeof NOTATIONS)[number];

let current: Notation = 'full';

export const currentNotation = (): Notation => current;

/** Notation utilisée par défaut par formatNumber (réglage du joueur). */
export const setNotation = (notation: Notation): void => {
  current = NOTATIONS.includes(notation) ? notation : 'full';
};

/** En dessous, toutes les notations (sauf Babel) écrivent le nombre en entier. */
const LARGE = 1_000;
/** Au-delà, les abréviations de la langue s'arrêtent (billions) : on passe en scientifique. */
const SHORT_LIMIT = 1e15;

/**
 * Chiffres de Babel : dix des 22 lettres de la Bibliothèque, toujours les mêmes. Le point sépare les
 * milliers, la virgule les décimales : les deux signes de ponctuation de Borges.
 */
const BABEL_DIGITS = 'zxvutsrqpo';

const full = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: value < 100 ? 1 : 0 }).format(value);

/** m × 10^e, avec `step` = 1 (scientifique) ou 3 (ingénieur) ; trois chiffres significatifs. */
const exponent = (value: number, locale: Locale, step: 1 | 3): string => {
  let power = Math.floor(Math.log10(value) / step) * step;
  let mantissa = value / 10 ** power;
  // L'arrondi peut faire déborder la mantisse (9,996e7 → 10,00e7) : on passe à la puissance suivante.
  // Après ce passage, la mantisse (0,9996) s'écrit comme 1 : trois chiffres, 1,00.
  const digits = (m: number): number => Math.max(0, 2 - Math.floor(Math.log10(Math.max(m, 1))));
  if (Number(mantissa.toFixed(digits(mantissa))) >= 10 ** step) {
    power += step;
    mantissa = value / 10 ** power;
  }
  const text = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits(mantissa),
    maximumFractionDigits: digits(mantissa),
  }).format(mantissa);
  return `${text}e${power}`;
};

const babel = (value: number): string => {
  const [whole, fraction] = (value < 100 ? Math.round(value * 10) / 10 : Math.round(value)).toString().split('.');
  const letters = (digits: string): string => [...digits].map((digit) => BABEL_DIGITS[Number(digit)]).join('');
  const grouped = letters(whole).replace(/\B(?=(.{3})+$)/g, '.');
  return fraction ? `${grouped},${letters(fraction)}` : grouped;
};

export const formatNumber = (value: number, locale: Locale, notation: Notation = current): string => {
  if (!Number.isFinite(value) || value < 0) return full(value, locale);
  // Au-delà de 1e21, JavaScript écrit lui-même l'exposant (1e+21) : il n'y a plus de chiffres à changer.
  if (notation === 'babel') return value < 1e21 ? babel(value) : exponent(value, locale, 1);
  if (value < LARGE || notation === 'full') return full(value, locale);
  if (notation === 'short' && value < SHORT_LIMIT)
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  return exponent(value, locale, notation === 'engineering' ? 3 : 1);
};
