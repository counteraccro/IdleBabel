import type { ModText } from './modSeals';

/** Une ligne du registre (public/mods/mods.json) : un mod de la liste, servi par le jeu (plan des mods, §8). */
export interface CatalogMod {
  id: string;
  name: ModText;
  description: ModText;
  author: string;
  version: string;
  /** Son fichier, dans public/mods/<id>/. */
  file: string;
  kind: 'js' | 'json';
}

let catalog: CatalogMod[] = [];

/** Ce que la partie garde d'un mod de la liste (state.mods) : son chemin dans le jeu. */
export const catalogEntry = (mod: CatalogMod): string => `mods/${mod.id}/${mod.file}`;

export const catalogMods = (): readonly CatalogMod[] => catalog;

/** Lu une fois au lancement : sans registre (hors ligne), la liste est vide, les adresses marchent toujours. */
export const loadCatalog = async (): Promise<void> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}mods/mods.json`);
    if (response.ok) catalog = ((await response.json()) as { mods: CatalogMod[] }).mods;
  } catch {
    catalog = [];
  }
};
