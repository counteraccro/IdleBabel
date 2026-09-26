import type { Locale } from '../i18n';

export const formatNumber = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: value < 100 ? 1 : 0 }).format(value);
