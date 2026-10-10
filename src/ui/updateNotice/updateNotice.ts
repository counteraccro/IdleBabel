import { openModal, modalOpen } from '../modal/modal';
import { onResume } from '../animationClock';
import { storyLines } from '../lore';
import { messages, t } from '../../i18n';
import { saveGame } from '../../core/save';
import { nudgeLore } from '../../systems/lore';
import { newVersion, type PublishedVersion } from '../../systems/newVersion';
import type { GameState } from '../../core/state';

/** Écart entre deux lectures de la version en ligne. */
const CHECK_MS = 5 * 60 * 1000;
/** Première lecture, peu après l'ouverture : le navigateur a pu servir une ancienne version gardée en cache. */
const FIRST_CHECK_MS = 10 * 1000;

let showing = false;
/** La fenêtre de la nouvelle version est à l'écran : les récits attendent qu'elle se ferme (ui/lore.ts). */
export const updateNoticeOpen = (): boolean => showing;

/** La version en ligne, relue sans cache (GitHub Pages garde ses fichiers 10 min) ; null si elle ne se lit pas. */
const readPublished = async (): Promise<unknown> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

/**
 * Une nouvelle version est en ligne : une fenêtre sobre le dit et propose de recharger (la partie sauvegardée
 * juste avant). Rien ne se recharge tout seul : un piège ou une chasse peuvent être en cours. « Plus tard » : elle
 * ne revient pas pour cette version. Elle attend qu'aucune autre fenêtre ne soit ouverte.
 */
export const mountUpdateNotice = (state: GameState): void => {
  const dismissed = new Set<string>();
  let waiting: PublishedVersion | null = null;
  let reloading = false;
  const show = (version: PublishedVersion): void => {
    showing = true;
    const text = messages().ui.update.text;
    const story = storyLines(text.length);
    story.lines.forEach((line, index) => (line.textContent = text[index].replace('{name}', version.name)));
    openModal({
      title: t('ui.update.title'),
      body: [story.root],
      actions: [
        {
          label: t('ui.update.reload'),
          kind: 'primary',
          onClick: () => {
            reloading = true;
            saveGame(state);
            window.location.reload();
          },
        },
        { label: t('ui.update.later'), onClick: () => dismissed.add(version.build) },
      ],
      onClose: () => {
        // Le jeu se recharge : aucun récit ne s'ouvre entre-temps.
        if (reloading) return;
        showing = false;
        nudgeLore();
      },
    });
  };
  const check = async (): Promise<void> => {
    const version = newVersion(await readPublished(), __BUILD_DATE__);
    if (!version || showing || dismissed.has(version.build)) return;
    if (modalOpen()) waiting = version;
    else show(version);
  };
  onResume(() => {
    if (!waiting || modalOpen()) return;
    const version = waiting;
    waiting = null;
    if (!dismissed.has(version.build)) show(version);
  });
  setTimeout(() => void check(), FIRST_CHECK_MS);
  setInterval(() => void check(), CHECK_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
};
