import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { currentTarget, isComplete, openSecret, segments, sentenceShown, toolUnlocked, write } from '../src/systems/sentences';
import { drawFind } from '../src/systems/knowledge';
import { findableTarget, waitingFor } from '../src/systems/findable';
import { intuitionVisible } from '../src/systems/technologies';
import { prestige } from '../src/systems/prestige';
import { METHOD_CHAIN, TOOLS } from '../src/data/tools';
import { gameRandom } from '../src/core/random';

const writeAll = (state: GameState, id: string): void =>
  write(
    state,
    id,
    segments(id).map((_, index) => index),
  );

/** Une partie qui a retrouvé `methods`, la Page Cornée allumée dans l'Etherium ou non. */
const game = (lit: boolean, ...methods: string[]): GameState => {
  const state = createInitialState('fr', 0, 1);
  if (lit) state.etherium = ['memory.m0'];
  for (const id of methods) writeAll(state, id);
  return state;
};

/** Les phrases où vont `count` trouvailles tirées. */
const draws = (state: GameState, count = 2000): Set<string> => {
  const random = gameRandom('cornee');
  return new Set(Array.from({ length: count }, () => drawFind(state, random).sentence));
};

describe('La Page Cornée', () => {
  it('dernière méthode de l’Âge Manuel, hors de la chaîne des 25 exemplaires', () => {
    expect(TOOLS.filter((tool) => !tool.age).at(-1)?.id).toBe('cornee');
    expect(METHOD_CHAIN.filter((tool) => !tool.age).map((tool) => tool.id)).toEqual(['diagonal', 'finger', 'voice', 'lectern', 'ladder']);
    const state = game(true, 'diagonal', 'finger', 'voice');
    expect(waitingFor(state, 'lectern')).toBe('voice');
    state.tools.cornee = 100;
    expect(findableTarget(state)).toBeUndefined();
  });

  it('avant son étoile, rien ne la montre', () => {
    const state = game(false, 'diagonal');
    expect(sentenceShown(state, 'cornee')).toBe(false);
    expect(intuitionVisible(state, 'corneeGesture')).toBe(false);
    expect(openSecret(state)).toBeUndefined();
    expect(draws(state).has('cornee')).toBe(false);
  });

  it('son étoile allumée, sa phrase se trouve à côté de la méthode en cours', () => {
    const state = game(true, 'diagonal');
    state.tools.diagonal = 25;
    expect(sentenceShown(state, 'cornee')).toBe(true);
    expect(intuitionVisible(state, 'corneeGesture')).toBe(true);
    expect(currentTarget(state)).toBe('finger');
    const found = draws(state);
    expect(found.has('cornee')).toBe(true);
    expect(found.has('finger')).toBe(true);
    expect(toolUnlocked(state, 'cornee')).toBe(false);
    writeAll(state, 'cornee');
    expect(toolUnlocked(state, 'cornee')).toBe(true);
    expect(openSecret(state)).toBeUndefined();
  });

  it('le prestige ne la fait jamais oublier', () => {
    const state = game(true, 'diagonal', 'cornee');
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(isComplete(state, 'cornee')).toBe(true);
    expect(isComplete(state, 'diagonal')).toBe(false);
  });
});
