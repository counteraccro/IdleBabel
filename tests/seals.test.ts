import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { SEALS, sealSeries } from '../src/data/seals';
import { sigil } from '../src/ui/strangeBook/sigil';
import { babelName, checkSeals, completion, sealEvent } from '../src/systems/seals';
import { LOCALES } from '../src/i18n/locales';
import { ANOMALIES } from '../src/data/anomalies';
import { segments, write } from '../src/systems/sentences';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { findChance } from '../src/systems/knowledge';
import { BASE_FIND_CHANCE } from '../src/data/knowledge';

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

  it("scelle une famille d'anomalies quand toutes ses phrases sont complètes", () => {
    const state = createInitialState('fr');
    const [last, ...rest] = ANOMALIES.filter((anomaly) => anomaly.family === 'speaks');
    for (const anomaly of rest)
      write(
        state,
        anomaly.id,
        segments(anomaly.id).map((_, index) => index),
      );
    checkSeals(state, 1);
    expect(state.seals['anomalies-speaks']).toBeUndefined();
    write(
      state,
      last.id,
      segments(last.id).map((_, index) => index),
    );
    checkSeals(state, 2);
    expect(state.seals['anomalies-speaks']).toBe(2);
    expect(state.seals['anomalies-said']).toBeUndefined();
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

  it('dessine un sigle différent pour chaque sceau', () => {
    const drawn = SEALS.map((seal) => JSON.stringify(sigil(sealSeries(seal), seal.tier?.index ?? 0)));
    expect(new Set(drawn).size).toBe(SEALS.length);
  });

  it('scelle une intuition comprise jusqu’au bout ; une sans fin, au niveau 10 ; le Flair, quand il ne reste rien à trouver', () => {
    const state = createInitialState('fr');
    state.technologies = { ariadne: 2, deepSleep: 9 };
    checkSeals(state, 1);
    expect(state.seals['intuition-ariadne']).toBeUndefined();
    expect(state.seals['intuition-deepSleep']).toBeUndefined();
    state.technologies = { ariadne: 3, deepSleep: 10, armful: 3 };
    checkSeals(state, 2);
    expect(state.seals['intuition-ariadne']).toBe(2);
    expect(state.seals['intuition-deepSleep']).toBe(2);
    expect(state.seals['intuition-armful']).toBe(2);
    expect(state.seals['intuition-flair']).toBeUndefined();
    for (const book of RARE_BOOKS) state.rareBooks[book.id] = 1;
    checkSeals(state, 3);
    expect(state.seals['intuition-flair']).toBe(3);
  });

  it('chaque sceau obtenu ajoute 1 % à la chance de trouvaille', () => {
    const state = createInitialState('fr');
    expect(findChance(state)).toBeCloseTo(BASE_FIND_CHANCE);
    for (const seal of SEALS.slice(0, 50)) state.seals[seal.id] = 1;
    expect(findChance(state)).toBeCloseTo(BASE_FIND_CHANCE * 1.5);
    // Un sceau inconnu (renommé, retiré) ne compte pas.
    state.seals['inconnu'] = 1;
    expect(findChance(state)).toBeCloseTo(BASE_FIND_CHANCE * 1.5);
  });
});
