import type { GameState } from '../core/state';
import { SEALS, type PlateId, type SealDef } from '../data/seals';
import { SEAL_FIND_BONUS } from '../data/knowledge';
import { seeded, hashText } from '../core/random';
import { LETTERS } from './babelText';

type SealListener = (ids: string[]) => void;
const listeners = new Set<SealListener>();

/** Prévient quand des sceaux viennent d'être apposés (pour les annoncer). Renvoie de quoi se désabonner. */
export const onSealed = (listener: SealListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Annonce des sceaux (vision à droite de l'écran) sans rien changer à la partie : sert au débogage. */
export const announceSeals = (ids: string[]): void => listeners.forEach((listener) => listener(ids));

/** Débogage : appose d'un coup tous les sceaux pas encore obtenus. */
export const sealAll = (state: GameState, now = Date.now()): void => {
  const sealed = SEALS.filter((seal) => !(seal.id in state.seals)).map((seal) => seal.id);
  for (const id of sealed) state.seals[id] = now;
  state.newSeals.push(...sealed);
  if (sealed.length) announceSeals(sealed);
};

/** Appelé à chaque tick : scelle ce qui vient d'être atteint (avec sa date), et l'annonce. */
export const checkSeals = (state: GameState, now = Date.now()): void => {
  const sealed: string[] = [];
  for (const seal of SEALS) {
    if (!(seal.id in state.seals) && seal.reached(state)) {
      state.seals[seal.id] = now;
      state.newSeals.push(seal.id);
      sealed.push(seal.id);
    }
  }
  if (sealed.length) announceSeals(sealed);
};

/** Un secret qui tient à un geste (voir `secret` dans data/seals.ts) : scellé et annoncé, une seule fois. */
export const sealEvent = (state: GameState, id: string, now = Date.now()): void => {
  if (id in state.seals || !SEALS.some((seal) => seal.id === id)) return;
  state.seals[id] = now;
  state.newSeals.push(id);
  announceSeals([id]);
};

/** Le joueur a vu ces sceaux dans le livre étrange. */
export const markSealsSeen = (state: GameState, ids: readonly string[]): void => {
  if (ids.some((id) => state.newSeals.includes(id))) state.newSeals = state.newSeals.filter((id) => !ids.includes(id));
};

export const sealObtained = (state: GameState, seal: SealDef): boolean => seal.id in state.seals;

export const plateSeals = (plate: PlateId): SealDef[] => SEALS.filter((seal) => seal.plate === plate);

/** Sceaux obtenus sur une liste. */
export const countObtained = (state: GameState, seals: readonly SealDef[]): number =>
  seals.filter((seal) => sealObtained(state, seal)).length;

/** Part des sceaux obtenus, de 0 à 1. */
export const completion = (state: GameState): number => countObtained(state, SEALS) / SEALS.length;

/** Texte en symboles de Babel tiré de l'identifiant (toujours le même) : un nom de 2 ou 3 mots, ou plus. */
export const babelName = (id: string, minWords = 2): string => {
  const random = seeded(hashText(id));
  const words = minWords + Math.floor(random() * 2);
  return Array.from({ length: words }, () => {
    const size = 3 + Math.floor(random() * 5);
    return Array.from({ length: size }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');
  }).join(' ');
};

/** Les sceaux obtenus : chacun ajoute 1 % à la chance de trouvaille (×1,5 avec 50 sceaux). */
export const sealFindMultiplier = (state: GameState): number => 1 + SEAL_FIND_BONUS * countObtained(state, SEALS);
