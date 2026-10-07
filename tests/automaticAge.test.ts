import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { completion, currentTarget, segments, sentenceShown, toolUnlocked, write } from '../src/systems/sentences';
import { findableTarget, waitingFor } from '../src/systems/findable';
import { intuitionVisible } from '../src/systems/technologies';
import { prestige } from '../src/systems/prestige';
import { AUTOMATIC_AGE, METHOD_CHAIN, TOOLS } from '../src/data/tools';
import { SEALS } from '../src/data/seals';
import { LOCALES } from '../src/i18n/locales';

const AUTOMATIC = ['metronome', 'wheel', 'lift', 'automaton', 'clock'];

const writeAll = (state: GameState, id: string): void =>
  write(
    state,
    id,
    segments(id).map((_, index) => index),
  );

/** Une partie qui a retrouvé toutes les méthodes de l'Âge Manuel, l'Âge Automatique acheté ou non. */
const game = (bought: boolean): GameState => {
  const state = createInitialState('fr', 0, 1);
  if (bought) state.etherium = [AUTOMATIC_AGE];
  for (const id of ['diagonal', 'finger', 'voice', 'lectern', 'ladder']) writeAll(state, id);
  return state;
};

describe('L’Âge Automatique', () => {
  it('cinq méthodes, après celles de l’Âge Manuel, dans la chaîne', () => {
    expect(TOOLS.filter((tool) => tool.age === AUTOMATIC_AGE).map((tool) => tool.id)).toEqual(AUTOMATIC);
    expect(METHOD_CHAIN.slice(-5).map((tool) => tool.id)).toEqual(AUTOMATIC);
  });

  it('avant l’Âge, rien ne le montre : ni ses phrases, ni ses intuitions, ni la méthode en cours', () => {
    const state = game(false);
    for (const id of AUTOMATIC) {
      expect(sentenceShown(state, id)).toBe(false);
      expect(intuitionVisible(state, `${id}Gesture` as never)).toBe(false);
    }
    expect(currentTarget(state)).toBeUndefined();
    expect(completion(state)).toBeGreaterThan(0);
  });

  it('l’Âge acheté, la première se trouve aussitôt (sans 25 Échelles), les suivantes attendent 25 exemplaires', () => {
    const state = game(true);
    expect(sentenceShown(state, 'metronome')).toBe(true);
    expect(intuitionVisible(state, 'metronomeGesture')).toBe(true);
    expect(findableTarget(state)).toBe('metronome');
    writeAll(state, 'metronome');
    expect(toolUnlocked(state, 'metronome')).toBe(true);
    expect(currentTarget(state)).toBe('wheel');
    expect(waitingFor(state, 'wheel')).toBe('metronome');
    state.tools.metronome = 25;
    expect(findableTarget(state)).toBe('wheel');
  });

  it('le prestige fait oublier leurs phrases, pas l’Âge', () => {
    const state = game(true);
    writeAll(state, 'metronome');
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(state.etherium).toContain(AUTOMATIC_AGE);
    expect(toolUnlocked(state, 'metronome')).toBe(false);
  });

  it('chaque méthode a ses textes, sa phrase en cinq morceaux, ses sceaux, dans chaque langue', () => {
    for (const messages of Object.values(LOCALES))
      for (const id of AUTOMATIC) {
        const sentence = (messages.whiteBook.sentences as Record<string, string>)[id];
        expect(sentence.split('/'), id).toHaveLength(5);
        expect((messages.tools as Record<string, { name: string }>)[id].name).toBeTruthy();
        expect((messages.whiteBook.methods as Record<string, { quote: string }>)[id].quote).toBeTruthy();
        expect((messages.finalBook.methods as Record<string, string>)[id]).toContain('{when}');
        const seals = (messages.strangeBook as unknown as { seals: Record<string, string> }).seals;
        expect(seals[id]).toContain('{n}');
        expect(seals[`${id}Pages`]).toContain('{n}');
      }
    expect(SEALS.filter((seal) => seal.method === 'clock')).toHaveLength(12);
  });
});
