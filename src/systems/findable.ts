import { METHOD_GATE } from '../data/knowledge';
import { HINT_BOOKS, HINTS_AFTER_PRESTIGE } from '../data/anomalies';
import { SENTENCES } from '../data/sentences';
import { METHOD_CHAIN, type ToolId } from '../data/tools';
import { currentTarget } from './sentences';
import type { GameState } from '../core/state';

/**
 * La phrase de méthode en cours, si elle peut déjà se trouver : la méthode d'avant possédée à METHOD_GATE
 * exemplaires (la première, la Lecture Diagonale, toujours ; la première d'un Âge, dès l'Âge acheté). Sinon rien :
 * les trouvailles vont ailleurs.
 */
export const findableTarget = (state: GameState): string | undefined => {
  const target = currentTarget(state);
  const tool = SENTENCES.find((sentence) => sentence.id === target)?.tool;
  const index = METHOD_CHAIN.findIndex((candidate) => candidate.id === tool);
  if (index <= 0) return target;
  const previous = METHOD_CHAIN[index - 1];
  if (previous.age !== METHOD_CHAIN[index].age) return target;
  return state.tools[previous.id] >= METHOD_GATE ? target : undefined;
};

/** La phrase `id` est la méthode en cours, mais elle attend : la méthode d'avant, à METHOD_GATE exemplaires. */
export const waitingFor = (state: GameState, id: string): ToolId | undefined => {
  if (currentTarget(state) !== id || findableTarget(state)) return undefined;
  const tool = SENTENCES.find((sentence) => sentence.id === id)?.tool;
  return METHOD_CHAIN[METHOD_CHAIN.findIndex((candidate) => candidate.id === tool) - 1]?.id;
};

/**
 * Un indice qui mène à un livre rare attend que ce livre soit trouvé (data/anomalies.ts, HINT_BOOKS) ; celui d'un
 * secret de l'Etherium, un premier prestige.
 */
export const hintFindable = (state: GameState, id: string): boolean => {
  if (HINTS_AFTER_PRESTIGE.includes(id) && state.etherReceived === 0) return false;
  const books = HINT_BOOKS[id];
  return !books || books.some((book) => book in state.rareBooks);
};
