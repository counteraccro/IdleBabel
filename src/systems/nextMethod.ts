import { SENTENCES } from '../data/sentences';
import { TOOLS, type ToolId } from '../data/tools';
import { currentTarget, guessPrice, segments, toolUnlocked, written } from './sentences';
import type { GameState } from '../core/state';

/** Achats de la dernière méthode ouverte à partir desquels la suivante s'annonce (l'auteur, 20/10). */
export const ANNOUNCE_AFTER = 25;

/**
 * La méthode qui s'annonce (l'auteur, 20/10 : « on ne comprend pas pourquoi une méthode de lecture apparaît ») : celle
 * dont la phrase s'écrit en ce moment dans le livre blanc, une fois la dernière méthode ouverte avant elle achetée
 * ANNOUNCE_AFTER fois. Jamais une méthode secrète, ni celle d'un Âge pas acheté (currentTarget les écarte), ni la
 * première (rien avant elle : le récit du réveil la fait trouver).
 */
export const announcedTool = (state: GameState): ToolId | undefined => {
  const target = currentTarget(state);
  const tool = SENTENCES.find((sentence) => sentence.id === target)?.tool;
  if (!tool) return undefined;
  const before = TOOLS.slice(
    0,
    TOOLS.findIndex((candidate) => candidate.id === tool),
  ).filter((candidate) => !('secret' in candidate && candidate.secret) && toolUnlocked(state, candidate.id));
  const last = before.at(-1);
  return last && state.tools[last.id] >= ANNOUNCE_AFTER ? tool : undefined;
};

/** Où en est la phrase d'une méthode : ses morceaux écrits, combien il y en a, et si le dernier peut se deviner. */
export const toolPieces = (state: GameState, tool: ToolId): { sentence: string; found: number; total: number; guessable: boolean } => {
  const sentence = SENTENCES.find((candidate) => candidate.tool === tool)!.id;
  return {
    sentence,
    found: written(state, sentence).length,
    total: segments(sentence).length,
    guessable: guessPrice(state, sentence) !== undefined,
  };
};
