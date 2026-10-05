import type { GameState } from './state';

/**
 * Méthodes retirées de l'Âge Manuel (décision de l'auteur, 05/10/2026 : cinq méthodes par Âge). Une
 * partie qui les avait les perd au chargement, avec leur phrase, leur intuition, son sceau et son moment.
 */
const REMOVED = ['thumb', 'wide', 'double', 'mirror'];

const removedTech = (id: string): boolean => REMOVED.some((tool) => id === `${tool}Gesture`);
const removedSeal = (id: string): boolean => REMOVED.some((tool) => id === `intuition-${tool}Gesture`);

const without = <T>(record: Record<string, T>, drop: (key: string) => boolean): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !drop(key)));

export const dropRemovedMethods = (state: GameState): GameState => ({
  ...state,
  tools: without(state.tools, (id) => REMOVED.includes(id)) as GameState['tools'],
  methodPages: without(state.methodPages, (id) => REMOVED.includes(id)),
  technologies: without(state.technologies, removedTech) as GameState['technologies'],
  technologiesBest: without(state.technologiesBest, removedTech) as GameState['technologiesBest'],
  written: without(state.written, (id) => REMOVED.includes(id)),
  finds: state.finds.filter((find) => !REMOVED.includes(find.sentence)),
  seals: without(state.seals, removedSeal),
  newSeals: state.newSeals.filter((id) => !removedSeal(id)),
  history: state.history.filter((entry) => !(entry.type === 'firstTool' && REMOVED.includes(entry.detail ?? ''))),
});
