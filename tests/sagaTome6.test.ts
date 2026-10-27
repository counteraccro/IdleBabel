import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { S } from '../src/data/etheriumStars';
import { TOME_BRIBE_PAGES } from '../src/data/trueStory';
import { SEALS } from '../src/data/seals';
import { hintSeal } from '../src/data/anomalies';
import { HUNDRED_SEALS, tomeFound } from '../src/systems/endings';
import { hintFindable } from '../src/systems/findable';
import { checkSeals } from '../src/systems/seals';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import uiFr from '../src/i18n/fr/ui.json';
import uiEn from '../src/i18n/en/ui.json';

vi.stubGlobal('window', new EventTarget());

const DAY = new Date(2026, 9, 23, 12).getTime();

/** Une partie où les tomes 1 à 5 sont trouvés. */
const fiveTomes = () => {
  const state = createInitialState('fr', DAY);
  state.etherium.push(S.trueStory);
  state.sagaTomes = [2, 3, 4, 5];
  return state;
};

describe('« Comme avant », le tome 6, au centième sceau (23/10)', () => {
  it('neuf bribes, la dernière à la page 410, dans chaque langue ; sa dédicace', () => {
    expect(TOME_BRIBE_PAGES[5]).toHaveLength(9);
    expect(TOME_BRIBE_PAGES[5].at(-1)).toBe(410);
    for (const texts of [fr, en]) expect(texts.trueStory.tomes[4]).toHaveLength(9);
    for (const ui of [uiFr, uiEn]) expect(ui.endings.dedications[5]).toBeTruthy();
  });

  it('le palier des 100 sceaux donne le tome suivant, une seule fois, et son sceau dans la même passe', () => {
    const state = fiveTomes();
    checkSeals(state, DAY);
    expect(tomeFound(state, 5)).toBe(false);
    state.seals[HUNDRED_SEALS] = DAY;
    checkSeals(state, DAY);
    expect(tomeFound(state, 5)).toBe(true);
    expect(state.tomeToShow).toBe(5);
    expect(state.tomeFrom).toEqual({ seals: 6 });
    expect('tomeSeals' in state.seals).toBe(true);
    state.sagaTomes = [2, 3, 4, 5];
    checkSeals(state, DAY);
    expect(tomeFound(state, 5)).toBe(false);
  });

  it('atteint sans le tome 1, il attend qu’il soit acheté ; toujours le suivant', () => {
    const state = createInitialState('fr', DAY);
    state.seals[HUNDRED_SEALS] = DAY;
    checkSeals(state, DAY);
    expect(state.tomeFrom).toEqual({});
    state.etherium.push(S.trueStory);
    // Le tome 1 acheté est d'abord montré en main : le tome 2 ne prend pas sa place.
    state.tomeToShow = 0;
    checkSeals(state, DAY);
    expect(state.tomeFrom).toEqual({});
    expect(state.tomeToShow).toBe(0);
    state.tomeToShow = null;
    checkSeals(state, DAY);
    expect(state.tomeFrom).toEqual({ seals: 2 });
    expect(state.tomeToShow).toBe(1);
  });

  it('son sceau secret et son indice, qui attend le tome 1', () => {
    const state = createInitialState('fr', DAY);
    expect(SEALS.find((one) => one.id === 'tomeSeals')?.tomeFrom).toBe('seals');
    expect(hintSeal('hintTomeSeals')).toBe('tomeSeals');
    expect(hintFindable(state, 'hintTomeSeals')).toBe(false);
    state.etherium.push(S.trueStory);
    expect(hintFindable(state, 'hintTomeSeals')).toBe(true);
  });
});
