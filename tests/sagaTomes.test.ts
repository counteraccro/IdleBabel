import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { SAGA_TOMES, tomeIndex } from '../src/data/sagaTomes';
import { TRUE_STORY_BOOK } from '../src/data/trueStory';
import { ENDING_TOMES, fakeEndingsFound, tomeFound } from '../src/systems/endings';
import { SENTENCES } from '../src/data/sentences';
import { SEALS } from '../src/data/seals';
import { HINTS_LATER } from '../src/data/anomalies';
import { isComplete, segments, write } from '../src/systems/sentences';
import fr from '../src/i18n/fr/ui.json';
import en from '../src/i18n/en/ui.json';

describe('« L’histoire de Babel » : les onze tomes', () => {
  it('onze tomes : le premier est « Qui j’étais », les autres tome2 à tome11, chacun avec son titre', () => {
    expect(ENDING_TOMES).toBe(11);
    expect(SAGA_TOMES[0]).toBe(TRUE_STORY_BOOK);
    expect(SAGA_TOMES.slice(1)).toEqual(Array.from({ length: 10 }, (_, i) => `tome${i + 2}`));
    expect(tomeIndex('tome7')).toBe(6);
    expect(tomeIndex('alice')).toBe(-1);
    expect(fr.endings.titles).toHaveLength(11);
    expect(en.endings.titles).toHaveLength(11);
  });

  it('aucun tome au début ; les tomes 2 à 11 se comptent par leur numéro (le débogage les range tous)', () => {
    const state = createInitialState('fr', 0, 1);
    expect(SAGA_TOMES.some((_, index) => tomeFound(state, index))).toBe(false);
    expect(fakeEndingsFound(state)).toBe(0);
    state.sagaTomes = [3, 11];
    expect(tomeFound(state, 2)).toBe(true);
    expect(tomeFound(state, 10)).toBe(true);
    expect(tomeFound(state, 1)).toBe(false);
    expect(fakeEndingsFound(state)).toBe(2);
  });
});

describe('« Pas celui-ci. » attend le tome 11', () => {
  it('son indice ne tombe pas, et les sceaux « tout écrire » s’obtiennent sans lui', () => {
    const state = createInitialState('fr', 0, 1);
    for (const sentence of SENTENCES)
      if (!HINTS_LATER.includes(sentence.id))
        write(
          state,
          sentence.id,
          segments(sentence.id).map((_, index) => index),
        );
    expect(isComplete(state, 'hintNotThisOne')).toBe(false);
    for (const id of ['whiteBookFull', 'anomalies-hints']) expect(SEALS.find((seal) => seal.id === id)!.reached(state)).toBe(true);
  });
});
