import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { SEALS } from '../src/data/seals';
import { checkSeals } from '../src/systems/seals';

vi.stubGlobal('window', new EventTarget());

/** Une partie où les `n` premiers sceaux hors planche « Les sceaux » sont déjà apposés. */
const withSeals = (n: number) => {
  const state = createInitialState('fr');
  for (const seal of SEALS.filter((seal) => seal.plate !== 'seals').slice(0, n)) state.seals[seal.id] = 1;
  return state;
};

describe('les sceaux des sceaux (21/10)', () => {
  it('10, 25, 50, 100, 410 sceaux apposés, sans compter ceux de la planche', () => {
    const state = withSeals(49);
    checkSeals(state, 2);
    expect(state.seals['sealsApplied-10']).toBe(2);
    expect(state.seals['sealsApplied-25']).toBe(2);
    // Les deux paliers tout juste apposés ne font pas le cinquantième.
    expect(state.seals['sealsApplied-50']).toBeUndefined();
  });

  it('« tous » : tous les autres sceaux du jeu, et pas un de moins', () => {
    const others = SEALS.filter((seal) => seal.plate !== 'seals').length;
    const almost = withSeals(others - 1);
    checkSeals(almost, 2);
    expect(almost.seals['sealsApplied-410']).toBe(2);
    expect(almost.seals.sealsAll).toBeUndefined();
    const all = withSeals(others);
    checkSeals(all, 2);
    expect(all.seals.sealsAll).toBe(2);
  });

  it('un sceau de mod ne compte pas', () => {
    const state = withSeals(9);
    state.seals['mod:test:seal'] = 1;
    checkSeals(state, 2);
    expect(state.seals['sealsApplied-10']).toBeUndefined();
  });
});
