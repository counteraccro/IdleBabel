import { describe, expect, it } from 'vitest';
import type { CatalogMod } from '../src/mods/catalog';
import registry from '../public/mods/mods.json';

const catalog = registry.mods as CatalogMod[];
/** Les fichiers des mods, par leur chemin (« ../public/mods/<id>/<fichier> »), en texte. */
const files = import.meta.glob<string>('../public/mods/*/*', { query: '?raw', import: 'default', eager: true });
const file = (mod: CatalogMod): string | undefined => files[`../public/mods/${mod.id}/${mod.file}`];

/** Ce qu'un mod de la liste ne fait pas (plan des mods, §8) : un garde-fou, pas une garantie, l'auteur relit tout. */
const FORBIDDEN = ['fetch', 'XMLHttpRequest', 'import(', '<script', 'WebSocket', 'sendBeacon'];

describe('la liste des mods (public/mods/mods.json)', () => {
  it('a des noms uniques, chacun avec son fichier, ses textes en français et en anglais', () => {
    expect(new Set(catalog.map((mod) => mod.id)).size).toBe(catalog.length);
    for (const mod of catalog) {
      expect(mod.id).toMatch(/^[a-z0-9-]+$/);
      expect(file(mod)).toBeDefined();
      // Son README court, pour la relecture (CONTRIBUTING.md).
      expect(files[`../public/mods/${mod.id}/README.md`]).toBeDefined();
      expect(mod.file.endsWith(`.${mod.kind}`)).toBe(true);
      for (const text of [mod.name, mod.description]) {
        expect(typeof text === 'object' && text.fr && text.en).toBeTruthy();
      }
      expect(mod.author && mod.version).toBeTruthy();
    }
  });

  it('ne va pas sur le réseau ni ne charge d’autre code', () => {
    for (const mod of catalog.filter((candidate) => candidate.kind === 'js')) {
      const code = file(mod)!;
      for (const word of FORBIDDEN) expect(code.includes(word), `${mod.id} : ${word}`).toBe(false);
      // Il s'enregistre sous son nom.
      expect(code).toContain(`registerMod('${mod.id}'`);
    }
  });

  it('a des mods en données lisibles, au nom de leur ligne', () => {
    for (const mod of catalog.filter((candidate) => candidate.kind === 'json')) {
      const data = JSON.parse(file(mod)!) as { id: string };
      expect(data.id).toBe(mod.id);
    }
  });
});
