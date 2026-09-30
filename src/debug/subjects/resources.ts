import { pagesPerSecond } from '../../systems/production';
import { addKnowledge, findChance, forceFinds, isForcingFinds } from '../../systems/knowledge';
import { rewriteBigBook } from '../refresh';
import { format, type DebugSubject } from './subject';

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

export const RESOURCE_SUBJECTS: DebugSubject[] = [
  {
    id: 'pages',
    chapter: 'resources',
    name: 'Les pages',
    description: 'Le stock à dépenser, les pages lues à vie, la production.',
    build: (kit, state) => {
      kit.number(
        'Stock',
        () => state.pages,
        (v) => (state.pages = v),
        'pages à dépenser',
      );
      kit.number(
        'Lues à vie',
        () => state.totalPagesRead,
        (v) => (state.totalPagesRead = v),
        "dissipent l'obscurité du décor",
      );
      kit.buttons(
        'Régler les deux à',
        PRESETS.map((value) => [
          format(value),
          () => {
            state.pages = value;
            state.totalPagesRead = value;
          },
        ]),
      );
      kit.info('Production', () => `${format(pagesPerSecond(state))} pages/s`);
    },
  },
  {
    id: 'knowledge',
    chapter: 'resources',
    name: 'La Connaissance',
    description: 'À dépenser, trouvée à vie, chance de trouvaille par page.',
    build: (kit, state) => {
      kit.number(
        'À dépenser',
        () => state.knowledge,
        (v) => (state.knowledge = v),
        'déchiffrer le livre étrange, deviner un morceau',
      );
      kit.number(
        'Trouvée à vie',
        () => state.lifetimeKnowledge,
        (v) => (state.lifetimeKnowledge = v),
        'paliers : le livre étrange se déchiffre seul',
      );
      kit.buttons(
        'Ajouter',
        [
          ['+1', () => (addKnowledge(state, 1), rewriteBigBook())],
          ['+10', () => (addKnowledge(state, 10), rewriteBigBook())],
          [
            'Tout oublier',
            () => {
              Object.assign(state, { knowledge: 0, cycleKnowledge: 0, lifetimeKnowledge: 0, finds: [], written: {}, deciphered: [] });
              state.stats.fragments = 0;
              rewriteBigBook();
            },
          ],
        ],
        'ajouter : sans rien trouver ; tout oublier : Connaissance, trouvailles, livre blanc et déchiffrage',
      );
      kit.check('Trouvaille à chaque page', 'au lieu d’une page sur 200', isForcingFinds, forceFinds);
      kit.info('Chance par page', () => `${format(findChance(state) * 100)} %`);
      kit.info('Trouvailles', () => format(state.finds.length));
    },
  },
];
