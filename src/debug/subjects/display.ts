import { forceScene, shownScene } from '../../scene';
import { SCENES } from '../../scene/scenes';
import { beyond } from '../../systems/perception';
import { format, type DebugSubject } from './subject';

const SCENE_NAMES: Record<string, string> = { nuit: 'La salle étoilée', desert: 'L’hexagone au désert', verriere: 'La verrière' };

export const DISPLAY_SUBJECTS: DebugSubject[] = [
  {
    id: 'scene',
    chapter: 'display',
    name: 'Le décor',
    description: 'La salle peinte derrière le livre, un fond par Âge.',
    peek: () => SCENE_NAMES[shownScene()],
    build: (kit, state) => {
      kit.info('Fond affiché', () => SCENE_NAMES[shownScene()]);
      kit.actions(
        // Montré même s'il n'est pas encore vu (le 3e Âge n'existe pas), sans toucher au choix du cahier.
        ...SCENES.map(({ id, age }): [string, () => void] => [`${SCENE_NAMES[id]} (Âge ${age})`, () => forceScene(id)]),
        ['Rendre la main au jeu', () => forceScene(undefined)],
      );
      kit.info('Au-delà', () => format(beyond(state)));
    },
  },
];
