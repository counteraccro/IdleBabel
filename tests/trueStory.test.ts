import { describe, expect, it, vi } from 'vitest';
import { loadGame, saveGame } from '../src/core/save';
import { createInitialState } from '../src/core/state';
import { STARS, starById } from '../src/data/etheriumStars';
import { SEALS } from '../src/data/seals';
import { ANOMALIES, HINTS_AFTER_PRESTIGE, hintSeal } from '../src/data/anomalies';
import { BRIBE_PAGES } from '../src/data/trueStory';
import { lightStar } from '../src/systems/etherium';
import { toolRate } from '../src/systems/production';
import { refundCurtain } from '../src/core/removedCurtain';
import { hintFindable } from '../src/systems/findable';
import { libraryBookCount } from '../src/systems/library';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';

const TOME = 'explore.d0';

describe('« Qui j’étais », le tome 1 (18/10 : le Rideau supprimé)', () => {
  it('une petite pointe de la Rose des vents, le Nord-Est, à 5 Éther ; plus de Rideau', () => {
    expect(starById(TOME)?.cost).toBe(5);
    expect(STARS.some((star) => star.id.startsWith('curtain.'))).toBe(false);
    const state = createInitialState('fr', 0, 1);
    state.ether = 5;
    expect(lightStar(state, TOME)).toBe(true);
    expect(state.ether).toBe(0);
  });

  it('acheté : le livre, le sceau « À suivre. », et +15 % aux méthodes de l’Âge Manuel seulement', () => {
    const state = createInitialState('fr', 0, 1);
    state.tools.diagonal = 10;
    state.tools.metronome = 1;
    const manual = toolRate(state, 'diagonal');
    const automatic = toolRate(state, 'metronome');
    const seal = (id: string) => SEALS.find((one) => one.id === id)!.reached!(state);
    expect(seal('toBeContinued')).toBe(false);
    const count = libraryBookCount(state);
    state.etherium.push(TOME);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(manual * 1.15);
    expect(toolRate(state, 'metronome')).toBeCloseTo(automatic);
    expect(seal('toBeContinued')).toBe(true);
    expect(libraryBookCount(state)).toBe(count + 1);
    // L'aveu « Pas celui-ci. » attend le tome 11.
    expect(seal('notThisOne')).toBe(false);
  });

  it('une partie qui avait allumé le Rideau récupère son Éther, et garde son tome', () => {
    const state = createInitialState('fr', 0, 1);
    state.ether = 3;
    state.etherium = ['explore.c', 'curtain.c0', 'curtain.lm', 'curtain.rm'];
    const after = refundCurtain(state);
    expect(after.ether).toBe(3 + 10 + 25 + 60);
    expect(after.etherium).toEqual(['explore.c', TOME]);
    const untouched = createInitialState('fr', 0, 1);
    expect(refundCurtain(untouched)).toBe(untouched);
  });

  it('au chargement d’une sauvegarde, avant que les étoiles inconnues ne soient oubliées', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => (store[key] = value),
    });
    const state = createInitialState('fr', 0, 1);
    state.ether = 3;
    state.etherium = ['explore.e', 'curtain.c0'];
    saveGame(state);
    const loaded = loadGame('fr');
    expect(loaded.ether).toBe(13);
    expect(loaded.etherium).toEqual(['explore.e', TOME]);
    vi.unstubAllGlobals();
  });

  it('son indice existe, et ne tombe qu’après un premier prestige ; celui de « Pas celui-ci. » ne tombe pas', () => {
    expect(ANOMALIES.some((sentence) => sentence.id === 'hintToBeContinued')).toBe(true);
    expect(hintSeal('hintToBeContinued')).toBe('toBeContinued');
    expect(HINTS_AFTER_PRESTIGE).toContain('hintToBeContinued');
    const state = createInitialState('fr', 0, 1);
    state.etherReceived = 1;
    expect(hintFindable(state, 'hintNotThisOne')).toBe(false);
    expect(hintFindable(state, 'hintToBeContinued')).toBe(true);
  });

  it('une bribe par page, dans chaque langue ; une dédicace pour le tome 1', async () => {
    for (const texts of [fr, en]) expect(texts.trueStory.bribes).toHaveLength(BRIBE_PAGES.length);
    for (const ui of [(await import('../src/i18n/fr/ui.json')).default, (await import('../src/i18n/en/ui.json')).default])
      expect(ui.endings.dedications[0]).toBeTruthy();
  });
});

describe('« L’histoire de Babel », la saga (17/10)', () => {
  it('onze tomes : un titre, un résumé (phrase + éditeur), une salle chacun, en français et en anglais', async () => {
    const { TOME_SHOTS, tomeIsbn } = await import('../src/data/sagaTomes');
    const { ENDING_TOMES } = await import('../src/systems/endings');
    const uiFr = (await import('../src/i18n/fr/ui.json')).default.endings;
    const uiEn = (await import('../src/i18n/en/ui.json')).default.endings;
    expect(TOME_SHOTS).toHaveLength(ENDING_TOMES);
    for (const ui of [uiFr, uiEn]) {
      expect(ui.titles).toHaveLength(ENDING_TOMES);
      expect(ui.blurbs).toHaveLength(ENDING_TOMES);
      for (const blurb of ui.blurbs) expect(blurb).toHaveLength(2);
    }
    // Le tome 1 est « Qui j'étais » : le même titre partout.
    expect(fr.trueStory.name).toBe(uiFr.titles[0]);
    expect(en.trueStory.name).toBe(uiEn.titles[0]);
    expect(tomeIsbn(0)).toBe('978-2-410-00014-1');
    expect(new Set(TOME_SHOTS.map((_, i) => tomeIsbn(i))).size).toBe(ENDING_TOMES);
  });
});
