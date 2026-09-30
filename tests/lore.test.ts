import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { LORE } from '../src/data/lore';
import { loreRead, tellLore } from '../src/systems/lore';
import { drawFind, gainFind } from '../src/systems/knowledge';
import { LOCALES } from '../src/i18n/locales';

describe('lore', () => {
  it('raconte un moment une seule fois, même relancé', () => {
    const state = createInitialState('fr');
    tellLore(state, 'firstKnowledge');
    tellLore(state, 'firstKnowledge');
    expect(state.lorePending).toEqual(['firstKnowledge']);
    loreRead(state, 'firstKnowledge');
    tellLore(state, 'firstKnowledge');
    expect(state.lorePending).toEqual([]);
    expect(state.loreSeen).toEqual(['firstKnowledge']);
  });

  it('se déclenche à la toute première trouvaille, pas aux suivantes', () => {
    const state = createInitialState('fr');
    gainFind(
      state,
      drawFind(state, () => 0.5, true),
    );
    expect(state.lorePending).toEqual(['firstKnowledge']);
    loreRead(state, 'firstKnowledge');
    gainFind(
      state,
      drawFind(state, () => 0.5),
    );
    expect(state.lorePending).toEqual([]);
  });

  it('a un titre et du texte dans chaque langue', () => {
    for (const messages of Object.values(LOCALES)) {
      const lore = messages.lore as unknown as Record<string, { title: string; text: string[] }>;
      for (const id of LORE) {
        expect(lore[id]?.title, id).toBeTruthy();
        expect(lore[id]?.text.length, id).toBeGreaterThan(0);
      }
    }
  });
});
