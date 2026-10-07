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

  it("oublie les méthodes retirées de l'Âge Manuel (05/10)", () => {
    const state = createInitialState('fr') as unknown as Record<string, any>;
    state.tools.thumb = 12;
    state.tools.voice = 3;
    state.technologies = { mirrorGesture: 2, voiceGesture: 1 };
    state.written = { wide: [0, 1], voice: [0] };
    state.seals = { 'intuition-doubleGesture': 1, 'intuition-voiceGesture': 1 };
    state.history.push({ type: 'firstTool', at: 1, detail: 'thumb' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const loaded = loadGame('fr');
    expect(Object.keys(loaded.tools)).not.toContain('thumb');
    expect(loaded.tools.voice).toBe(3);
    expect(loaded.technologies).toEqual({ voiceGesture: 1 });
    expect(loaded.written).toEqual({ voice: [0] });
    expect(Object.keys(loaded.seals)).toEqual(['intuition-voiceGesture']);
    expect(loaded.history.some((entry) => entry.detail === 'thumb')).toBe(false);
  });

  it('rend l’Éther des anciens arbres de l’Etherium (07/10), garde les étoiles', () => {
    const state = createInitialState('fr') as unknown as Record<string, any>;
    state.ether = 2;
    state.etherium = { reading: 2, memory: 1, gone: 3 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const refunded = loadGame('fr');
    expect(refunded.ether).toBe(2 + 1 + 3 + 2);
    expect(refunded.etherium).toEqual([]);
    state.ether = 0;
    state.etherium = ['reading.s0', 'reading.nowhere'];
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const kept = loadGame('fr');
    expect(kept.ether).toBe(0);
    expect(kept.etherium).toEqual(['reading.s0']);
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

  it('garde la graine ; une partie d’avant les graines a la graine 0', () => {
    const state = createInitialState('fr');
    saveGame(state);
    expect(loadGame('fr').seed).toBe(state.seed);
    const { seed: _, ...old } = state;
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));
    expect(loadGame('fr').seed).toBe(0);
  });

  it('donne les Jokes de Papa aux parties qui avaient trouvé le Livre des morts', () => {
    const state = createInitialState('fr');
    state.rareBooks = { deadBook: 12, bible: 3 };
    state.seals = { 'rare-deadBook': 100, 'rare-bible': 50, firstBook: 10 };
    state.newSeals = ['rare-deadBook'];
    state.history.push({ type: 'rareBook', at: 100, detail: 'deadBook' });
    saveGame(state);
    const loaded = loadGame('fr');
    expect(loaded.rareBooks).toEqual({ dadJokes: 12, bible: 3 });
    expect(loaded.seals).toEqual({ 'rare-dadJokes': 100, 'rare-bible': 50, firstBook: 10 });
    expect(loaded.newSeals).toEqual(['rare-dadJokes']);
    expect(loaded.history.at(-1)?.detail).toBe('dadJokes');
  });

  it('donne le grand livre du X aux parties qui avaient trouvé Ta Justification', () => {
    const state = createInitialState('fr');
    state.rareBooks = { vindication: 40 };
    state.seals = { 'rare-vindication': 200 };
    saveGame(state);
    const loaded = loadGame('fr');
    expect(loaded.rareBooks).toEqual({ bigX: 40 });
    expect(loaded.seals).toEqual({ 'rare-bigX': 200 });
  });
});
