import { METHOD_GATE } from '../data/knowledge';
import {
  HINT_BOOKS,
  HINTS_AFTER_DRAW,
  HINTS_AFTER_FIRST_TOME,
  HINTS_AFTER_LAST_TASK,
  HINTS_AFTER_MIMIC,
  HINTS_AFTER_PRESTIGE,
  HINT_ATELIER,
} from '../data/anomalies';
import { TASK_STAR } from '../data/tasks';
import { mimicUnlocked } from './etherium';
import { tomeFound } from './endings';
import { SENTENCES } from '../data/sentences';
import { METHOD_CHAIN, type ToolId } from '../data/tools';
import { currentTarget } from './sentences';
import { relicHintFindable } from './relics';
import { rule } from '../mods/quantities';
import { atelierLit } from './etherium';
import { ATELIER_ON } from '../data/atelierOn';
import type { GameState } from '../core/state';

/** Exemplaires de la méthode d'avant qu'il faut : METHOD_GATE, ou ce qu'a réglé un mod (`methodGate`). */
export const methodGate = (): number => rule('methodGate', METHOD_GATE);

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
  return state.tools[previous.id] >= methodGate() ? target : undefined;
};

/** La phrase `id` est la méthode en cours, mais elle attend : la méthode d'avant, à METHOD_GATE exemplaires. */
export const waitingFor = (state: GameState, id: string): ToolId | undefined => {
  if (currentTarget(state) !== id || findableTarget(state)) return undefined;
  const tool = SENTENCES.find((sentence) => sentence.id === id)?.tool;
  return METHOD_CHAIN[METHOD_CHAIN.findIndex((candidate) => candidate.id === tool) - 1]?.id;
};

/**
 * Un indice qui mène à un livre rare attend que ce livre soit trouvé (data/anomalies.ts, HINT_BOOKS) ; celui d'un
 * secret de l'Etherium, un premier prestige ; celui de la Mimic dorée, un premier tirage de la Loterie (et celui du tome du gros
 * lot, le tome 1 aussi) ; celui du tome de la Mimic, la Mimic et le tome 1 ; celui de la dernière tâche, son étoile et le tome 1 ; celui d'une relique, l'Ouest de l'Exploration et sa salle déjà vue.
 */
export const hintFindable = (state: GameState, id: string): boolean => {
  if (HINTS_AFTER_PRESTIGE.includes(id) && state.etherReceived === 0) return false;
  if (HINTS_AFTER_DRAW.includes(id) && state.lottery.draws === 0) return false;
  if (HINTS_AFTER_FIRST_TOME.includes(id) && !tomeFound(state, 0)) return false;
  if (HINTS_AFTER_MIMIC.includes(id) && !mimicUnlocked(state)) return false;
  if (HINTS_AFTER_LAST_TASK.includes(id) && !state.etherium.includes(TASK_STAR.last)) return false;
  if (id === HINT_ATELIER && !(ATELIER_ON && atelierLit(state))) return false;
  if (!relicHintFindable(state, id)) return false;
  const books = HINT_BOOKS[id];
  return !books || books.some((book) => book in state.rareBooks);
};
