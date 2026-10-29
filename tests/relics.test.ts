import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { RELICS } from '../src/data/relics';
import { hintFindable } from '../src/systems/findable';
import { findRelic, relicKnowledge, relicLetterWait, relicReading, relicWait, relicWaiting, setRelic } from '../src/systems/relics';
import { gainFind } from '../src/systems/knowledge';
import { letterWait } from '../src/systems/letter';
import { lightStar } from '../src/systems/etherium';
import { prestige } from '../src/systems/prestige';
import { checkSeals } from '../src/systems/seals';
import { segments, write } from '../src/systems/sentences';

vi.stubGlobal('window', new EventTarget());

const HOUR = 3_600_000;
const find = { kind: 'word', sentence: 'diagonal', segment: 0, duplicate: true } as const;

/** Une partie où l'Ouest de l'Exploration est allumé (les reliques débloquées). */
const unlocked = () => {
  const state = createInitialState('fr');
  state.etherium = ['explore.w'];
  return state;
};
/** La phrase-indice d'une relique, lue en entier. */
const readHint = (state: ReturnType<typeof createInitialState>, hint: string) =>
  write(
    state,
    hint,
    segments(hint).map((_, index) => index),
  );

describe('Les reliques', () => {
  it('leur phrase ne se lit qu’avec l’Ouest de l’Exploration, et leur salle déjà vue', () => {
    const locked = createInitialState('fr');
    expect(hintFindable(locked, 'hintRelicLoupe')).toBe(false);
    const state = unlocked();
    expect(hintFindable(state, 'hintRelicLoupe')).toBe(true);
    // La nuit vient avec l'Âge Automatique ; la verrière, avec le 3e Âge (pas encore dans le jeu).
    expect(hintFindable(state, 'hintRelicAstrolabe')).toBe(false);
    state.etherium.push('ages.auto');
    expect(hintFindable(state, 'hintRelicAstrolabe')).toBe(true);
    expect(hintFindable(state, 'hintRelicHourglass')).toBe(false);
  });

  it('la phrase lue, la relique attend dans sa salle ; trouvée, la première agit tout de suite', () => {
    const state = unlocked();
    expect(relicWaiting(state, 'loupe')).toBe(false);
    readHint(state, 'hintRelicLoupe');
    expect(relicWaiting(state, 'loupe')).toBe(true);
    expect(findRelic(state, 'loupe', 1000)).toBe(true);
    expect(state.relics.found.loupe).toBe(1000);
    expect(state.relics.active).toBe('loupe');
    expect(relicWaiting(state, 'loupe')).toBe(false);
    expect(state.lorePending).toContain('relicLoupe');
    // Une deuxième ne prend pas la place de la première.
    findRelic(state, 'astrolabe', 2000);
    expect(state.relics.active).toBe('loupe');
    expect(findRelic(state, 'loupe')).toBe(false);
  });

  it('en changer la fait agir tout de suite, puis plus de changement pendant 12 h (6 h avec la patience)', () => {
    const state = unlocked();
    findRelic(state, 'loupe', 0);
    findRelic(state, 'astrolabe', 0);
    expect(setRelic(state, 'astrolabe', 0)).toBe(true);
    expect(state.relics.active).toBe('astrolabe');
    expect(relicWait(state, 0)).toBe(12 * HOUR);
    expect(setRelic(state, 'loupe', 11 * HOUR)).toBe(false);
    expect(setRelic(state, 'loupe', 12 * HOUR)).toBe(true);
    expect(state.relics.changes).toBe(2);
    // Une relique pas trouvée ne se pose pas.
    expect(setRelic(state, 'hourglass', 100 * HOUR)).toBe(false);
    state.etherium.push('relics.d');
    expect(setRelic(state, 'astrolabe', 30 * HOUR)).toBe(true);
    expect(relicWait(state, 30 * HOUR)).toBe(6 * HOUR);
  });

  it('seule celle qui agit donne son bonus, renforcé par ses étoiles', () => {
    const state = unlocked();
    for (const relic of RELICS) state.relics.found[relic.id] = 0;
    state.relics.active = 'loupe';
    expect(relicKnowledge(state)).toBe(1.5);
    expect(relicLetterWait(state)).toBe(1);
    expect(relicReading(state)).toBe(1);
    gainFind(state, find);
    // 1 × 1,5, arrondi au supérieur.
    expect(state.knowledge).toBe(2);
    state.etherium.push('relics.l1', 'relics.l2');
    expect(relicKnowledge(state)).toBe(2);
    state.relics.active = 'astrolabe';
    expect(relicKnowledge(state)).toBe(1);
    expect(relicLetterWait(state)).toBeCloseTo(1 / 1.4);
    const before = letterWait(state, 0).min;
    state.relics.active = null;
    expect(letterWait(state, 0).min / before).toBeCloseTo(1.4);
    state.relics.active = 'hourglass';
    expect(relicReading(state)).toBeCloseTo(1.2);
    state.etherium.push('relics.h1');
    expect(relicReading(state)).toBeCloseTo(1.35);
  });

  it('restent au prestige, avec le délai ; leurs sceaux', () => {
    const state = unlocked();
    findRelic(state, 'loupe', 0);
    findRelic(state, 'astrolabe', 0);
    setRelic(state, 'astrolabe', 0);
    state.totalPagesRead = 1e12;
    expect(prestige(state, 1)).toBeGreaterThan(0);
    expect(state.relics.found.loupe).toBe(0);
    expect(state.relics.active).toBe('astrolabe');
    expect(relicWait(state, 0)).toBe(12 * HOUR);
    checkSeals(state, 5);
    expect(state.seals.relicLoupe).toBe(5);
    expect(state.seals.relicAstrolabe).toBe(5);
    expect(state.seals['relicChanges-1']).toBe(5);
    expect(state.seals.relicHourglass).toBeUndefined();
    expect(state.seals.relicsAll).toBeUndefined();
  });
});
