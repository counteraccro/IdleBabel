import { t } from '../../i18n';
import { LORE, type LoreId } from '../../data/lore';
import { replayLore } from '../../systems/lore';
import { refreshLibrary } from '../refresh';
import type { DebugSubject } from './subject';
import type { GameState } from '../../core/state';

/** Où chaque moment se déclenche, pour s'y retrouver dans le livre. */
const TRIGGERS: Record<LoreId, string> = {
  lookAround: 'au réveil, juste après l’accueil',
  whiteBook: 'à la première ouverture du livre blanc',
  firstBook: 'en sortant du livre blanc la première fois',
  firstKnowledge: 'à la toute première trouvaille lue',
  firstBookKept: 'au premier livre refermé (gardé, rangé dans la bibliothèque)',
};

const status = (state: GameState, id: LoreId): string => {
  if (state.loreSeen.includes(id)) return 'lu';
  return state.lorePending.includes(id) ? 'en attente' : 'pas encore arrivé';
};

/** Une fiche par moment de lore : lu ou non, le raconter de nouveau, l'oublier. */
export const LORE_SUBJECTS: DebugSubject[] = LORE.map((id) => ({
  id: `lore:${id}`,
  chapter: 'lore',
  name: () => t(`lore.${id}.title`),
  description: `Se raconte ${TRIGGERS[id]}.`,
  peek: (state) => status(state, id),
  build: (kit, state) => {
    kit.info('Déclenché', () => TRIGGERS[id]);
    kit.info('État', () => status(state, id));
    kit.actions(
      ['Raconter à nouveau', () => replayLore(state, id)],
      [
        'Oublier',
        () => {
          state.loreSeen = state.loreSeen.filter((seen) => seen !== id);
          state.lorePending = state.lorePending.filter((pending) => pending !== id);
          // Le premier livre gardé quitte la vitrine.
          refreshLibrary();
        },
        { danger: true, title: 'Il se racontera de nouveau à son déclencheur' },
      ],
    );
  },
}));
