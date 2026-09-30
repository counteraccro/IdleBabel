import { t } from '../../i18n';
import { LORE, type LoreId } from '../../data/lore';
import { replayLore } from '../../systems/lore';
import type { DebugSubject } from './subject';

/** Où chaque moment se déclenche, pour s'y retrouver dans le livre. */
const TRIGGERS: Record<LoreId, string> = {
  lookAround: 'au réveil, juste après l’accueil',
  whiteBook: 'à la première ouverture du livre blanc',
  firstBook: 'en sortant du livre blanc la première fois',
  firstKnowledge: 'à la toute première trouvaille lue',
};

/** Une fiche par moment de lore : lu ou non, le raconter de nouveau, l'oublier. */
export const LORE_SUBJECTS: DebugSubject[] = LORE.map((id) => ({
  id: `lore:${id}`,
  chapter: 'lore',
  name: () => t(`lore.${id}.title`),
  description: `Se raconte ${TRIGGERS[id]}.`,
  build: (kit, state) => {
    kit.info('Déclenché', () => TRIGGERS[id]);
    kit.info('État', () => {
      if (state.loreSeen.includes(id)) return 'lu';
      return state.lorePending.includes(id) ? 'en attente d’être lu' : 'pas encore arrivé';
    });
    kit.buttons(
      '',
      [
        ['Raconter à nouveau', () => replayLore(state, id)],
        [
          'Oublier',
          () => {
            state.loreSeen = state.loreSeen.filter((seen) => seen !== id);
            state.lorePending = state.lorePending.filter((pending) => pending !== id);
          },
        ],
      ],
      'oublier : il se racontera de nouveau à son déclencheur',
    );
  },
}));
