import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';

export const createFooter = (onReset: () => void): Component => {
  const root = el('footer');
  const reset = el('button', 'link', t('ui.reset'));
  reset.addEventListener('click', onReset);
  const build = new Date(__BUILD_DATE__).toLocaleString(getLocale());
  root.append(reset, el('span', undefined, `${t('ui.build')} ${build}`));
  return { root, update: () => {} };
};
