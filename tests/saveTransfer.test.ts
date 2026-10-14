import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportSave, importSave, loadGame, saveGame } from '../src/core/save';
import { createInitialState } from '../src/core/state';

/** Un stockage en mémoire, à la place de celui du navigateur. */
const memoryStorage = (): Storage => {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
};

/** Une partie avancée : pages, Éther, options, un nom avec accents. */
const played = () => {
  const state = createInitialState('fr');
  state.playerName = 'Zoé Œdipe';
  state.pages = 123_456;
  state.ether = 42;
  state.etherReceived = 50;
  state.settings.autoTurn = false;
  state.settings.notation = 'words';
  return state;
};

describe('exporter, importer', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('refuse une chaîne qui n’est pas une sauvegarde, ou coupée', () => {
    const code = exportSave(played());
    expect(importSave('bonjour', 'fr')).toBe(false);
    expect(importSave(code.slice(0, 200), 'fr')).toBe(false);
    expect(importSave(btoa('{"version":-1}') + '!END!', 'fr')).toBe(false);
    expect(localStorage.getItem('idle-babel-save')).toBeNull();
  });

  it('rend toute la partie, options comprises, même collée en morceaux ou encodée pour une URL', () => {
    const state = played();
    const code = exportSave(state);
    expect(code.endsWith('!END!')).toBe(true);
    // Cookie Clicker encode la fin (%21END%21) ; un courriel coupe les lignes.
    const pasted = encodeURIComponent(code).replace(/(.{60})/g, '$1\n');
    expect(importSave(pasted, 'en')).toBe(true);
    const loaded = loadGame('en');
    expect(loaded).toMatchObject({ playerName: 'Zoé Œdipe', pages: 123_456, ether: 42, etherReceived: 50, locale: 'fr' });
    expect(loaded.settings).toMatchObject({ autoTurn: false, notation: 'words' });
  });

  it('après un import, plus rien n’écrase la partie importée avant le rechargement', () => {
    expect(importSave(exportSave(played()), 'fr')).toBe(true);
    saveGame(createInitialState('fr'));
    expect(loadGame('fr').pages).toBe(123_456);
  });
});
