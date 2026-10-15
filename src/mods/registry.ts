import type { GameState } from '../core/state';

/** Un mod, tel que `IdleBabel.registerMod` le reçoit (comme Game.registerMod de Cookie Clicker). */
export interface ModDef {
  /** Sa version (« 1.0.0 ») : montrée au cahier, à côté de son nom. */
  version?: string;
  /** Une fois, au chargement du mod : il y pose ses crochets. */
  init?: () => void;
  /** À chaque sauvegarde : une chaîne, gardée dans la sauvegarde du jeu (export compris). */
  save?: () => string;
  /** Après `init`, avec ce que `save()` avait rendu la dernière fois (s'il a déjà été sauvegardé). */
  load?: (text: string) => void;
}

const mods = new Map<string, ModDef>();

/** L'adresse du mod en train de se charger (src/mods/loader.ts) : son nom s'y rattache, pour le cahier. */
let loading: string | null = null;
const names = new Map<string, string>();
const versions = new Map<string, string>();

export const startLoading = (address: string | null): void => {
  loading = address;
};

/** Le nom qu'a pris le mod chargé depuis cette adresse (celui de registerMod), s'il en a pris un. */
export const modName = (address: string): string | undefined => names.get(address);

/** La version qu'a dite le mod chargé depuis cette adresse (registerMod, ou le champ `version` d'un mod .json). */
export const modVersion = (address: string): string | undefined => versions.get(address);

const guard = (id: string, what: string, run: () => void): void => {
  try {
    run();
  } catch (error) {
    console.error(`[Idle Babel] mod « ${id} », ${what} :`, error);
  }
};

/** Enregistre un mod : son `init`, puis son `load` avec ce qu'il avait sauvegardé. Un nom déjà pris est refusé. */
export const registerMod = (state: GameState, id: string, mod: ModDef): boolean => {
  if (typeof id !== 'string' || !id || mods.has(id)) {
    console.error(`[Idle Babel] mod « ${String(id)} » : nom vide ou déjà pris, il n'est pas chargé.`);
    return false;
  }
  mods.set(id, mod);
  if (loading) names.set(loading, id);
  if (loading && typeof mod.version === 'string' && mod.version) versions.set(loading, mod.version);
  if (mod.init) guard(id, 'init', mod.init);
  const saved = state.modData[id];
  if (saved !== undefined && mod.load) guard(id, 'load', () => mod.load!(saved));
  return true;
};

/** Ce que chaque mod veut garder : rangé dans la partie juste avant qu'elle soit écrite (core/save.ts). */
export const collectModData = (state: GameState): void => {
  for (const [id, mod] of mods) {
    if (!mod.save) continue;
    guard(id, 'save', () => {
      const text = mod.save!();
      if (typeof text === 'string') state.modData[id] = text;
    });
  }
};

/** Tests : plus aucun mod. */
export const clearMods = (): void => {
  mods.clear();
  names.clear();
  versions.clear();
  loading = null;
};
