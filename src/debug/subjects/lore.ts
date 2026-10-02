import { t } from '../../i18n';
import { LORE, type LoreId } from '../../data/lore';
import { replayLore } from '../../systems/lore';
import { el } from '../../ui/dom';
import { refreshLibrary, rewriteBigBook } from '../refresh';
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

/** Le nom que le joueur s'est donné au réveil : les récits, l'annuaire, le carnet, le livre de la fin. */
const PLAYER_SUBJECT: DebugSubject = {
  id: 'lore:playerName',
  chapter: 'lore',
  name: 'Le nom du joueur',
  description: 'Celui qu’il a donné au réveil.',
  peek: (state) => state.playerName || '—',
  build: (kit, state) => {
    const input = el('input', 'debug-field');
    input.addEventListener('change', () => {
      state.playerName = input.value.trim();
      // Le livre de la fin le porte sur sa couverture et le raconte.
      refreshLibrary();
      rewriteBigBook();
    });
    kit.row('Nom', input, 'Vide : il sera redemandé au prochain réveil.');
    kit.info('Nom actuel', () => {
      if (document.activeElement !== input) input.value = state.playerName;
      return state.playerName || '—';
    });
  },
};

/** Une fiche par moment de lore : lu ou non, le raconter de nouveau, l'oublier. */
export const LORE_SUBJECTS: DebugSubject[] = [
  PLAYER_SUBJECT,
  ...LORE.map((id): DebugSubject => ({
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
  })),
];
