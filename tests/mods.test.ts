import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { clearHooks, hookAllows, hookProduct, registerHook, runHooks } from '../src/mods/hooks';
import { clearMods, collectModData, modVersion, registerMod, startLoading } from '../src/mods/registry';
import { readJsonMod } from '../src/mods/jsonMod';
import { clearModSeals, modSealId } from '../src/mods/modSeals';
import { SEALS } from '../src/data/seals';
import { checkSeals, completion, plateSeals } from '../src/systems/seals';
import { pagesPerSecond } from '../src/systems/production';
import { readPage } from '../src/systems/click';
import { advanceMimic } from '../src/systems/mimic';
import { loadSavedMods, removeMod, switchMod } from '../src/mods/loader';
import { clearHeldBookReplacement, heldBookReplacement, HELD_BOOK_REPLACED, replaceHeldBook } from '../src/mods/heldBook';

vi.stubGlobal('window', new EventTarget());

afterEach(() => {
  clearHooks();
  clearMods();
  clearModSeals();
  clearHeldBookReplacement();
});

describe('Les mods', () => {
  it('ne sont jamais actifs d’office : une nouvelle partie n’en a aucun (demande de l’auteur, 15/10)', () => {
    const state = createInitialState('fr');
    expect(state.mods).toEqual([]);
    expect(state.modded).toBeNull();
  });

  it('multiplient la lecture et le clic par leurs crochets, sans rien changer sans mod', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 10;
    const before = pagesPerSecond(state);
    registerHook('reading', () => 2);
    registerHook('reading', () => 1.5);
    expect(pagesPerSecond(state)).toBeCloseTo(before * 3);
    readPage(state);
    const byHand = state.pagesByHand;
    registerHook('click', () => 10);
    readPage(state);
    expect(state.pagesByHand - byHand).toBeCloseTo(byHand * 10);
  });

  it('ne font pas planter le jeu : un crochet qui plante ou rend n’importe quoi est sauté', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerHook('reading', () => {
      throw new Error('cassé');
    });
    registerHook('reading', () => Number.NaN);
    expect(hookProduct('reading')).toBe(1);
    const ticks: number[] = [];
    registerHook('tick', () => {
      throw new Error('cassé');
    });
    registerHook('tick', (seconds) => ticks.push(seconds));
    runHooks('tick', 0.1);
    expect(ticks).toEqual([0.1]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('empêchent la Mimic de venir (le mod « Sans Mimic »)', () => {
    const state = createInitialState('fr');
    state.etherium = ['explore.e'];
    expect(hookAllows('mimic')).toBe(true);
    registerHook('mimic', () => false);
    expect(advanceMimic(state, 1, () => 0.0001)).toBe(false);
    expect(state.mimic.at).toBeNull();
  });

  it('gardent leurs données dans la sauvegarde, rendues à leur load après init', () => {
    const state = createInitialState('fr');
    state.modData.compteur = '41';
    const calls: string[] = [];
    let count = 0;
    registerMod(state, 'compteur', {
      init: () => calls.push('init'),
      load: (text) => {
        calls.push('load');
        count = Number(text);
      },
      save: () => String(count + 1),
    });
    expect(calls).toEqual(['init', 'load']);
    collectModData(state);
    expect(state.modData.compteur).toBe('42');
    // Un nom déjà pris est refusé.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(registerMod(state, 'compteur', {})).toBe(false);
    error.mockRestore();
  });

  it('en données (.json) : leurs sceaux, sur la planche « Mods », hors de l’avancement du livre étrange', () => {
    const state = createInitialState('fr');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const read = readJsonMod(state, {
      id: 'essai',
      seals: [
        { id: 'cent', name: 'Cent', text: { fr: 'Lis cent pages', en: 'Read a hundred pages' }, when: { pagesRead: 100 } },
        { id: 'faux', name: 'Faux', text: 'Rien', when: { inconnu: 1 } },
      ],
    });
    error.mockRestore();
    expect(read).toBe(true);
    expect(plateSeals('mods').map((seal) => seal.id)).toEqual([modSealId('essai', 'cent')]);
    state.totalPagesRead = 100;
    checkSeals(state);
    expect(modSealId('essai', 'cent') in state.seals).toBe(true);
    // Seuls les sceaux du jeu comptent.
    expect(completion(state)).toBe((Object.keys(state.seals).length - 1) / SEALS.length);
  });

  it('marquent la partie : le sceau secret « Triche », pour toujours', () => {
    const state = createInitialState('fr');
    checkSeals(state);
    expect('cheat' in state.seals).toBe(false);
    state.modded = Date.now();
    checkSeals(state);
    expect('cheat' in state.seals).toBe(true);
  });

  it('se désactivent sans quitter la liste du joueur, ou s’en suppriment', async () => {
    const state = createInitialState('fr');
    state.mods = ['mods/a/a.js', 'mods/b/b.js'];
    switchMod(state, 'mods/a/a.js', false);
    expect(state.modsOff).toEqual(['mods/a/a.js']);
    // Les deux désactivés : rien à charger (aucun script posé).
    switchMod(state, 'mods/b/b.js', false);
    await loadSavedMods(state);
    switchMod(state, 'mods/a/a.js', true);
    expect(state.modsOff).toEqual(['mods/b/b.js']);
    removeMod(state, 'mods/b/b.js');
    expect(state.mods).toEqual(['mods/a/a.js']);
    expect(state.modsOff).toEqual([]);
  });

  it('remplacent le livre en main par une seule vue, la dernière, et le livre en est prévenu (la liseuse, 15/10)', () => {
    expect(heldBookReplacement()).toBeNull();
    const told = vi.fn();
    window.addEventListener(HELD_BOOK_REPLACED, told);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const first = () => ({ root: {} as HTMLElement });
    const second = () => ({ root: {} as HTMLElement });
    replaceHeldBook(first);
    replaceHeldBook(second);
    replaceHeldBook('pas une fonction' as never);
    expect(heldBookReplacement()).toBe(second);
    expect(told).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    window.removeEventListener(HELD_BOOK_REPLACED, told);
  });

  it('gardent la version que dit chaque mod, pour le cahier (demande de l’auteur, 15/10)', () => {
    const state = createInitialState('fr');
    startLoading('https://exemple.org/a.js');
    registerMod(state, 'a', { version: '2.1.0' });
    startLoading('https://exemple.org/b.json');
    readJsonMod(state, { id: 'b', version: '0.3.0', seals: [] });
    startLoading('https://exemple.org/c.js');
    registerMod(state, 'c', {});
    startLoading(null);
    expect(modVersion('https://exemple.org/a.js')).toBe('2.1.0');
    expect(modVersion('https://exemple.org/b.json')).toBe('0.3.0');
    expect(modVersion('https://exemple.org/c.js')).toBeUndefined();
  });
});
