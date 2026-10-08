import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { createFpsMeter } from './fpsMeter';
import { VERSION } from '../data/version';
import type { Settings } from '../core/state';

/** Le pied de l'écran : la version du jeu (un lien vers les notes de mise à jour, `onNotes`), sa date au survol. */
export const createFooter = (settings: Settings, onNotes: () => void): Component => {
  const root = el('footer');
  if (settings.showFps) root.append(createFpsMeter('fps'));
  const version = el('a', 'link', t('ui.version').replace('{name}', VERSION));
  version.href = '#notes';
  version.title = `${t('ui.build')} ${new Date(__BUILD_DATE__).toLocaleString(getLocale())}`;
  version.addEventListener('click', (event) => {
    event.preventDefault();
    onNotes();
  });
  root.append(version);
  return { root, update: () => {} };
};
