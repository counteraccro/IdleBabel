import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { gainFind } from '../src/systems/knowledge';

describe('trouvailles comptées', () => {
  it('compte chaque trouvaille par sorte, sans que la sauvegarde grossisse', () => {
    const state = createInitialState('fr');
    const size = JSON.stringify(state).length;
    for (let index = 0; index < 10_000; index++) gainFind(state, { kind: 'word', sentence: 'diagonal', segment: 0, duplicate: true });
    gainFind(state, { kind: 'sentence', sentence: 'diagonal', duplicate: true });
    expect(state.findCounts).toEqual({ word: 10_000, piece: 0, sentence: 1 });
    expect(state.stats.fragments).toBe(10_001);
    expect(JSON.stringify(state).length - size).toBeLessThan(200);
  });
});
