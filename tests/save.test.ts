import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSave, loadGame, saveGame } from '../src/core/save';
import { SAVE_VERSION, createInitialState } from '../src/core/state';

const SAVE_KEY = 'idle-babel-save';

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

describe('sauvegarde', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('commence une nouvelle partie sans sauvegarde', () => {
    const state = loadGame('en');
    expect(state.locale).toBe('en');
    expect(state.pages).toBe(0);
  });

  it('retrouve la partie enregistrée', () => {
    const state = createInitialState('fr');
    state.pages = 42;
    state.tools.diagonal = 3;
    saveGame(state);
    const loaded = loadGame('en');
    expect(loaded.pages).toBe(42);
    expect(loaded.tools.diagonal).toBe(3);
    expect(loaded.locale).toBe('fr');
  });

  it('complète une vieille sauvegarde avec les réglages, statistiques et champs apparus depuis', () => {
    const old = { version: SAVE_VERSION, pages: 500, settings: { autoTurn: false }, stats: { clicks: 7 }, tools: {} };
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = loadGame('fr');
    expect(loaded.settings.autoTurn).toBe(false);
    expect(loaded.settings.bookSway).toBe(true);
    expect(loaded.stats.clicks).toBe(7);
    expect(loaded.stats.fragments).toBe(0);
    expect(loaded.tools.finger).toBe(0);
    // Pas encore de total à vie : il part des pages en stock.
    expect(loaded.totalPagesRead).toBe(500);
  });

  it("oublie les trouvailles d'avant le livre blanc (sans phrase)", () => {
    const state = createInitialState('fr');
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...state,
        finds: [
          { kind: 'word', text: 'ancien' },
          { kind: 'word', sentence: 'diagonal', segment: 0 },
        ],
      }),
    );
    expect(loadGame('fr').finds).toEqual([{ kind: 'word', sentence: 'diagonal', segment: 0 }]);
  });

  it("repart de zéro sur une sauvegarde illisible ou d'une autre version", () => {
    localStorage.setItem(SAVE_KEY, '{pas du json');
    expect(loadGame('fr').pages).toBe(0);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...createInitialState('fr'), version: SAVE_VERSION + 1, pages: 99 }));
    expect(loadGame('fr').pages).toBe(0);
  });

  it('efface la sauvegarde', () => {
    const state = createInitialState('fr');
    state.pages = 10;
    saveGame(state);
    deleteSave();
    expect(loadGame('fr').pages).toBe(0);
  });
});
