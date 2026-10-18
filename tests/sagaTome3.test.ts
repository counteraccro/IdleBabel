import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { S } from '../src/data/etheriumStars';
import { TOME_BRIBE_PAGES } from '../src/data/trueStory';
import { MIMIC_TOME_CHANCE } from '../src/data/mimic';
import { catchMimic, spawnMimic } from '../src/systems/mimic';
import { drawLottery, forceDraw } from '../src/systems/lottery';
import { nextTome, tomeFound } from '../src/systems/endings';
import { toolRate } from '../src/systems/production';
import { SEALS } from '../src/data/seals';
import { hintSeal } from '../src/data/anomalies';
import { hintFindable } from '../src/systems/findable';
import { checkSeals } from '../src/systems/seals';
import { keepJackpotTome } from '../src/core/tomeSources';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import uiFr from '../src/i18n/fr/ui.json';
import uiEn from '../src/i18n/en/ui.json';
import sealsFr from '../src/i18n/fr/strangeBook.json';
import sealsEn from '../src/i18n/en/strangeBook.json';

vi.stubGlobal('window', new EventTarget());

/** Une partie au tome 1 acheté, la Mimic achetée, qui lit aux trois Âges. */
const reading = () => {
  const state = createInitialState('fr', 0, 1);
  state.etherium.push(S.trueStory, S.mimic);
  state.tools.diagonal = 10;
  state.tools.metronome = 1;
  state.tools.minitel = 1;
  return state;
};

/** Attrape une Mimic : `tome` dit si elle lâche un tome (le second tirage ; le premier, le jeton). */
const catchOne = (state: ReturnType<typeof reading>, tome: boolean) => {
  spawnMimic(state, () => 0.5, 0);
  const draws = [0.99, tome ? MIMIC_TOME_CHANCE / 2 : 0.99];
  return catchMimic(state, 1000, () => draws.shift() ?? 0.99)!;
};

describe('« La porte », le tome 3 (18/10)', () => {
  it('neuf bribes, la dernière à la page 410, dans chaque langue ; sa dédicace ; les noms des sceaux des tomes', () => {
    expect(TOME_BRIBE_PAGES[2]).toHaveLength(9);
    expect(TOME_BRIBE_PAGES[2].at(-1)).toBe(410);
    for (const texts of [fr, en]) expect(texts.trueStory.tomes[1]).toHaveLength(9);
    for (const ui of [uiFr, uiEn]) expect(ui.endings.dedications[2]).toBeTruthy();
    // Chaque tome qui se gagne a la phrase de son sceau.
    for (const texts of [sealsFr, sealsEn])
      for (let tome = 2; tome <= TOME_BRIBE_PAGES.length; tome += 1) expect(texts.tomeSeals[String(tome) as '2']).toBeTruthy();
  });

  it('une Mimic attrapée lâche le tome suivant, une fois sur vingt ; le tome 3 fait lire 15 % plus vite l’Âge Numérique', () => {
    const state = reading();
    expect(catchOne(state, false).tome).toBeUndefined();
    expect(state.sagaTomes).toEqual([]);
    // Toujours le suivant : d'une Mimic, d'abord le tome 2.
    expect(catchOne(state, true).tome).toBe(1);
    expect(state.tomeFrom).toEqual({ mimic: 2 });
    // Puis le gros lot donne le tome 3.
    const digital = toolRate(state, 'minitel');
    const automatic = toolRate(state, 'metronome');
    state.lottery.tokens = 1;
    forceDraw('jackpot');
    expect(drawLottery(state)?.tome).toBe(2);
    expect(state.tomeFrom).toEqual({ mimic: 2, jackpot: 3 });
    expect(state.tomeToShow).toBe(2);
    expect(toolRate(state, 'minitel')).toBeCloseTo(digital * 1.15);
    expect(toolRate(state, 'metronome')).toBeCloseTo(automatic);
    // Le tome 4 n'est pas encore écrit : la Mimic ne lâche plus rien.
    expect(nextTome(state)).toBeUndefined();
    expect(catchOne(state, true).tome).toBeUndefined();
  });

  it('rien sans le tome 1', () => {
    const state = reading();
    state.etherium = [S.mimic];
    expect(catchOne(state, true).tome).toBeUndefined();
    expect(tomeFound(state, 1)).toBe(false);
  });

  it('le sceau de la Mimic, nommé d’après son premier tome ; son indice attend la Mimic et le tome 1', () => {
    const state = reading();
    const seal = SEALS.find((one) => one.id === 'tomeMimic')!;
    expect(seal.tomeFrom).toBe('mimic');
    expect(hintSeal('hintTomeMimic')).toBe('tomeMimic');
    expect(hintFindable(state, 'hintTomeMimic')).toBe(true);
    state.etherium = [S.trueStory];
    expect(hintFindable(state, 'hintTomeMimic')).toBe(false);
    state.etherium = [S.mimic];
    expect(hintFindable(state, 'hintTomeMimic')).toBe(false);
    state.etherium = [S.trueStory, S.mimic];
    catchOne(state, true);
    expect(seal.reached(state)).toBe(true);
    // La boucle du jeu vérifie les sceaux.
    checkSeals(state);
    expect('tomeMimic' in state.seals).toBe(true);
  });

  it('une partie qui avait le tome 2 (le sceau « Là-bas. ») l’a gagné au gros lot', () => {
    const state = reading();
    state.sagaTomes = [2];
    state.seals = { overThere: 5 };
    state.written = { hintOverThere: [1] };
    state.newSeals = ['overThere'];
    const kept = keepJackpotTome(state);
    expect(kept.tomeFrom).toEqual({ jackpot: 2 });
    expect(kept.seals).toEqual({ tomeJackpot: 5 });
    expect(kept.written).toEqual({ hintTomeJackpot: [1] });
    expect(kept.newSeals).toEqual(['tomeJackpot']);
  });
});
