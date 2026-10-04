import { messages, t } from '../../i18n';
import { TECHNOLOGIES, type TechnologyId } from '../../data/technologies';
import { bestOf, levelOf, maxLevel, technologiesCompletion, technology } from '../../systems/technologies';
import { forgetIntuitions, nextRemembered, remember, reminiscing } from '../../systems/reminiscence';
import { format, type DebugSubject } from './subject';
import type { GameState } from '../../core/state';

/** Nom d'une intuition (celle d'une méthode : le nom de la méthode). */
const nameOf = (id: TechnologyId): string => {
  const tool = technology(id).tool;
  if (tool) return t(`tools.${tool}.name`);
  return (messages().whiteBook.intuitions as unknown as Record<string, { name: string }>)[id].name;
};

/** Écrit un niveau, et le meilleur s'il le dépasse. */
const setLevel = (state: GameState, id: TechnologyId, value: number): void => {
  const level = Math.max(0, Math.min(maxLevel(id), Math.round(value)));
  state.technologies[id] = level;
  state.technologiesBest[id] = Math.max(bestOf(state, id), level);
};

/** Les intuitions (partie II du livre blanc) et la Réminiscence, qui les rachète après l'Exil. */
export const INTUITION_SUBJECTS: DebugSubject[] = [
  {
    id: 'intuitions',
    chapter: 'intuitions',
    name: 'Les intuitions',
    description: 'Le niveau de chacune, et le meilleur atteint.',
    peek: (state) => `${format(technologiesCompletion(state) * 100)} %`,
    build: (kit, state) => {
      for (const tech of TECHNOLOGIES)
        kit.number(
          nameOf(tech.id),
          () => levelOf(state, tech.id),
          (v) => setLevel(state, tech.id, v),
          {
            hint: `Meilleur niveau : ${bestOf(state, tech.id)}. Les boutons changent le niveau sans rien dépenser.`,
            steps: true,
          },
        );
      kit.actions(
        [
          'Tout au maximum',
          () => TECHNOLOGIES.forEach((tech) => setLevel(state, tech.id, maxLevel(tech.id) === Infinity ? 10 : maxLevel(tech.id))),
          { title: 'Les intuitions sans fin : niveau 10.' },
        ],
        [
          'Tout effacer',
          () => {
            state.technologies = {};
            state.technologiesBest = {};
          },
          { danger: true, title: 'Niveaux et meilleurs niveaux à zéro.' },
        ],
      );
    },
  },
  {
    id: 'reminiscence',
    chapter: 'intuitions',
    name: 'La Réminiscence',
    description: 'Après l’Exil, les intuitions reviennent seules jusqu’à leur meilleur niveau.',
    peek: (state) => (!state.reminiscence.known ? 'pas obtenue' : reminiscing(state) ? 'active' : 'laissée de côté'),
    build: (kit, state) => {
      kit.check(
        'Obtenue',
        'La mutation d’Épiphanie (à venir avec l’Exil). Obtenue : la note au crayon apparaît sur la page de titre des intuitions.',
        () => state.reminiscence.known,
        (on) => (state.reminiscence.known = on),
      );
      kit.check(
        'Laissée faire',
        'La note au crayon : cochée, les intuitions reviennent seules.',
        () => state.reminiscence.on,
        (on) => (state.reminiscence.on = on),
      );
      kit.info('À retrouver', () => {
        const left = TECHNOLOGIES.filter((tech) => levelOf(state, tech.id) < bestOf(state, tech.id)).length;
        const price = nextRemembered(state);
        return left === 0 ? 'rien' : `${left} intuition(s)${price === undefined ? '' : ` · prochaine : ${format(price)} 🧠`}`;
      });
      kit.actions(
        ['Oublier, comme à l’Exil', () => forgetIntuitions(state), { title: 'Niveaux à zéro, meilleurs niveaux gardés.' }],
        ['Se souvenir', () => remember(state), { title: 'Rachète tout de suite ce qui peut l’être (sinon : au prochain tour de boucle).' }],
      );
    },
  },
];
