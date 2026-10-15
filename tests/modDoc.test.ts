import { describe, expect, it, vi } from 'vitest';
import doc from '../public/mods/index.html?raw';
import { HOOK_NAMES } from '../src/mods/hooks';
import { mountModApi } from '../src/mods/api';
import { createInitialState } from '../src/core/state';

vi.stubGlobal('window', new EventTarget());

/** La documentation des mods (public/mods/index.html) ne prend pas de retard sur le code (plan des mods, 14/10). */
describe('la documentation des mods', () => {
  it('a une ligne pour chaque crochet, en français et en anglais', () => {
    for (const hook of HOOK_NAMES) expect(doc.split(`data-hook="${hook}"`).length - 1, hook).toBe(2);
  });

  it('dit chaque fonction de window.IdleBabel, dans les deux langues', () => {
    const [fr, en] = doc.split('<article lang="en"');
    for (const name of Object.keys(mountModApi(createInitialState('fr')))) {
      expect(fr, name).toContain(`<code>${name}`);
      expect(en, name).toContain(`<code>${name}`);
    }
  });
});
