import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { createFpsMeter } from './fpsMeter';
import type { Settings } from '../core/state';

export const createFooter = (settings: Settings): Component => {
  const root = el('footer');
  const build = new Date(__BUILD_DATE__).toLocaleString(getLocale());
  if (settings.showFps) root.append(createFpsMeter('fps'));
  root.append(el('span', undefined, `${t('ui.build')} ${build}`));
  return { root, update: () => {} };
};
