import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { ROOM_RELICS, relicById } from '../src/data/relics';
import { SEALS } from '../src/data/seals';
import { ONCE_TASKS } from '../src/data/tasks';
import { hintFindable } from '../src/systems/findable';
import { findRelic, relicMimicComes, relicWaiting } from '../src/systems/relics';
import { mimicEvery } from '../src/systems/mimic';
import { AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE } from '../src/data/tools';
import { segments, write } from '../src/systems/sentences';

vi.stubGlobal('window', new EventTarget());

/** Une partie où l'Ouest de l'Exploration est allumé et l'Âge Quantique atteint (la salle jour-nuit vue). */
const quantum = () => {
  const state = createInitialState('fr');
  state.etherium = ['explore.w', AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE];
  return state;
};

describe('La Boussole', () => {
  it('sa phrase ne se lit qu’une fois la salle jour-nuit vue ; lue, elle attend sur le seuil de l’arche', () => {
    const locked = createInitialState('fr');
    locked.etherium = ['explore.w'];
    expect(hintFindable(locked, 'hintRelicCompass')).toBe(false);
    const state = quantum();
    expect(hintFindable(state, 'hintRelicCompass')).toBe(true);
    write(
      state,
      'hintRelicCompass',
      segments('hintRelicCompass').map((_, index) => index),
    );
    expect(relicWaiting(state, 'compass')).toBe(true);
    expect(relicById('compass')!.room).toBe('jour-nuit');
  });

  it('trouvée : son récit, son sceau ; « Trouve les quatre reliques »', () => {
    const state = quantum();
    expect(findRelic(state, 'compass', 1000)).toBe(true);
    expect(state.lorePending).toContain('relicCompass');
    expect(SEALS.find((seal) => seal.id === 'relicCompass')!.reached(state)).toBe(true);
    expect(ROOM_RELICS).toHaveLength(4);
    expect(ONCE_TASKS.find((task) => task.n === 11)!.goal).toBe(ROOM_RELICS.length);
  });

  it('posée, la Mimic vient 50 % plus souvent, 75 % et deux fois avec ses étoiles, avec les dents du haut', () => {
    const state = quantum();
    const before = mimicEvery(state);
    findRelic(state, 'compass', 0);
    state.relics.active = 'compass';
    expect(relicMimicComes(state)).toBe(1.5);
    expect(before / mimicEvery(state)).toBeCloseTo(1.5);
    state.etherium.push('relics.c1');
    expect(relicMimicComes(state)).toBe(1.75);
    state.etherium.push('relics.c2', 'mimic.t3');
    expect(before / mimicEvery(state)).toBeCloseTo(4);
    // Une autre relique posée : plus rien.
    state.relics.active = 'loupe';
    expect(relicMimicComes(state)).toBe(1);
  });
});
