import { MIMIC_SPOTS } from '../../data/mimic';
import { S } from '../../data/etheriumStars';
import { callMimic, catchMimic, mimicEvery, mimicHere, mimicSeconds, spawnMimic } from '../../systems/mimic';
import { mimicUnlocked } from '../../systems/etherium';
import { placeMimic } from '../../ui/mimic/mimic';
import { setMimicSize } from '../../ui/mimic/mimicBook';
import { chips } from '../debugControls';
import { duration, format, type DebugSubject } from './subject';

/** Les places de chaque salle, comme dans la maquette (data/mimic.ts). */
const SPOT_NAMES: Record<string, string[]> = {
  desert: ['Parquet, à gauche', 'Banc de gauche', 'Banc de droite', 'Coin du tapis', 'Contre les rayons'],
  nuit: ['Parquet, à gauche', 'Pied des rayons de droite', 'Parquet, à droite', 'Contre les rayons de gauche'],
  verriere: ['Parquet, pied du pilier de gauche', 'Rayons du fond, à gauche', 'Rayons du fond, à droite'],
  'jour-nuit': ['Parquet, devant à gauche', 'Parquet, à droite', 'Contre les rayons de droite', 'Rayons, près de l’échelle'],
};

/** Le nom court de chaque salle. */
const ROOM_NAMES: Record<string, string> = { desert: 'Désert', nuit: 'Nuit', verriere: 'Verrière', 'jour-nuit': 'Jour-nuit' };

/** La Mimic (systems/mimic.ts) : la faire venir, la poser à chaque place, régler sa taille, ses comptes. */
export const MIMIC_SUBJECT: DebugSubject = {
  id: 'resources:mimic',
  chapter: 'resources',
  name: 'La Mimic',
  description: 'La faire venir, la poser à chaque place (ou au bord de l’écran), régler sa taille.',
  peek: (state) => (mimicHere(state) ? `là, ${format(state.mimic.eaten)} avalées` : `${state.mimic.caught} attrapée(s)`),
  build: (kit, state) => {
    kit.row(
      'Faire venir',
      chips([
        ['Au prochain tick', () => (mimicUnlocked(state) ? callMimic() : spawnMimic(state))],
        ['Une autre reliure', () => spawnMimic(state)],
        ['L’attraper', () => catchMimic(state)],
      ]),
      'À l’écran du jeu. Sans l’Est de l’Exploration, elle vient quand même (pour l’essai).',
    );
    kit.row(
      'La poser',
      chips([
        ['Au hasard', () => placeMimic(null)],
        ['Au bord (sceau)', () => placeMimic('side')],
        ...Object.entries(SPOT_NAMES).flatMap(([scene, names]) =>
          names.map((name, index): [string, () => void] => [`${ROOM_NAMES[scene]} · ${name}`, () => placeMimic(`${scene}:${index}`)]),
        ),
      ]),
      'Une place de l’autre salle ne sert que si ce fond est affiché (Affichage › Le décor). Même cachée par l’interface.',
    );
    kit.presets('Taille', [0.8, 1, 1.2, 1.5], (value) => setMimicSize(value), '1 = un vrai livre (0,22 × 0,275 m).');
    kit.number(
      'Avalées',
      () => state.mimic.eaten,
      (value) => (state.mimic.eaten = value),
    );
    kit.number(
      'Attrapées',
      () => state.mimic.caught,
      (value) => (state.mimic.caught = value),
      { steps: true },
    );
    kit.number(
      'Rendues en plus',
      () => state.mimic.bonus,
      (value) => (state.mimic.bonus = value),
    );
    kit.info('Temps à manger', () => duration(mimicSeconds(state)));
    kit.info('Une toutes les', () => duration(mimicEvery(state)));
    kit.info('Débloquée', () => (mimicUnlocked(state) ? `oui (${S.mimic})` : 'non'));
    kit.info('Places', () =>
      Object.entries(MIMIC_SPOTS)
        .map(([scene, spots]) => `${scene} ${spots.length}`)
        .join(', '),
    );
  },
};
