import { startLoading } from './registry';
import { readJsonMod } from './jsonMod';
import type { GameState } from '../core/state';

/**
 * Ce que le cahier sait d'un mod : en train de charger, chargé, introuvable (erreur, fichier absent), ou désactivé (pas
 * chargé à cette visite).
 */
export type ModStatus = 'loading' | 'loaded' | 'missing' | 'off';
const statuses = new Map<string, ModStatus>();

export const modStatus = (entry: string): ModStatus => statuses.get(entry) ?? 'off';

/** L'adresse à charger : telle quelle si elle est complète, sinon un mod de la liste, servi par le jeu. */
export const modAddress = (entry: string): string => (/^https?:\/\//i.test(entry) ? entry : `${import.meta.env.BASE_URL}${entry}`);

/** Un mod en données (.json) ou en code (.js, le reste). */
const isJson = (address: string): boolean => /\.json(\?|#|$)/i.test(address);

const loadScript = (address: string): Promise<boolean> =>
  new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = address;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.append(script);
  });

const loadJson = async (state: GameState, address: string): Promise<boolean> => {
  try {
    const response = await fetch(address);
    return response.ok && readJsonMod(state, await response.json());
  } catch {
    return false;
  }
};

/**
 * La partie est moddée (plan des mods, §5) : marquée pour toujours au premier mod chargé, même retiré ensuite ; le
 * sceau secret « Triche » suit (data/seals.ts).
 */
const markModded = (state: GameState, now = Date.now()): void => {
  state.modded ??= now;
};

/** Charge un mod, et l'ajoute à ceux de la partie s'il n'y était pas (et s'il charge). Renvoie s'il a pu être chargé. */
export const loadMod = async (state: GameState, entry: string): Promise<boolean> => {
  if (statuses.get(entry) === 'loaded') return true;
  const added = !state.mods.includes(entry);
  if (added) state.mods.push(entry);
  statuses.set(entry, 'loading');
  const address = modAddress(entry);
  startLoading(entry);
  const loaded = isJson(address) ? await loadJson(state, address) : await loadScript(address);
  startLoading(null);
  statuses.set(entry, loaded ? 'loaded' : 'missing');
  if (loaded) markModded(state);
  // Une adresse nouvelle qui ne charge pas n'est pas gardée ; une d'avant reste (hors ligne, elle reviendra).
  else if (added) removeMod(state, entry);
  return loaded;
};

/** Au lancement : les mods de la partie, un à un, dans l'ordre ; pas ceux désactivés. */
export const loadSavedMods = async (state: GameState): Promise<void> => {
  for (const entry of [...state.mods]) if (!state.modsOff.includes(entry)) await loadMod(state, entry);
};

/** Supprimer un mod de la liste : la page se recharge sans lui (un mod .js ne se défait pas à chaud, validé le 14/10). */
export const removeMod = (state: GameState, entry: string): void => {
  state.mods = state.mods.filter((other) => other !== entry);
  state.modsOff = state.modsOff.filter((other) => other !== entry);
};

/** Désactiver un mod (il reste dans la liste, plus chargé), ou le réactiver : la page se recharge aussi. */
export const switchMod = (state: GameState, entry: string, on: boolean): void => {
  state.modsOff = on ? state.modsOff.filter((other) => other !== entry) : [...new Set([...state.modsOff, entry])];
};
