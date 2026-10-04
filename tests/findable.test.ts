import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { EXTRA_FIND_SHARES, METHOD_GATE } from '../src/data/knowledge';
import { HINT_BOOKS } from '../src/data/anomalies';
import { SENTENCES } from '../src/data/sentences';
import { drawExtraFind, drawFind } from '../src/systems/knowledge';
import { findableTarget, hintFindable } from '../src/systems/findable';
import { segments, write } from '../src/systems/sentences';

/** Une partie où la Lecture Diagonale est découverte : la phrase en cours est celle du Doigt. */
const afterDiagonal = () => {
  const state = createInitialState('fr');
  state.lifetimeKnowledge = 1;
  write(
    state,
    'diagonal',
    segments('diagonal').map((_, index) => index),
  );
  return state;
};

describe('ce qui peut se trouver', () => {
  it('la phrase d’une méthode attend la méthode d’avant à 25 exemplaires', () => {
    const state = afterDiagonal();
    expect(findableTarget(state)).toBeUndefined();
    for (let i = 0; i < 2000; i++) expect(drawFind(state, Math.random).sentence).not.toBe('finger');
    state.tools.diagonal = METHOD_GATE;
    expect(findableTarget(state)).toBe('finger');
    expect(findableTarget(createInitialState('fr'))).toBe('diagonal');
  });

  it('un indice qui mène à un livre rare attend ce livre ; les autres tombent n’importe quand', () => {
    const state = afterDiagonal();
    expect(hintFindable(state, 'hintSandLastPage')).toBe(false);
    expect(hintFindable(state, 'hintInsomnia')).toBe(true);
    expect(hintFindable(state, 'hintColleagues')).toBe(false);
    state.rareBooks.oriana = 10;
    expect(hintFindable(state, 'hintColleagues')).toBe(true);
    const waiting = Object.keys(HINT_BOOKS).filter((id) => id !== 'hintColleagues');
    for (let i = 0; i < 3000; i++) {
      expect(waiting).not.toContain(drawFind(state, Math.random).sentence);
      expect(waiting).not.toContain(drawExtraFind(state, Math.random).sentence);
    }
  });

  it('au-delà de 100 %, les trouvailles en plus écrivent rarement du neuf', () => {
    const state = afterDiagonal();
    state.tools.diagonal = METHOD_GATE;
    const kinds = { method: 0, hint: 0, memory: 0, nothing: 0 };
    const draws = 20_000;
    for (let i = 0; i < draws; i++) {
      const find = drawExtraFind(state, Math.random);
      const sentence = SENTENCES.find((s) => s.id === find.sentence)!;
      if (find.duplicate) kinds.nothing++;
      else if (sentence.kind === 'method') kinds.method++;
      else if (sentence.family === 'hints') kinds.hint++;
      else if (sentence.kind === 'memory') kinds.memory++;
    }
    expect(kinds.method / draws).toBeCloseTo(EXTRA_FIND_SHARES.method, 1);
    expect(kinds.hint / draws).toBeCloseTo(EXTRA_FIND_SHARES.hint, 1);
    expect(kinds.memory / draws).toBeCloseTo(EXTRA_FIND_SHARES.memory, 1);
    expect(kinds.nothing / draws).toBeGreaterThan(0.8);
  });
});
