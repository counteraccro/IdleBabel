import type { GameState } from '../core/state';
import type { LoreId } from '../data/lore';

type LoreListener = () => void;
const listeners = new Set<LoreListener>();

/** Prévient quand un moment de lore attend d'être raconté. Renvoie de quoi se désabonner. */
export const onLore = (listener: LoreListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Ce moment a déjà été déclenché (lu, ou en attente de l'être). */
export const loreTold = (state: GameState, id: LoreId): boolean => state.loreSeen.includes(id) || state.lorePending.includes(id);

/** Déclenche un moment de lore : il attend son tour (sauvegardé), une seule fois par partie. */
export const tellLore = (state: GameState, id: LoreId): void => {
  if (loreTold(state, id)) return;
  state.lorePending.push(id);
  listeners.forEach((listener) => listener());
};

/** Le joueur a lu ce moment : il ne reviendra plus. */
export const loreRead = (state: GameState, id: string): void => {
  state.lorePending = state.lorePending.filter((pending) => pending !== id);
  if (!state.loreSeen.includes(id)) state.loreSeen.push(id);
};

/** Débogage : raconter de nouveau un moment déjà lu. */
export const replayLore = (state: GameState, id: LoreId): void => {
  state.loreSeen = state.loreSeen.filter((seen) => seen !== id);
  tellLore(state, id);
};
