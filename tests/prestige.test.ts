import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import {
  closeEtherium,
  etherDeserved,
  nextEtherPages,
  nextEtherProgress,
  prestige,
  prestigeGain,
  prestigeReady,
} from '../src/systems/prestige';
import { etherReading, lightStar, readingMultiplier, starOpen } from '../src/systems/etherium';
import { readPage } from '../src/systems/click';
import { segments, toolUnlocked, write } from '../src/systems/sentences';
import { toolRate } from '../src/systems/production';
import { rollFinds } from '../src/systems/knowledge';
import { levelOf } from '../src/systems/technologies';

/** Une partie qui a lu `pages` depuis toujours, toutes ses méthodes retrouvées. */
const reader = (pages: number) => {
  const state = createInitialState('fr');
  state.totalPagesRead = pages;
  state.pages = 1234;
  state.lifetimeKnowledge = 50;
  for (const id of ['diagonal', 'finger', 'voice', 'lectern', 'ladder'])
    write(
      state,
      id,
      segments(id).map((_, index) => index),
    );
  state.tools.diagonal = 40;
  state.tools.finger = 30;
  state.knowledge = 500;
  state.technologies = { semanticFilter: 2, armful: 1 };
  return state;
};

describe('Prestige', () => {
  it('le prochain Éther : de 0 à 1 entre deux Éthers mérités', () => {
    expect(nextEtherProgress(reader(0))).toBe(0);
    expect(nextEtherProgress(reader(5e8))).toBeCloseTo(0.5);
    // 8 Md : le 2ᵉ, tout juste ; le 3ᵉ demande 27 Md.
    expect(nextEtherProgress(reader(8e9))).toBe(0);
    expect(nextEtherProgress(reader(1.75e10))).toBeCloseTo(0.5);
  });

  it('l’Éther mérité : la racine cubique des pages à vie, en milliards', () => {
    expect(etherDeserved(reader(999_999_999))).toBe(0);
    expect(etherDeserved(reader(1e9))).toBe(1);
    expect(etherDeserved(reader(8e9))).toBe(2);
    expect(etherDeserved(reader(26.9e9))).toBe(2);
    expect(nextEtherPages(reader(8e9))).toBe(27e9);
  });

  it('le livre violet n’attend qu’à partir d’un Éther à gagner, et pas l’Etherium en main', () => {
    const state = reader(5e8);
    expect(prestigeReady(state)).toBe(false);
    expect(prestige(state)).toBe(0);
    state.totalPagesRead = 1e9;
    expect(prestigeReady(state)).toBe(true);
    state.etheriumInHand = true;
    expect(prestigeReady(state)).toBe(false);
  });

  it('rapporte l’Éther mérité moins celui déjà reçu', () => {
    const state = reader(8e9);
    expect(prestige(state)).toBe(2);
    closeEtherium(state);
    expect(prestigeGain(state)).toBe(0);
    state.totalPagesRead = 27e9;
    expect(prestige(state)).toBe(1);
    expect(state.ether).toBe(3);
    expect(state.etherReceived).toBe(3);
    expect(state.exiles).toBe(2);
  });

  it('tout est perdu, sauf les pages à vie, les intuitions permanentes et le reste du livre blanc', () => {
    const state = reader(1e9);
    write(state, 'cup', [0]);
    prestige(state);
    expect(state.pages).toBe(0);
    expect(state.tools.diagonal).toBe(0);
    expect(state.knowledge).toBe(0);
    expect(levelOf(state, 'semanticFilter')).toBe(0);
    expect(levelOf(state, 'armful')).toBe(1);
    expect(toolUnlocked(state, 'diagonal')).toBe(false);
    expect(state.written.cup).toEqual([0]);
    expect(state.totalPagesRead).toBe(1e9);
    expect(state.etheriumInHand).toBe(true);
  });

  it('la Lecture Diagonale revient dès la première page tournée après le réveil', () => {
    const state = reader(1e9);
    state.booksFinished = 3;
    prestige(state);
    const [find] = rollFinds(state, () => 0.99);
    expect(find).toEqual({ kind: 'sentence', sentence: 'diagonal' });
  });

  it('une étoile s’allume avec de l’Éther, après son étoile d’avant, et agit pour toujours', () => {
    const state = reader(27e9);
    prestige(state);
    const before = toolRate(state, 'diagonal');
    expect(lightStar(state, 'reading.s1')).toBe(false);
    expect(lightStar(state, 'reading.s0')).toBe(true);
    expect(readingMultiplier(state)).toBe(1.1);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before * 1.1);
    expect(lightStar(state, 'reading.s0')).toBe(false);
    expect(starOpen(state, 'reading.s1')).toBe(true);
    expect(lightStar(state, 'reading.s1')).toBe(false);
    expect(state.ether).toBe(2);
    expect(lightStar(state, 'hands.w')).toBe(true);
    expect(state.ether).toBe(1);
  });

  it('chaque Éther reçu, dépensé ou non, donne 1 % de lecture aux méthodes et aux clics', () => {
    const state = reader(27e9);
    const before = toolRate(state, 'diagonal');
    prestige(state);
    expect(etherReading(state)).toBeCloseTo(1.03);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before * 1.03);
    lightStar(state, 'reading.s0');
    expect(etherReading(state)).toBeCloseTo(1.03);
    state.pages = 0;
    readPage(state);
    expect(state.pages).toBeCloseTo(2 * 1.03);
  });

  it('les effets des étoiles allumées se multiplient', () => {
    const state = reader(1e9);
    state.etherium = ['reading.s0', 'reading.s1', 'reading.l1'];
    expect(readingMultiplier(state)).toBeCloseTo(1.1 * 1.25 * 1.25);
  });

  it('l’alvéole Automatique de la Ruche attend l’Âge Automatique', () => {
    const state = reader(1e9);
    state.etherium = ['memory.m0', 'memory.m1', 'memory.m2', 'memory.m3', 'memory.m4', 'memory.m5'];
    expect(starOpen(state, 'memory.a0')).toBe(false);
    state.etherium.push('ages.auto');
    expect(starOpen(state, 'memory.a0')).toBe(true);
  });

  it('la Porte et la Ruche', () => {
    const state = reader(1e9);
    state.etherium = ['start.sill', 'start.l1', 'memory.m0', 'memory.m1', 'memory.m2'];
    prestige(state);
    expect(state.tools.diagonal).toBe(10);
    expect(toolUnlocked(state, 'diagonal')).toBe(true);
    expect(toolUnlocked(state, 'finger')).toBe(true);
    expect(toolUnlocked(state, 'voice')).toBe(false);
  });
});
