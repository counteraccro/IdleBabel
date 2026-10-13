import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { currentTarget, segments, sentenceShown, toolUnlocked, write } from '../src/systems/sentences';
import { findableTarget, waitingFor } from '../src/systems/findable';
import { intuitionVisible } from '../src/systems/technologies';
import { prestige } from '../src/systems/prestige';
import { sceneOfAge } from '../src/scene/scenes';
import { AUTOMATIC_AGE, DIGITAL_AGE, METHOD_CHAIN, TOOLS } from '../src/data/tools';
import { SEALS } from '../src/data/seals';
import { starById } from '../src/data/etheriumStars';
import { LOCALES } from '../src/i18n/locales';

const DIGITAL = ['minitel', 'computer', 'search', 'crawler', 'algorithm'];
const ALL = [...DIGITAL, 'bit'];

const writeAll = (state: GameState, id: string): void =>
  write(
    state,
    id,
    segments(id).map((_, index) => index),
  );

/** Une partie qui a retrouvé toutes les méthodes des Âges Manuel et Automatique, l'Âge Numérique acheté ou non. */
const game = (bought: boolean): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = bought ? [AUTOMATIC_AGE, DIGITAL_AGE] : [AUTOMATIC_AGE];
  for (const id of ['diagonal', 'finger', 'voice', 'lectern', 'ladder', 'metronome', 'wheel', 'lift', 'automaton', 'clock'])
    writeAll(state, id);
  return state;
};

describe('L’Âge Numérique', () => {
  it('cinq méthodes au bout de la chaîne, et le Bit, secret ; l’étoile de l’Âge à 1 500 Éther', () => {
    expect(TOOLS.filter((tool) => tool.age === DIGITAL_AGE).map((tool) => tool.id)).toEqual(ALL);
    expect(METHOD_CHAIN.slice(-5).map((tool) => tool.id)).toEqual(DIGITAL);
    expect(TOOLS.find((tool) => tool.id === 'bit')?.secret).toBe(true);
    expect(starById(DIGITAL_AGE)?.cost).toBe(1500);
  });

  it('avant l’Âge, rien ne le montre ; la salle reste celle de l’Âge Automatique', () => {
    const state = game(false);
    for (const id of ALL) {
      expect(sentenceShown(state, id)).toBe(false);
      expect(intuitionVisible(state, `${id}Gesture` as never)).toBe(false);
    }
    expect(currentTarget(state)).toBeUndefined();
    expect(sceneOfAge(state)).toBe('nuit');
  });

  it('l’Âge acheté : la verrière, le Minitel se trouve aussitôt, les suivantes attendent 25 exemplaires', () => {
    const state = game(true);
    expect(sceneOfAge(state)).toBe('verriere');
    expect(sentenceShown(state, 'minitel')).toBe(true);
    expect(intuitionVisible(state, 'minitelGesture')).toBe(true);
    expect(findableTarget(state)).toBe('minitel');
    writeAll(state, 'minitel');
    expect(toolUnlocked(state, 'minitel')).toBe(true);
    expect(currentTarget(state)).toBe('computer');
    expect(waitingFor(state, 'computer')).toBe('minitel');
    state.tools.minitel = 25;
    expect(findableTarget(state)).toBe('computer');
  });

  it('le Bit attend son étoile (la 1re de l’alvéole Numérique de la Ruche), même l’Âge acheté', () => {
    const state = game(true);
    expect(sentenceShown(state, 'bit')).toBe(false);
    state.etherium.push('memory.n0');
    expect(sentenceShown(state, 'bit')).toBe(true);
  });

  it('le prestige fait oublier leurs phrases, pas l’Âge', () => {
    const state = game(true);
    writeAll(state, 'minitel');
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(state.etherium).toContain(DIGITAL_AGE);
    expect(toolUnlocked(state, 'minitel')).toBe(false);
  });

  it('chaque méthode a ses textes, sa phrase en cinq morceaux, ses sceaux, dans chaque langue', () => {
    for (const messages of Object.values(LOCALES)) {
      expect((messages.whiteBook.parts as Record<string, string>).digitalAge).toBeTruthy();
      for (const id of ALL) {
        const sentence = (messages.whiteBook.sentences as Record<string, string>)[id];
        expect(sentence.split('/'), id).toHaveLength(5);
        expect((messages.tools as Record<string, { name: string }>)[id].name).toBeTruthy();
        expect((messages.whiteBook.methods as Record<string, { quote: string }>)[id].quote).toBeTruthy();
        expect((messages.finalBook.methods as Record<string, string>)[id]).toContain('{when}');
        const seals = (messages.strangeBook as unknown as { seals: Record<string, string> }).seals;
        expect(seals[id]).toContain('{n}');
        expect(seals[`${id}Pages`]).toContain('{n}');
      }
    }
    expect(SEALS.filter((seal) => seal.method === 'algorithm')).toHaveLength(12);
    expect(SEALS.some((seal) => seal.id === 'digitalAge')).toBe(true);
  });
});
