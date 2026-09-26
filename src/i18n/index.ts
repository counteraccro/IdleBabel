import { LOCALES, REFERENCE_LOCALE } from './locales';

export type Locale = keyof typeof LOCALES;

export const AVAILABLE_LOCALES = Object.keys(LOCALES) as Locale[];

let current: Locale = REFERENCE_LOCALE;

export const detectLocale = (): Locale => {
  const browser = navigator.language.slice(0, 2);
  return (AVAILABLE_LOCALES as string[]).includes(browser) ? (browser as Locale) : 'en';
};

export const setLocale = (locale: Locale): void => {
  current = locale;
};

export const getLocale = (): Locale => current;

const lookup = (messages: unknown, path: string): string | undefined => {
  const value = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], messages);
  return typeof value === 'string' ? value : undefined;
};

/** t('ui.read'), t('tools.diagonal.name') — repli sur le français, puis sur la clé. */
export const t = (path: string): string =>
  lookup(LOCALES[current], path) ?? lookup(LOCALES[REFERENCE_LOCALE], path) ?? path;
