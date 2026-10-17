import { RELICS, ROOM_RELICS } from '../../data/relics';
import { S } from '../../data/etheriumStars';
import { callRelic, findRelic, relicFound, relicWait, relicWaiting, setRelic, unlockRelicChange } from '../../systems/relics';
import { relicsUnlocked } from '../../systems/etherium';
import { relicScaleNow, setRelicScale } from '../../ui/relics/relicRoom';
import { refreshLibrary } from '../refresh';
import { chips } from '../debugControls';
import { duration, type DebugSubject } from './subject';

const NAMES: Record<string, string> = {
  loupe: 'La Loupe (désert)',
  astrolabe: 'L’Astrolabe (nuit)',
  hourglass: 'Le Sablier (verrière)',
  pencil: 'Le Crayon (tâche 15)',
};

/** Les reliques (systems/relics.ts) : les faire apparaître, les ranger dans la vitrine, remettre le délai à zéro (validé le 11/10). */
export const RELIC_SUBJECT: DebugSubject = {
  id: 'resources:relics',
  chapter: 'resources',
  name: 'Les reliques',
  description: 'Les poser dans leur salle, les ranger dans la vitrine, changer de relique sans attendre.',
  peek: (state) => `${Object.keys(state.relics.found).length} / ${RELICS.length} trouvée(s)`,
  build: (kit, state) => {
    kit.row(
      'Faire apparaître',
      chips(ROOM_RELICS.map((relic): [string, () => void] => [NAMES[relic.id], () => callRelic(relic.id)])),
      'Posée dans sa salle, sans l’Ouest ni sa phrase. Elle ne se voit que si ce fond est affiché (Affichage › Le décor).',
    );
    kit.row(
      'Ranger dans la vitrine',
      chips([
        ...RELICS.map((relic): [string, () => void] => [
          NAMES[relic.id],
          () => {
            findRelic(state, relic.id);
            refreshLibrary();
          },
        ]),
      ]),
      'Comme trouvée (son récit, son sceau). La première agit d’office.',
    );
    kit.row(
      'Celle qui agit',
      chips([
        ...RELICS.map((relic): [string, () => void] => [
          NAMES[relic.id],
          () => {
            unlockRelicChange(state);
            setRelic(state, relic.id);
            refreshLibrary();
          },
        ]),
        ['Remettre le délai à zéro', () => unlockRelicChange(state)],
      ]),
    );
    kit.presets('Taille dans la salle', [0.8, 1, 1.5, 2], (value) => setRelicScale(value), '1 = la vraie taille (loupe 0,27 m).');
    kit.info('Taille', () => String(relicScaleNow()));
    kit.info('Débloquées', () => (relicsUnlocked(state) ? `oui (${S.relics})` : 'non'));
    kit.info('État', () =>
      RELICS.map(
        (relic) => `${relic.id} ${relicFound(state, relic.id) ? 'trouvée' : relicWaiting(state, relic.id) ? 'dans sa salle' : '—'}`,
      ).join(', '),
    );
    kit.info('Agit', () => state.relics.active ?? 'aucune');
    kit.info('Changement possible dans', () => duration(relicWait(state) / 1000));
    kit.info('Changements', () => String(state.relics.changes));
  },
};
