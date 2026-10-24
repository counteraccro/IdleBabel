import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { currentTarget, segments, sentenceShown, toolUnlocked, write } from '../src/systems/sentences';
import { findableTarget, waitingFor } from '../src/systems/findable';
import { intuitionVisible } from '../src/systems/technologies';
import { prestige } from '../src/systems/prestige';
import { sceneOfAge } from '../src/scene/scenes';
import { AUTOMATIC_AGE, DIGITAL_AGE, METHOD_CHAIN, QUANTUM_AGE, TOOLS } from '../src/data/tools';
import { TECHNOLOGIES } from '../src/data/technologies';
import { SEALS } from '../src/data/seals';
import { starById } from '../src/data/etheriumStars';
import { knowledgePerFind, pageOpen, starOpen } from '../src/systems/etherium';
import { toolRate } from '../src/systems/production';
import { ETHERIUM_PAGES, STARS } from '../src/data/etheriumStars';
import { gearAges } from '../src/systems/gear';
import { effectText } from '../src/ui/library/lotteryText';
import { LOCALES } from '../src/i18n/locales';
import { setLocale } from '../src/i18n';

const QUANTUM = ['microscope', 'entangled', 'teleportation', 'grover', 'quantumComputer'];
const ALL = [...QUANTUM, 'qubit'];
const EARLIER = ['diagonal', 'finger', 'voice', 'lectern', 'ladder', 'metronome', 'wheel', 'lift', 'automaton', 'clock'];
const DIGITAL = ['minitel', 'computer', 'search', 'crawler', 'algorithm'];

const writeAll = (state: GameState, id: string): void =>
  write(
    state,
    id,
    segments(id).map((_, index) => index),
  );

/** Une partie qui a retrouvé toutes les méthodes des trois premiers Âges, l'Âge Quantique acheté ou non. */
const game = (bought: boolean): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = bought ? [AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE] : [AUTOMATIC_AGE, DIGITAL_AGE];
  for (const id of [...EARLIER, ...DIGITAL]) writeAll(state, id);
  return state;
};

describe('L’Âge Quantique', () => {
  it('cinq méthodes au bout de la chaîne, et le Qubit, secret ; l’étoile de l’Âge à 75 000 Éther, après le Numérique', () => {
    expect(TOOLS.filter((tool) => tool.age === QUANTUM_AGE).map((tool) => tool.id)).toEqual(ALL);
    expect(METHOD_CHAIN.slice(-5).map((tool) => tool.id)).toEqual(QUANTUM);
    expect(TOOLS.find((tool) => tool.id === 'qubit')?.secret).toBe(true);
    expect(starById(QUANTUM_AGE)?.cost).toBe(75_000);
    expect(starById(QUANTUM_AGE)?.after).toBe(DIGITAL_AGE);
    expect(starById('ages.dim')?.after).toBe(QUANTUM_AGE);
  });

  it('les chiffres validés (essais 4 et 13 du simulateur)', () => {
    const tool = (id: string) => TOOLS.find((candidate) => candidate.id === id)!;
    expect(ALL.map((id) => [tool(id).baseCost, tool(id).pagesPerSecond])).toEqual([
      [5e21, 6.7e13],
      [4e22, 1.8e14],
      [3.2e23, 4.8e14],
      [2.5e24, 1.25e15],
      [2e25, 3.3e15],
      [2.048e24, 2e15],
    ]);
    const first = (id: string) => TECHNOLOGIES.find((tech) => tech.id === `${id}Gesture`)!.prices[0];
    expect(ALL.map(first)).toEqual([102_400_000, 204_800_000, 409_600_000, 819_200_000, 1_638_400_000, 256_000_000]);
  });

  it('avant l’Âge, rien ne le montre ; la salle reste la verrière', () => {
    const state = game(false);
    for (const id of ALL) {
      expect(sentenceShown(state, id)).toBe(false);
      expect(intuitionVisible(state, `${id}Gesture` as never)).toBe(false);
    }
    expect(currentTarget(state)).toBeUndefined();
    expect(sceneOfAge(state)).toBe('verriere');
  });

  it('l’Âge acheté : le jour et la nuit, le Microscope se trouve aussitôt, les suivantes attendent 25 exemplaires', () => {
    const state = game(true);
    expect(sceneOfAge(state)).toBe('jour-nuit');
    expect(sentenceShown(state, 'microscope')).toBe(true);
    expect(intuitionVisible(state, 'microscopeGesture')).toBe(true);
    expect(findableTarget(state)).toBe('microscope');
    writeAll(state, 'microscope');
    expect(toolUnlocked(state, 'microscope')).toBe(true);
    expect(currentTarget(state)).toBe('entangled');
    expect(waitingFor(state, 'entangled')).toBe('microscope');
    state.tools.microscope = 25;
    expect(findableTarget(state)).toBe('entangled');
  });

  it('le Qubit attend son étoile (la puce du Lustre), même l’Âge acheté', () => {
    const state = game(true);
    expect(sentenceShown(state, 'qubit')).toBe(false);
    state.etherium.push('chandelier.chip');
    expect(sentenceShown(state, 'qubit')).toBe(true);
  });

  it('l’étoile de l’Âge attend l’Âge Numérique', () => {
    const state = createInitialState('fr', 0, 1);
    state.etherium = [AUTOMATIC_AGE];
    expect(starOpen(state, QUANTUM_AGE)).toBe(false);
    state.etherium.push(DIGITAL_AGE);
    expect(starOpen(state, QUANTUM_AGE)).toBe(true);
  });

  it('le prestige fait oublier leurs phrases, pas l’Âge', () => {
    const state = game(true);
    writeAll(state, 'microscope');
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(state.etherium).toContain(QUANTUM_AGE);
    expect(toolUnlocked(state, 'microscope')).toBe(false);
  });

  it('l’alvéole Quantique de la Ruche attend l’Âge, puis suit l’Algorithme : le Qubit, puis une machine par étoile', () => {
    const state = game(false);
    for (const cell of ['m', 'a', 'n']) for (let i = 0; i < 6; i++) if (`${cell}${i}` !== 'a0') state.etherium.push(`memory.${cell}${i}`);
    expect(starOpen(state, 'memory.q0')).toBe(false);
    state.etherium.push(QUANTUM_AGE);
    expect(starOpen(state, 'memory.q0')).toBe(true);
    expect(starOpen(state, 'memory.q1')).toBe(false);
    expect([0, 1, 2, 3, 4, 5].map((i) => starById(`memory.q${i}`)?.cost)).toEqual([1000, 1000, 2000, 4000, 8000, 16_000]);
  });

  it('le Qubit s’oublie au prestige, sauf avec la 1re étoile de l’alvéole ; une machine, avec la sienne', () => {
    const state = game(true);
    state.etherium.push('chandelier.chip', 'memory.q1');
    writeAll(state, 'qubit');
    writeAll(state, 'microscope');
    writeAll(state, 'entangled');
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(toolUnlocked(state, 'qubit')).toBe(false);
    expect(toolUnlocked(state, 'microscope')).toBe(true);
    expect(toolUnlocked(state, 'entangled')).toBe(false);
    state.etherium.push('memory.q0');
    writeAll(state, 'qubit');
    state.totalPagesRead = 2e10;
    prestige(state);
    expect(toolUnlocked(state, 'qubit')).toBe(true);
  });

  it('la dent du Rouage de l’Âge Quantique attend l’Âge, puis il achète aussi ses machines', () => {
    const state = game(false);
    state.etherium.push('gear.c', 'gear.a2', 'gear.a3');
    expect(starOpen(state, 'gear.a4')).toBe(false);
    state.etherium.push(QUANTUM_AGE);
    expect(starOpen(state, 'gear.a4')).toBe(true);
    expect(gearAges(state)).not.toContain(QUANTUM_AGE);
    state.etherium.push('gear.a4');
    expect(gearAges(state)).toContain(QUANTUM_AGE);
  });

  it('le Lustre attend l’Âge ; le crochet et les câbles font lire les machines, pas les autres ; les plateaux, la Connaissance', () => {
    const state = game(false);
    state.ether = 1e8;
    expect(ETHERIUM_PAGES.indexOf('chandelier')).toBe(ETHERIUM_PAGES.indexOf('screen') + 1);
    expect(pageOpen(state, 'chandelier')).toBe(false);
    expect(starOpen(state, 'chandelier.hook')).toBe(false);
    state.etherium.push(QUANTUM_AGE);
    expect(pageOpen(state, 'chandelier')).toBe(true);
    expect(starOpen(state, 'chandelier.hook')).toBe(true);
    const microscope = toolRate(state, 'microscope');
    const algorithm = toolRate(state, 'algorithm');
    const knowledge = knowledgePerFind(state);
    state.etherium.push('chandelier.hook', 'chandelier.q1', 'chandelier.k1');
    expect(toolRate(state, 'microscope')).toBeCloseTo(microscope * 1.1 * 1.25);
    expect(toolRate(state, 'algorithm')).toBeCloseTo(algorithm);
    expect(knowledgePerFind(state)).toBeCloseTo(knowledge * 1.25);
    expect(starOpen(state, 'chandelier.q2')).toBe(true);
    expect(starOpen(state, 'chandelier.chip')).toBe(true);
  });

  it('les prix du Lustre (validés le 24/10) ; la puce, après le crochet, fait trouver le Qubit', () => {
    const cost = (id: string) => STARS.find((star) => star.id === `chandelier.${id}`)?.cost;
    expect(['hook', 'q1', 'q2', 'q3', 'q4', 'k1', 'k2', 'k3', 'k4', 'chip'].map(cost)).toEqual([
      100_000, 500_000, 1_000_000, 1_500_000, 3_000_000, 500_000, 1_000_000, 1_500_000, 3_000_000, 200_000,
    ]);
    expect(starById('chandelier.chip')?.after).toBe('chandelier.hook');
    const state = game(true);
    state.etherium.push('chandelier.hook', 'chandelier.chip');
    expect(sentenceShown(state, 'qubit')).toBe(true);
    expect(SEALS.some((seal) => seal.id === 'constellation-chandelier')).toBe(true);
  });

  it('la Loterie accorde au pluriel : « Les Livres Intriqués arrêtés »', () => {
    setLocale('fr');
    const state = createInitialState('fr', 0, 1);
    expect(effectText(state, 'stopped', 'entangled')).toBe('Les Livres Intriqués arrêtés');
    expect(effectText(state, 'stopped', 'teleportation')).toBe('La Téléportation Quantique arrêtée');
    expect(effectText(state, 'stopped', 'microscope')).toBe('Le Microscope à Effet Tunnel arrêté');
  });

  it('chaque méthode a ses textes, sa phrase en cinq morceaux, ses sceaux, dans chaque langue', () => {
    for (const messages of Object.values(LOCALES)) {
      expect((messages.whiteBook.parts as Record<string, string>).quantumAge).toBeTruthy();
      expect((messages.whiteBook.partDescriptions as Record<string, string>).quantumAge).toBeTruthy();
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
    expect(SEALS.filter((seal) => seal.method === 'quantumComputer')).toHaveLength(12);
    expect(SEALS.some((seal) => seal.id === 'quantumAge')).toBe(true);
  });
});
