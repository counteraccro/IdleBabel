import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { S } from '../src/data/etheriumStars';
import { TOME_BRIBE_PAGES } from '../src/data/trueStory';
import { drawLottery, forceDraw } from '../src/systems/lottery';
import { nextTome, tomeFound } from '../src/systems/endings';
import { toolRate } from '../src/systems/production';
import { SEALS } from '../src/data/seals';
import { ANOMALIES, hintSeal } from '../src/data/anomalies';
import { hintFindable } from '../src/systems/findable';
import { drawResults } from '../src/ui/library/lotteryText';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import uiFr from '../src/i18n/fr/ui.json';
import uiEn from '../src/i18n/en/ui.json';

vi.stubGlobal('window', new EventTarget());

/** Une partie qui lit aux deux premiers Âges, avec des jetons. */
const reading = () => {
  const state = createInitialState('fr', 0, 1);
  state.tools.diagonal = 10;
  state.tools.metronome = 1;
  state.lottery.tokens = 5;
  return state;
};

describe('« On en parlait tout bas », le tome 2 (18/10)', () => {
  it('neuf bribes, la dernière à la page 410, dans chaque langue ; sa dédicace', () => {
    expect(TOME_BRIBE_PAGES[1]).toHaveLength(9);
    expect(TOME_BRIBE_PAGES[1].at(-1)).toBe(410);
    for (const texts of [fr, en]) expect(texts.trueStory.tomes[0]).toHaveLength(9);
    for (const ui of [uiFr, uiEn]) expect(ui.endings.dedications[1]).toBeTruthy();
  });

  it('aucun tome à gagner tant que le tome 1 n’est pas acheté : le gros lot donne « rien »', () => {
    const state = reading();
    expect(nextTome(state)).toBeUndefined();
    forceDraw('jackpot');
    expect(drawLottery(state)?.outcome).toBe('nothing');
    expect(tomeFound(state, 1)).toBe(false);
  });

  it('le gros lot donne le tome suivant, une fois ; il fait lire 15 % plus vite l’Âge Automatique', () => {
    const state = reading();
    state.etherium.push(S.trueStory);
    expect(nextTome(state)).toBe(1);
    const manual = toolRate(state, 'diagonal');
    const automatic = toolRate(state, 'metronome');
    forceDraw('jackpot');
    const draw = drawLottery(state)!;
    expect(draw.outcome).toBe('jackpot');
    expect(draw.tome).toBe(1);
    expect(tomeFound(state, 1)).toBe(true);
    expect(state.sagaTomes).toEqual([2]);
    expect(toolRate(state, 'metronome')).toBeCloseTo(automatic * 1.15);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(manual);
    expect(drawResults(state, draw)[0].line).toBe('Tome II · On en parlait tout bas');
    // Le tome 3 n'est pas encore écrit : plus rien à gagner.
    expect(nextTome(state)).toBeUndefined();
    forceDraw('jackpot');
    expect(drawLottery(state)?.outcome).toBe('nothing');
    expect(state.sagaTomes).toEqual([2]);
  });

  it('son sceau secret « Là-bas. », au tome 2 rangé ; son indice tombe après un tirage, le tome 1 acheté', () => {
    const state = reading();
    const seal = SEALS.find((one) => one.id === 'overThere')!;
    expect(seal.plate).toBe('secrets');
    expect(seal.reached(state)).toBe(false);
    expect(ANOMALIES.some((sentence) => sentence.id === 'hintOverThere')).toBe(true);
    expect(hintSeal('hintOverThere')).toBe('overThere');
    expect(hintFindable(state, 'hintOverThere')).toBe(false);
    state.lottery.draws = 1;
    expect(hintFindable(state, 'hintOverThere')).toBe(false);
    state.etherium.push(S.trueStory);
    expect(hintFindable(state, 'hintOverThere')).toBe(true);
    forceDraw('jackpot');
    drawLottery(state);
    expect(seal.reached(state)).toBe(true);
    expect('overThere' in state.seals).toBe(true);
  });
});
