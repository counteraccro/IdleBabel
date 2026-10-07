import { messages, t } from '../../i18n';
import { TECHNOLOGIES, type TechnologyId } from '../../data/technologies';
import { bestOf, levelOf, maxLevel, technology } from '../../systems/technologies';
import { AUTOMATIC_AGE, TOOLS } from '../../data/tools';
import { nextRemembered, remember, reminiscenceKnown, reminiscing } from '../../systems/reminiscence';
import { ageTitle, format, type DebugSubject } from './subject';
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

/** Une intuition au maximum (sans fin : niveau 10). */
const toMax = (state: GameState, id: TechnologyId): void => setLevel(state, id, maxLevel(id) === Infinity ? 10 : maxLevel(id));

/** Toutes les intuitions au maximum. */
export const maxIntuitions = (state: GameState): void => TECHNOLOGIES.forEach((tech) => toMax(state, tech.id));

/** L'Âge d'une intuition : celui de sa méthode ; les autres sont de l'Âge Manuel. */
const ageOfIntuition = (id: TechnologyId): string => ageTitle(TOOLS.find((tool) => tool.id === technology(id).tool)?.age);

/** Une fiche par Âge : le niveau de chacune de ses intuitions, et le meilleur atteint. */
const ageSubject = (id: string, age: string): DebugSubject => {
  const techs = TECHNOLOGIES.filter((tech) => ageOfIntuition(tech.id) === age);
  return {
    id,
    chapter: 'intuitions',
    name: `Les intuitions de ${age.replace(/^L’/, 'l’')}`,
    description: 'Le niveau de chacune, et le meilleur atteint.',
    age,
    peek: (state) => `${techs.filter((tech) => levelOf(state, tech.id) >= Math.min(maxLevel(tech.id), 10)).length}/${techs.length} au max.`,
    build: (kit, state) => {
      for (const tech of techs)
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
        ['Tout au maximum', () => techs.forEach((tech) => toMax(state, tech.id)), { title: 'Les intuitions sans fin : niveau 10.' }],
        [
          'Tout effacer',
          () =>
            techs.forEach((tech) => {
              delete state.technologies[tech.id];
              delete state.technologiesBest[tech.id];
            }),
          { danger: true, title: 'Niveaux et meilleurs niveaux à zéro.' },
        ],
      );
    },
  };
};

const MANUAL = ageTitle(undefined);

/** Les intuitions (partie II du livre blanc), Âge par Âge, et la Réminiscence, qui les rachète après le prestige. */
export const INTUITION_SUBJECTS: DebugSubject[] = [
  ageSubject('intuitions', MANUAL),
  {
    id: 'reminiscence',
    chapter: 'intuitions',
    age: MANUAL,
    name: 'La Réminiscence',
    description: 'Intuition permanente, après le premier prestige : les intuitions reviennent seules jusqu’à leur meilleur niveau.',
    peek: (state) => (!reminiscenceKnown(state) ? 'pas comprise' : reminiscing(state) ? 'active' : 'laissée de côté'),
    build: (kit, state) => {
      kit.check(
        'Comprise',
        'L’intuition permanente (10 000 🧠, après le premier prestige). Comprise : la note au crayon apparaît sur la page de titre des intuitions.',
        () => reminiscenceKnown(state),
        (on) => setLevel(state, 'reminiscence', on ? 1 : 0),
      );
      kit.info('Prestiges faits', () => String(state.exiles));
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
      kit.actions([
        'Se souvenir',
        () => remember(state),
        { title: 'Rachète tout de suite ce qui peut l’être (sinon : au prochain tour de boucle).' },
      ]);
    },
  },
  ageSubject('intuitions:auto', ageTitle(AUTOMATIC_AGE)),
];
