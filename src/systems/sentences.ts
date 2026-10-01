import { messages } from '../i18n';
import { SENTENCES } from '../data/sentences';
import { GUESS_PRICE, type FindKind } from '../data/knowledge';
import { withReaderName } from './readerName';
import type { ToolId } from '../data/tools';
import type { GameState } from '../core/state';

/** Les phrases du livre blanc, et ce qui en est écrit. */

/** Morceaux d'une phrase, dans la langue courante (avec le nom du joueur, voir readerName.ts). */
export const segments = (id: string): string[] => {
  const text = (messages().whiteBook.sentences as Record<string, string>)[id] ?? '';
  return withReaderName(text)
    .split('/')
    .map((segment) => segment.trim());
};

/** Auteur ou référence d'une citation célèbre (whiteBook.sources), montré une fois la phrase complète. */
export const sentenceSource = (id: string): string | undefined => (messages().whiteBook.sources as Record<string, string>)[id];

/** Un ou deux mots (avec l'article) : un mot ; au-delà, un morceau de phrase. */
export const segmentKind = (text: string): Exclude<FindKind, 'sentence'> => (text.split(' ').length <= 2 ? 'word' : 'piece');

/** Morceaux déjà écrits dans le livre blanc. */
export const written = (state: GameState, id: string): number[] => state.written[id] ?? [];

export const missing = (state: GameState, id: string): number[] => {
  const done = written(state, id);
  return segments(id)
    .map((_, index) => index)
    .filter((index) => !done.includes(index));
};

export const isComplete = (state: GameState, id: string): boolean => missing(state, id).length === 0;

/** Écrit des morceaux dans le livre blanc (pour toujours, Exil compris). */
export const write = (state: GameState, id: string, indices: number[]): void => {
  const done = new Set(written(state, id));
  for (const index of indices) done.add(index);
  state.written[id] = [...done].sort((a, b) => a - b);
};

/** La phrase de méthode en cours : la première qui n'est pas complète. */
export const currentTarget = (state: GameState): string | undefined =>
  SENTENCES.find((sentence) => sentence.kind === 'method' && !isComplete(state, sentence.id))?.id;

/** Une méthode de lecture se découvre en complétant sa phrase. */
export const toolUnlocked = (state: GameState, tool: ToolId): boolean => {
  const sentence = SENTENCES.find((candidate) => candidate.tool === tool);
  return !sentence || isComplete(state, sentence.id);
};

/** Part du livre blanc déjà écrite : morceaux écrits sur l'ensemble des morceaux de toutes les phrases. */
export const completion = (state: GameState): number => {
  const total = SENTENCES.reduce((sum, sentence) => sum + segments(sentence.id).length, 0);
  const done = SENTENCES.reduce((sum, sentence) => sum + written(state, sentence.id).length, 0);
  return total === 0 ? 0 : done / total;
};

/** Il ne manque qu'un morceau : la Connaissance peut le deviner (pas pour une anomalie : elles se collectionnent en lisant). */
export const guessPrice = (state: GameState, id: string): number | undefined =>
  missing(state, id).length === 1 && SENTENCES.find((sentence) => sentence.id === id)?.kind !== 'anomaly' ? GUESS_PRICE : undefined;

export const guess = (state: GameState, id: string): boolean => {
  const price = guessPrice(state, id);
  if (price === undefined || state.knowledge < price) return false;
  state.knowledge -= price;
  write(state, id, missing(state, id));
  return true;
};
