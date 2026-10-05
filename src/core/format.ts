import type { Locale } from '../i18n';
import { LOCALES } from '../i18n/locales';

/**
 * Façons d'écrire les grands nombres, au choix du joueur (cahier d'options) : en entier, en toutes
 * lettres (25 millions), en abrégé (25 M), scientifique (2,50e7), ingénieur (25,0e6, puissance multiple
 * de 3), ou en symboles de Babel (un sceau par chiffre, comme une écriture inconnue).
 */
export const NOTATIONS = ['full', 'words', 'short', 'scientific', 'engineering', 'babel'] as const;
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
 * Chiffres de Babel, de 0 à 9 : dessinés comme les sceaux (ui/babelDigits.ts). Dans le texte, chacun
 * est tenu par un losange, repère que l'affichage remplace par son dessin (et qui reste lisible là où
 * il ne l'est pas). Le point sépare les milliers, la virgule les décimales : la ponctuation de Borges.
 */
const BABEL_DIGITS = [...'◇◆◈⬖⬗⬘⬙❖◊⟡'];

/**
 * Chiffres d'un texte déjà écrit (heure, date, pourcentage) dans la notation choisie : en Babel, chaque
 * chiffre devient son sceau et le reste ne bouge pas ; sinon le texte reste tel quel.
 */
export const writeDigits = (text: string): string => (current === 'babel' ? babelDigits(text) : text);

/** Chiffres d'un texte en chiffres de Babel, quelle que soit la notation choisie (un prix imprimé…). */
export const babelDigits = (text: string): string => text.replace(/\d/g, (digit) => BABEL_DIGITS[Number(digit)]);

/** Chiffre (0 à 9) que tient ce caractère, ou -1. */
export const babelDigit = (char: string): number => BABEL_DIGITS.indexOf(char);

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

/**
 * 12,35 millions : la mantisse et le nom de la puissance de mille (à partir du million), au singulier
 * ou au pluriel selon la langue. Au-delà des noms connus, en scientifique.
 */
const words = (value: number, locale: Locale): string => {
  const names = LOCALES[locale].numbers.names;
  let rank = Math.floor(Math.log10(value) / 3) - 2;
  // 999 999 999 s'arrondit à 1 000 millions : c'est 1 milliard.
  if (Number((value / 10 ** (3 * rank + 6)).toFixed(2)) >= 1000) rank++;
  if (rank >= names.length) return exponent(value, locale, 1);
  const mantissa = Number((value / 10 ** (3 * rank + 6)).toFixed(2));
  const [one, many] = names[rank];
  const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(mantissa);
  return `${text} ${mantissa >= 2 ? many : one}`;
};

const babel = (value: number): string => {
  const [whole, fraction] = (value < 100 ? Math.round(value * 10) / 10 : Math.round(value)).toString().split('.');
  const diamonds = (digits: string): string => [...digits].map((digit) => BABEL_DIGITS[Number(digit)]).join('');
  const glyphs = [...diamonds(whole)];
  const grouped = glyphs.map((glyph, i) => (i > 0 && (glyphs.length - i) % 3 === 0 ? `.${glyph}` : glyph)).join('');
  return fraction ? `${grouped},${diamonds(fraction)}` : grouped;
};

export const formatNumber = (value: number, locale: Locale, notation: Notation = current): string => {
  if (!Number.isFinite(value) || value < 0) return full(value, locale);
  // Au-delà de 1e21, JavaScript écrit lui-même l'exposant (1e+21) : il n'y a plus de chiffres à changer.
  if (notation === 'babel') return value < 1e21 ? babel(value) : exponent(value, locale, 1);
  if (value < LARGE || notation === 'full') return full(value, locale);
  if (notation === 'words') return value < 1e6 ? full(value, locale) : words(value, locale);
  if (notation === 'short' && value < SHORT_LIMIT)
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  return exponent(value, locale, notation === 'engineering' ? 3 : 1);
};

/**
 * Nombre suivi de ce qu'il compte (« {n} pages ») : en toutes lettres, le français demande « de » après le nom
 * de la puissance (1 million de pages) ; l'anglais, rien.
 */
export const formatCount = (value: number, locale: Locale): string => {
  const text = formatNumber(value, locale);
  const before = LOCALES[locale].numbers.before;
  return current === 'words' && before && /\p{L}$/u.test(text) ? `${text} ${before}` : text;
};
