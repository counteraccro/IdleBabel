import { startLoading } from './registry';
import { readJsonMod } from './jsonMod';
import type { GameState } from '../core/state';

/** Ce que le cahier sait d'une adresse : en train de charger, chargée, ou introuvable (erreur, fichier absent). */
export type ModStatus = 'loading' | 'loaded' | 'missing';
const statuses = new Map<string, ModStatus>();

export const modStatus = (entry: string): ModStatus => statuses.get(entry) ?? 'loading';

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

/** Au lancement : les mods de la partie, un à un, dans l'ordre. */
export const loadSavedMods = async (state: GameState): Promise<void> => {
  for (const entry of [...state.mods]) await loadMod(state, entry);
};

/** Retirer un mod : la page se recharge sans lui (un mod .js ne se défait pas à chaud, validé le 14/10). */
export const removeMod = (state: GameState, entry: string): void => {
  state.mods = state.mods.filter((other) => other !== entry);
};
