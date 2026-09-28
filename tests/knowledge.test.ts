import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { BASE_FIND_CHANCE, MAX_AWAY_SECONDS } from '../src/data/knowledge';
import { findText, findWhileAway, gainFind, rollFind } from '../src/systems/knowledge';
import { decipher, decipherPrice, isDeciphered } from '../src/systems/decipher';
import { PARTS } from '../src/data/decipher';

/** Tirages rejoués dans l'ordre, puis 0,5. */
const sequence = (...values: number[]) => () => values.shift() ?? 0.5;

describe('Connaissance', () => {
  it('ne trouve rien au-dessus de la chance, et trouve en dessous', () => {
    const state = createInitialState('fr');
    expect(rollFind(state, sequence(BASE_FIND_CHANCE))).toBeUndefined();
    const find = rollFind(state, sequence(BASE_FIND_CHANCE / 2, 0, 0));
    expect(find).toEqual({ kind: 'word', index: 0 });
    expect(findText(find!)).toBe('tasse');
  });

  it('tire des mots, des morceaux de phrase, et rarement des phrases', () => {
    const state = createInitialState('fr');
    expect(rollFind(state, sequence(0, 0.69, 0))?.kind).toBe('word');
    expect(rollFind(state, sequence(0, 0.9, 0))?.kind).toBe('piece');
    expect(rollFind(state, sequence(0, 0.96, 0))?.kind).toBe('sentence');
  });

  it("rapporte un point par trouvaille lue, sans qu'une dépense ne baisse le total", () => {
    const state = createInitialState('fr');
    gainFind(state, { kind: 'piece', index: 2 });
    expect([state.knowledge, state.cycleKnowledge, state.lifetimeKnowledge, state.stats.fragments]).toEqual([1, 1, 1, 1]);
    expect(state.finds).toEqual([{ kind: 'piece', index: 2 }]);
  });

  it('trouve aussi pendant une absence, au rythme plafonné des pages qui tournent seules', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 1_000; // 100 pages/s : plafonné à 5
    // 8 h au plus, même après une semaine : 5 × 28 800 × 0,5 % = 720 trouvailles.
    expect(findWhileAway(state, 7 * 24 * 3600, () => 0)).toBe(Math.floor(5 * MAX_AWAY_SECONDS * BASE_FIND_CHANCE));
    expect(state.knowledge).toBe(720);
    state.settings.autoTurn = false;
    expect(findWhileAway(state, 3600, () => 0)).toBe(0);
  });
});

describe('déchiffrer le livre étrange', () => {
  it('lit le sommaire dès la première trouvaille', () => {
    const state = createInitialState('fr');
    expect(isDeciphered(state, 'contents')).toBe(false);
    expect(decipherPrice(state, 'contents')).toBeUndefined();
    gainFind(state, { kind: 'word', index: 0 });
    expect(isDeciphered(state, 'contents')).toBe(true);
  });

  it("se paie, ou vient seul au palier, et le reste après une dépense", () => {
    const state = createInitialState('fr');
    state.knowledge = 1;
    expect(decipher(state, 'books')).toBe(false);
    expect(decipher(state, 'pages')).toBe(true);
    expect(state.knowledge).toBe(0);
    expect(isDeciphered(state, 'pages')).toBe(true);
    expect(decipherPrice(state, 'pages')).toBeUndefined();
    state.lifetimeKnowledge = PARTS.seals.freeAt;
    expect(isDeciphered(state, 'seals')).toBe(true);
  });
});
