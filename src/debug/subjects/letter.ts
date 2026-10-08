import { t } from '../../i18n';
import { BOON_IDS } from '../../data/letter';
import { activeBoons, forgetBoons } from '../../systems/boons';
import { callLetter, forceBoon, letterCountdown, letterStays, letterWait } from '../../systems/letter';
import { chips } from '../debugControls';
import type { DebugSubject } from './subject';

const minutes = (seconds: number): string => `${Math.floor(seconds / 60)} min ${String(Math.round(seconds % 60)).padStart(2, '0')}`;

/** La lettre qui s'échappe (systems/letter.ts) : la faire venir, choisir ce qu'elle donne, ses bonus en cours. */
export const LETTER_SUBJECT: DebugSubject = {
  id: 'resources:letter',
  chapter: 'resources',
  name: 'La lettre qui s’échappe',
  description: 'La faire venir (ou le mot BABEL), choisir son bonus, voir ceux en cours.',
  peek: (state) => `${state.letters} attrapée(s)`,
  build: (kit, state) => {
    kit.row(
      'Faire venir',
      chips([
        ['La lettre', () => callLetter('letter')],
        ['Le mot BABEL', () => callLetter('word')],
      ]),
      'À l’écran du jeu, au prochain tick.',
    );
    kit.row(
      'Elle donnera',
      chips([
        ['Au hasard', () => forceBoon(undefined)],
        ...BOON_IDS.map((id): [string, () => void] => [t(`ui.letter.boons.${id}.name`), () => forceBoon(id)]),
      ]),
      'Pour toutes les lettres suivantes, jusqu’à « Au hasard ».',
    );
    kit.number(
      'Lettres attrapées',
      () => state.letters,
      (value) => (state.letters = value),
      { steps: true },
    );
    kit.info('Prochaine dans', () => {
      const left = letterCountdown();
      return left === undefined ? 'pas encore tirée' : minutes(Math.max(0, left));
    });
    kit.info('Attente', () => {
      const wait = letterWait(state);
      return `${minutes(wait.min)} à ${minutes(wait.max)}`;
    });
    kit.info('À l’écran', () => `${letterStays(state)} s`);
    kit.info(
      'En cours',
      () =>
        activeBoons()
          .map((boon) => `${t(`ui.letter.boons.${boon.id}.name`)} ${Math.ceil(boon.left / 1000)} s`)
          .join(', ') || '—',
    );
    kit.actions(['Éteindre les bonus', forgetBoons]);
  },
};
