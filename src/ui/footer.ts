import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';

export const createFooter = (): Component => {
  const root = el('footer');
  const build = new Date(__BUILD_DATE__).toLocaleString(getLocale());
  root.append(el('span', undefined, `${t('ui.build')} ${build}`));
  return { root, update: () => {} };
};
