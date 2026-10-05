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

  it('scelle chaque méthode à 1, 25, 50, 100, 150 et 500 exemplaires dans une même partie', () => {
    for (const tool of ['diagonal', 'finger', 'voice', 'lectern', 'ladder'])
      expect(SEALS.filter((seal) => seal.text === tool).map((seal) => seal.tier?.n)).toEqual([1, 25, 50, 100, 150, 500]);
    const state = createInitialState('fr');
    state.tools.diagonal = 30;
    checkSeals(state, 1);
    expect(state.seals['diagonal-25']).toBe(1);
    expect(state.seals['diagonal-50']).toBeUndefined();
  });

  it('scelle les pages lues par une méthode, en multiples de son prix de base', () => {
    expect(SEALS.filter((seal) => seal.text === 'ladderPages').map((seal) => seal.tier?.n)).toEqual([6e8, 6e10, 6e12, 6e14, 6e16, 6e19]);
    const state = createInitialState('fr');
    state.methodPages.diagonal = 20_000;
    checkSeals(state, 1);
    expect(state.seals['diagonalPages-15000']).toBe(1);
    expect(state.seals['diagonalPages-1500000']).toBeUndefined();
  });

  it('scelle les pages lues depuis toujours, sur leur propre page : par les méthodes jusqu’à 10³⁰, à la main jusqu’à 10²⁴', () => {
    const steps = (text: string) => SEALS.filter((seal) => seal.text === text).map((seal) => seal.tier?.n);
    expect(steps('pagesByMethods')).toEqual([1, 1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e27, 1e30]);
    expect(steps('pagesByHand')).toEqual([1, 1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24]);
    expect(SEALS.filter((seal) => seal.page === 1).every((seal) => seal.plate === 'pages')).toBe(true);
    const state = createInitialState('fr');
    state.pagesByMethods = 2e6;
    state.pagesByHand = 999;
    checkSeals(state, 1);
    expect(state.seals['pagesByMethods-1000000']).toBe(1);
    expect(state.seals['pagesByMethods-1000000000']).toBeUndefined();
    expect(state.seals['pagesByHand-1']).toBe(1);
    expect(state.seals['pagesByHand-1000']).toBeUndefined();
  });

  it('scelle les volumes de méthodes : 410 achetées dans la partie chacun, jusqu’à neuf', () => {
    expect(SEALS.filter((seal) => seal.text === 'methodsBought').map((seal) => seal.tier?.n)).toEqual([
      410, 820, 1230, 1640, 2050, 2460, 2870, 3280, 3690,
    ]);
    const state = createInitialState('fr');
    state.tools.diagonal = 500;
    state.tools.finger = 400;
    checkSeals(state, 1);
    expect(state.seals['methodsBought-820']).toBe(1);
    expect(state.seals['methodsBought-1230']).toBeUndefined();
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
