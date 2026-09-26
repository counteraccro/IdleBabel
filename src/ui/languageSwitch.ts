import { el } from './dom';
import { AVAILABLE_LOCALES, getLocale, type Locale } from '../i18n';

export const createLanguageSwitch = (onChange: (locale: Locale) => void): HTMLElement => {
  const root = el('div', 'langs');
  for (const locale of AVAILABLE_LOCALES) {
    const button = el('button', locale === getLocale() ? 'active' : undefined, locale.toUpperCase());
    button.addEventListener('click', () => onChange(locale));
    root.append(button);
  }
  return root;
};
