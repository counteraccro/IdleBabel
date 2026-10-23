import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { gameRandom } from '../src/core/random';
import { S } from '../src/data/etheriumStars';
import { TOME_BRIBE_PAGES } from '../src/data/trueStory';
import { SEALS } from '../src/data/seals';
import { hintSeal } from '../src/data/anomalies';
import { READING_TOME_CHANCE, takeTome, tomeAt, tomeFound } from '../src/systems/endings';
import { readWhileAway } from '../src/systems/awayReading';
import { rareBookAt } from '../src/systems/rareBooks';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { hintFindable } from '../src/systems/findable';
import { checkSeals } from '../src/systems/seals';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import uiFr from '../src/i18n/fr/ui.json';
import uiEn from '../src/i18n/en/ui.json';

vi.stubGlobal('window', new EventTarget());

const DAY = new Date(2026, 9, 23, 12).getTime();

/** Le premier livre (après le livre étrange) qui cache un tome, sans être un livre rare. */
const tomeBookIndex = (state: ReturnType<typeof createInitialState>): number => {
  for (let index = 3; ; index += 1) if (gameRandom(`tome:${index}`)() < READING_TOME_CHANCE && !rareBookAt(state, index)) return index;
};

/** Une partie où les tomes 1 à 4 sont trouvés. */
const fourTomes = () => {
  const state = createInitialState('fr', DAY);
  state.etherium.push(S.trueStory);
  state.sagaTomes = [2, 3, 4];
  return state;
};

describe('« La sortie », le tome 5, trouvé en lisant (23/10)', () => {
  it('neuf bribes, la dernière à la page 410, dans chaque langue ; sa dédicace', () => {
    expect(TOME_BRIBE_PAGES[4]).toHaveLength(9);
    expect(TOME_BRIBE_PAGES[4].at(-1)).toBe(410);
    for (const texts of [fr, en]) expect(texts.trueStory.tomes[3]).toHaveLength(9);
    for (const ui of [uiFr, uiEn]) expect(ui.endings.dedications[4]).toBeTruthy();
  });

  it('un livre le cache : pris en main, le tome suivant est rangé, sans être montré une seconde fois', () => {
    const state = fourTomes();
    const index = tomeBookIndex(state);
    expect(tomeAt(state, index - 1)).toBeUndefined();
    expect(takeTome(state, index, true)).toBe(4);
    expect(tomeFound(state, 4)).toBe(true);
    expect(state.tomeFrom).toEqual({ reading: 5 });
    expect(state.tomeToShow).toBeNull();
    expect(Object.keys(state.rareBooks)).toHaveLength(0);
    // Le livre le garde ; la lecture n'en donne plus d'autre.
    expect(tomeAt(state, index)).toBe(4);
    expect(tomeAt(state, tomeBookIndex({ ...state, sagaTomes: [] }))).toBe(4);
  });

  it('toujours le suivant, et rien sans le tome 1', () => {
    const state = createInitialState('fr', DAY);
    const index = tomeBookIndex(state);
    expect(tomeAt(state, index)).toBeUndefined();
    state.etherium.push(S.trueStory);
    expect(takeTome(state, index, true)).toBe(1);
    expect(state.tomeFrom).toEqual({ reading: 2 });
  });

  it('pris pendant une absence, il sera montré au retour', () => {
    const state = fourTomes();
    const index = tomeBookIndex(state);
    state.booksFinished = index - 1;
    readWhileAway(state, PAGES_PER_BOOK * 2, () => 0);
    expect(state.tomeBook).toBe(index);
    expect(state.tomeToShow).toBe(4);
  });

  it('son sceau, nommé d’après son premier tome ; son indice attend le tome 1', () => {
    const state = createInitialState('fr', DAY);
    const seal = SEALS.find((one) => one.id === 'tomeReading')!;
    expect(seal.tomeFrom).toBe('reading');
    expect(hintSeal('hintTomeReading')).toBe('tomeReading');
    expect(hintFindable(state, 'hintTomeReading')).toBe(false);
    state.etherium.push(S.trueStory);
    state.sagaTomes = [2, 3, 4];
    expect(hintFindable(state, 'hintTomeReading')).toBe(true);
    takeTome(state, tomeBookIndex(state), true);
    checkSeals(state, DAY);
    expect('tomeReading' in state.seals).toBe(true);
  });
});
