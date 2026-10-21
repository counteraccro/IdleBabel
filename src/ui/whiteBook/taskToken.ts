import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { dailyRunning } from '../../systems/tasks';
import type { BookMedalSpec } from '../bookMedals';
import type { GameState } from '../../core/state';

/**
 * Le raccourci des tâches : le médaillon du Jeton, juste après celui du livre blanc (ses tâches y sont), là dès le Nord
 * allumé. Son étoile quand une tâche faite attend qu'on prenne ce qu'elle rapporte ; au survol, « 2 tâches en cours » ; au
 * clic, le livre blanc s'ouvre sur les tâches (`onOpen`).
 */
export const taskToken = (state: GameState, onOpen: () => void): Pick<BookMedalSpec, 'label' | 'onOpen'> => ({
  label: () => {
    const running = dailyRunning(state);
    if (running === 0) return t('whiteBook.tasks.allDoneShort');
    return running === 1 ? t('whiteBook.tasks.runningOne') : t('whiteBook.tasks.running').replace('{n}', writeDigits(String(running)));
  },
  onOpen,
});
