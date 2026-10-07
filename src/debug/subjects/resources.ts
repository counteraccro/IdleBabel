import { forcePagesPerSecond, isForcingPagesPerSecond, pagesPerSecond } from '../../systems/production';
import { addKnowledge, findChance, forceFinds, isForcingFinds } from '../../systems/knowledge';
import { BASE_FIND_CHANCE } from '../../data/knowledge';
import { rewriteBigBook } from '../refresh';
import { compact, format, type DebugSubject } from './subject';

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

/** Libellés repris du Grand Livre (chapitres Lectures et Révélations), en plus court. */
export const RESOURCE_SUBJECTS: DebugSubject[] = [
  {
    id: 'pages',
    chapter: 'resources',
    name: 'Les pages',
    description: 'En mémoire, traversées, par seconde.',
    peek: (state) => `${compact(state.pages)} · ${compact(pagesPerSecond(state))}/s`,
    build: (kit, state) => {
      kit.number(
        'En mémoire',
        () => state.pages,
        (v) => (state.pages = v),
        { hint: '« Pages dont tu te souviens encore » : celles qu’on dépense.' },
      );
      kit.number(
        'Traversées',
        () => state.totalPagesRead,
        (v) => (state.totalPagesRead = v),
        { hint: '« Pages que tes yeux ont traversées » : dissipent l’obscurité du décor.' },
      );
      kit.presets(
        'Régler les deux',
        PRESETS,
        (value) => {
          state.pages = value;
          state.totalPagesRead = value;
        },
        'Règle les pages en mémoire et les pages traversées d’un coup.',
      );
      kit.number('Par seconde', () => pagesPerSecond(state), forcePagesPerSecond, {
        hint: '« Pages qui passent sous tes yeux à chaque seconde. » Une valeur saisie remplace la production des méthodes (jusqu’au rechargement, ou « Production des méthodes »).',
        decimal: true,
      });
      kit.info('Imposée', () => (isForcingPagesPerSecond() ? 'oui, à la main' : 'non : les méthodes'));
      kit.actions(['Production des méthodes', () => forcePagesPerSecond(undefined), { title: 'Oublie la valeur saisie à la main.' }]);
    },
  },
  {
    id: 'knowledge',
    chapter: 'resources',
    name: 'La Connaissance',
    description: 'Portée, donnée, chance de comprendre à chaque page.',
    peek: (state) => `${compact(state.knowledge)} 🧠`,
    build: (kit, state) => {
      kit.number(
        'Portée',
        () => state.knowledge,
        (v) => (state.knowledge = v),
        {
          hint: '« Connaissance que tu portes » : déchiffre le Grand Livre, devine un morceau. Les + la donnent aussi (paliers compris), sans rien trouver ; les − ne retirent que la portée.',
          steps: true,
          step: (delta) => {
            if (delta > 0) addKnowledge(state, delta);
            else state.knowledge = Math.max(0, state.knowledge + delta);
            rewriteBigBook();
          },
        },
      );
      kit.number(
        'Donnée',
        () => state.lifetimeKnowledge,
        (v) => (state.lifetimeKnowledge = v),
        { hint: '« Connaissance qui t’a été donnée » : ses paliers déchiffrent seuls le Grand Livre.' },
      );
      kit.check(
        'Toujours trouver',
        `Une trouvaille à chaque page, au lieu d’une page sur ${1 / BASE_FIND_CHANCE} (jusqu’au rechargement).`,
        isForcingFinds,
        forceFinds,
      );
      kit.info('Chance', () => `${format(findChance(state) * 100)} %`, '« Ta chance, à chaque page, de comprendre quelque chose. »');
      kit.info('Fragments', () => format(state.finds.length), '« Mots · morceaux · phrases arrachés au hasard. »');
      kit.actions([
        'Tout oublier',
        () => {
          Object.assign(state, { knowledge: 0, cycleKnowledge: 0, lifetimeKnowledge: 0, finds: [], written: {}, deciphered: [] });
          state.stats.fragments = 0;
          rewriteBigBook();
        },
        { danger: true, title: 'Connaissance, trouvailles, livre blanc et déchiffrage' },
      ]);
    },
  },
];
