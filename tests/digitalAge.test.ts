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
import { knowledgePerFind, pageOpen, starOpen } from '../src/systems/etherium';
import { toolRate } from '../src/systems/production';
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
  it('cinq méthodes après l’Horloge, et le Bit, secret ; l’étoile de l’Âge à 1 500 Éther', () => {
    expect(TOOLS.filter((tool) => tool.age === DIGITAL_AGE).map((tool) => tool.id)).toEqual(ALL);
    expect(METHOD_CHAIN.filter((tool) => tool.age === DIGITAL_AGE).map((tool) => tool.id)).toEqual(DIGITAL);
    expect(METHOD_CHAIN.map((tool) => tool.id).indexOf('minitel')).toBe(METHOD_CHAIN.map((tool) => tool.id).indexOf('clock') + 1);
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

  it('l’alvéole Numérique de la Ruche attend l’Âge, puis suit l’Horloge : le Bit, puis une machine par étoile', () => {
    const state = game(false);
    state.etherium.push('memory.m0', 'memory.m1', 'memory.m2', 'memory.m3', 'memory.m4', 'memory.m5');
    state.etherium.push('memory.a1', 'memory.a2', 'memory.a3', 'memory.a4', 'memory.a5');
    expect(starOpen(state, 'memory.n0')).toBe(false);
    state.etherium.push(DIGITAL_AGE);
    expect(starOpen(state, 'memory.n0')).toBe(true);
    expect(starOpen(state, 'memory.n1')).toBe(false);
    expect([0, 1, 2, 3, 4, 5].map((i) => starById(`memory.n${i}`)?.cost)).toEqual([100, 100, 200, 400, 800, 1600]);
  });

  it('la page du Minitel attend l’Âge ; l’écran fait lire les machines, pas les autres ; le clavier, la Connaissance', () => {
    const state = game(false);
    state.ether = 1e6;
    expect(pageOpen(state, 'screen')).toBe(false);
    expect(starOpen(state, 'screen.plug')).toBe(false);
    state.etherium.push(DIGITAL_AGE);
    expect(pageOpen(state, 'screen')).toBe(true);
    const minitel = toolRate(state, 'minitel');
    const clock = toolRate(state, 'clock');
    const knowledge = knowledgePerFind(state);
    state.etherium.push('screen.plug', 'screen.s1', 'screen.k1');
    expect(toolRate(state, 'minitel')).toBeCloseTo(minitel * 1.1 * 1.25);
    expect(toolRate(state, 'clock')).toBeCloseTo(clock);
    expect(knowledgePerFind(state)).toBeCloseTo(knowledge * 1.25);
    expect(starOpen(state, 'screen.s2')).toBe(true);
    expect(starOpen(state, 'screen.k2')).toBe(true);
  });

  it('une étoile de l’alvéole garde la phrase de sa machine au prestige', () => {
    const state = game(true);
    state.etherium.push('memory.n0', 'memory.n1');
    writeAll(state, 'minitel');
    writeAll(state, 'computer');
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(toolUnlocked(state, 'minitel')).toBe(true);
    expect(toolUnlocked(state, 'computer')).toBe(false);
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
