import { describe, expect, it } from 'vitest';
import { newVersion } from '../src/systems/newVersion';
import { LOCALES } from '../src/i18n/locales';

describe('nouvelle version', () => {
  it('signale une version en ligne différente de celle qui tourne', () => {
    expect(newVersion({ build: '2026-10-11T08:00:00.000Z', name: 'Alpha 1.3' }, '2026-10-09T20:00:00.000Z')).toEqual({
      build: '2026-10-11T08:00:00.000Z',
      name: 'Alpha 1.3',
    });
  });

  it('ne dit rien pour la même version, ni pour un fichier illisible', () => {
    expect(newVersion({ build: 'a', name: 'Alpha 1.2' }, 'a')).toBeNull();
    for (const bad of [null, undefined, '<!doctype html>', 42, {}, { build: 'b' }, { build: 3, name: 'x' }])
      expect(newVersion(bad, 'a')).toBeNull();
  });

  it('a sa fenêtre dans chaque langue', () => {
    for (const messages of Object.values(LOCALES)) {
      const update = messages.ui.update;
      expect(update.title).toBeTruthy();
      expect(update.text.length).toBe(2);
      expect(update.text[0]).toContain('{name}');
      expect(update.reload && update.later).toBeTruthy();
    }
  });
});
