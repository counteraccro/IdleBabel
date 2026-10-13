import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { MIMIC_EVERY } from '../src/data/mimic';
import { advanceMimic, catchMimic, mimicBonusShare, mimicEvery, mimicReading, mimicSeconds, spawnMimic } from '../src/systems/mimic';
import { pagesPerSecond } from '../src/systems/production';
import { addKnowledge, gainFind } from '../src/systems/knowledge';
import { lightStar } from '../src/systems/etherium';
import { prestige } from '../src/systems/prestige';
import { checkSeals } from '../src/systems/seals';
import { intuitionVisible } from '../src/systems/technologies';

vi.stubGlobal('window', new EventTarget());

const find = { kind: 'word', sentence: 'diagonal', segment: 0, duplicate: true } as const;

/** Une partie où la Mimic est débloquée (l'Est de l'Exploration). */
const unlocked = () => {
  const state = createInitialState('fr');
  state.etherium = ['explore.e'];
  return state;
};

describe('La Mimic', () => {
  it('ne vient qu’une fois débloquée, une par heure de jeu en moyenne, jamais deux à la fois', () => {
    const locked = createInitialState('fr');
    expect(advanceMimic(locked, 1, () => 0)).toBe(false);
    const state = unlocked();
    expect(mimicEvery(state)).toBe(MIMIC_EVERY);
    expect(advanceMimic(state, 1, () => 0.5)).toBe(false);
    expect(advanceMimic(state, 1, () => 0.0001, 1000)).toBe(true);
    expect(state.mimic.at).toBe(1000);
    expect(advanceMimic(state, 1, () => 0)).toBe(false);
  });

  it('avale toutes les connaissances gagnées, et les rend avec 10 % de plus au second clic', () => {
    const state = unlocked();
    spawnMimic(state, () => 0.5, 0);
    gainFind(state, find);
    gainFind(state, find);
    expect(state.knowledge).toBe(0);
    expect(state.mimic.eaten).toBe(2);
    const given = catchMimic(state, 3_600_000);
    expect(given).toEqual({ eaten: 2, bonus: 2 * 0.1 });
    expect(state.knowledge).toBeCloseTo(2.2);
    expect(state.lifetimeKnowledge).toBeCloseTo(2.2);
    expect(state.mimic).toMatchObject({ at: null, eaten: 0, caught: 1, seconds: 3600 });
    expect(state.mimic.bonus).toBeCloseTo(0.2);
    // Partie : elle va de nouveau au joueur.
    gainFind(state, find);
    expect(state.knowledge).toBeCloseTo(3.2);
  });

  it('les dents : plus souvent (la plus haute compte), et rend plus (s’ajoute aux 10 %)', () => {
    const state = unlocked();
    state.ether = 1000;
    for (const id of ['mimic.t1', 'mimic.t2', 'mimic.b1', 'mimic.b2']) expect(lightStar(state, id), id).toBe(true);
    expect(mimicEvery(state)).toBe(MIMIC_EVERY / 1.5);
    expect(mimicBonusShare(state)).toBeCloseTo(0.45);
    // Sans l'Est, la page de la Mimic ne s'allume pas.
    const locked = createInitialState('fr');
    locked.ether = 1000;
    expect(lightStar(locked, 'mimic.eye')).toBe(false);
  });

  it('est attrapée d’office avant un prestige : la Connaissance compte, puis repart de zéro', () => {
    const state = unlocked();
    state.totalPagesRead = 1e10;
    spawnMimic(state, () => 0.5, 0);
    state.mimic.eaten = 1000;
    expect(prestige(state, 10_000)).toBeGreaterThan(0);
    expect(state.mimic.at).toBeNull();
    expect(state.mimic.caught).toBe(1);
    expect(state.lifetimeKnowledge).toBe(1100);
    expect(state.knowledge).toBe(0);
  });

  it('sceaux : attrapées, le bonus seul, le temps à manger (celle qui est là compte)', () => {
    const state = unlocked();
    spawnMimic(state, () => 0.5, Date.now() - 3_700_000);
    addKnowledge(state, 0);
    expect(mimicSeconds(state)).toBeGreaterThan(3600);
    state.mimic.eaten = 1000;
    catchMimic(state);
    checkSeals(state, 1);
    expect(state.seals['mimicsCaught-1']).toBe(1);
    expect(state.seals['mimicBonus-100']).toBe(1);
    expect(state.seals['mimicHours-1']).toBe(1);
    expect(state.seals['mimicsCaught-10']).toBeUndefined();
  });

  it('le Sommeil léger ne se voit qu’une fois la Mimic débloquée', () => {
    expect(intuitionVisible(createInitialState('fr'), 'lightSleep')).toBe(false);
    expect(intuitionVisible(unlocked(), 'lightSleep')).toBe(true);
  });
});

describe('La Mimic ralentit la lecture', () => {
  it('du pourcentage qu’elle rendra en plus, tant qu’elle est là, jamais de plus de moitié', () => {
    const state = unlocked();
    state.tools.diagonal = 10;
    const free = pagesPerSecond(state);
    spawnMimic(state, () => 0.5, 1000);
    expect(mimicReading(state)).toBeCloseTo(0.9);
    expect(pagesPerSecond(state)).toBeCloseTo(free * 0.9);
    state.etherium.push('mimic.b1');
    expect(mimicReading(state)).toBeCloseTo(0.7);
    state.etherium.push('mimic.b2', 'mimic.b3', 'mimic.b4', 'mimic.b5');
    expect(mimicReading(state)).toBe(0.5);
    catchMimic(state, 2000);
    expect(pagesPerSecond(state)).toBeCloseTo(free);
  });
});
