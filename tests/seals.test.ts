import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { SEALS } from '../src/data/seals';
import { babelName, checkSeals, completion, sealEvent } from '../src/systems/seals';
import { LOCALES } from '../src/i18n/locales';

describe('sceaux', () => {
  it('scelle un palier atteint, avec sa date, et pas les suivants', () => {
    const state = createInitialState('fr');
    state.totalPagesRead = 150;
    checkSeals(state, 1234);
    expect(state.seals['pagesRead-1']).toBe(1234);
    expect(state.seals['pagesRead-100']).toBe(1234);
    expect(state.seals['pagesRead-10000']).toBeUndefined();
  });

  it('scelle un secret sur un geste, une seule fois, et jamais par le tick', () => {
    const state = createInitialState('fr');
    checkSeals(state, 1);
    expect(state.seals.notebookBack).toBeUndefined();
    sealEvent(state, 'notebookBack', 5);
    sealEvent(state, 'notebookBack', 6);
    expect(state.seals.notebookBack).toBe(5);
    expect(state.newSeals.filter((id) => id === 'notebookBack')).toHaveLength(1);
  });

  it("garde la date d'origine d'un sceau déjà obtenu", () => {
    const state = createInitialState('fr');
    state.totalPagesRead = 1;
    checkSeals(state, 1);
    checkSeals(state, 2);
    expect(state.seals['pagesRead-1']).toBe(1);
  });

  it('calcule la part des sceaux obtenus', () => {
    const state = createInitialState('fr');
    expect(completion(state)).toBe(0);
    state.seals[SEALS[0].id] = 1;
    expect(completion(state)).toBeCloseTo(1 / SEALS.length);
  });

  it('a des identifiants uniques et un texte dans chaque langue', () => {
    expect(new Set(SEALS.map((seal) => seal.id)).size).toBe(SEALS.length);
    for (const messages of Object.values(LOCALES)) {
      const texts = (messages.strangeBook as { seals: Record<string, string> }).seals;
      for (const seal of SEALS) expect(texts[seal.text], seal.text).toBeTruthy();
    }
  });

  it('donne toujours le même nom de Babel au même sceau', () => {
    expect(babelName('pagesRead-1')).toBe(babelName('pagesRead-1'));
    expect(babelName('pagesRead-1')).not.toBe(babelName('pagesRead-100'));
  });
});
