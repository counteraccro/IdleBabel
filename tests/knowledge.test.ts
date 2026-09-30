import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { BASE_FIND_CHANCE, GUESS_PRICE, LUCK_PAGES, MAX_AWAY_SECONDS } from '../src/data/knowledge';
import { drawFind, findText, findWhileAway, gainFind, rollFind } from '../src/systems/knowledge';
import { completion, currentTarget, guess, isComplete, segments, toolUnlocked, write } from '../src/systems/sentences';
import { decipher, decipherPrice, isDeciphered } from '../src/systems/decipher';
import { PARTS } from '../src/data/decipher';
import { SENTENCES } from '../src/data/sentences';
import { LOCALES } from '../src/i18n/locales';

/** Tirages rejoués dans l'ordre, puis 0,5. */
const sequence = (...values: number[]) => () => values.shift() ?? 0.5;

/** Une partie où la première trouvaille (le coup de chance) a déjà eu lieu. */
const started = () => {
  const state = createInitialState('fr');
  state.lifetimeKnowledge = 1;
  return state;
};

describe('phrases du livre blanc', () => {
  it('ont le même nombre de morceaux dans chaque langue', () => {
    for (const sentence of SENTENCES) {
      const counts = Object.values(LOCALES).map((messages) => (messages.whiteBook.sentences as Record<string, string>)[sentence.id]?.split('/').length);
      expect(new Set(counts).size, sentence.id).toBe(1);
      expect(counts[0], sentence.id).toBeGreaterThan(1);
    }
  });

  it('sont toutes à trouver, même la Lecture Diagonale : chaque méthode se découvre avec sa phrase', () => {
    const state = createInitialState('fr');
    expect(toolUnlocked(state, 'diagonal')).toBe(false);
    expect(currentTarget(state)).toBe('diagonal');
    expect(completion(state)).toBe(0);
    write(state, 'diagonal', segments('diagonal').map((_, index) => index));
    expect(toolUnlocked(state, 'diagonal')).toBe(true);
    expect(completion(state)).toBeGreaterThan(0);
    expect(toolUnlocked(state, 'finger')).toBe(false);
    expect(currentTarget(state)).toBe('finger');
  });

  it('laisse la Connaissance deviner le dernier morceau', () => {
    const state = createInitialState('fr');
    write(state, 'finger', [0, 1, 2]);
    state.knowledge = GUESS_PRICE;
    expect(guess(state, 'finger')).toBe(true);
    expect(isComplete(state, 'finger')).toBe(true);
    expect(state.knowledge).toBe(0);
  });
});

describe('Connaissance', () => {
  it('ne trouve rien au-dessus de la chance, et trouve en dessous', () => {
    const state = started();
    expect(rollFind(state, sequence(BASE_FIND_CHANCE))).toBeUndefined();
    expect(rollFind(state, sequence(BASE_FIND_CHANCE / 2))).toBeDefined();
  });

  it('offre un coup de chance : avant la 30e page, toute la phrase de la Lecture Diagonale', () => {
    const state = createInitialState('fr');
    state.bookPage = LUCK_PAGES.from - 1;
    expect(rollFind(state, sequence(0.9))).toBeUndefined();
    state.bookPage = LUCK_PAGES.to;
    const find = rollFind(state, sequence(0.99, 0));
    expect(find).toEqual({ kind: 'sentence', sentence: 'diagonal' });
  });

  it('tire surtout dans la phrase en cours, et rarement une phrase entière', () => {
    const state = started();
    // mot (0,1), phrase en cours (0,1), premier mot manquant (0) ; rien d'écrit : pas de doublon possible
    expect(drawFind(state, sequence(0.1, 0.1, 0))).toEqual({ kind: 'word', sentence: 'diagonal', segment: 0 });
    expect(drawFind(state, sequence(0.99, 0.1))).toEqual({ kind: 'sentence', sentence: 'diagonal' });
  });

  it('ne tire jamais dans une méthode suivante : les méthodes se découvrent dans l’ordre', () => {
    const state = started();
    const later = SENTENCES.filter((sentence) => sentence.kind === 'method' && sentence.id !== 'diagonal').map((sentence) => sentence.id);
    for (let i = 0; i < 2000; i++) expect(later).not.toContain(drawFind(state, Math.random).sentence);
  });

  it('écrit la trouvaille et rapporte un point, même un doublon', () => {
    const state = started();
    gainFind(state, { kind: 'word', sentence: 'finger', segment: 0 });
    gainFind(state, { kind: 'word', sentence: 'finger', segment: 0, duplicate: true });
    expect(state.knowledge).toBe(2);
    expect(state.written.finger).toEqual([0]);
    expect(findText({ kind: 'piece', sentence: 'finger', segment: 1 })).toBe('court sous la ligne');
    gainFind(state, { kind: 'sentence', sentence: 'finger' });
    expect(toolUnlocked(state, 'finger')).toBe(true);
  });

  it('trouve aussi pendant une absence, au rythme plafonné des pages qui tournent seules', () => {
    const state = started();
    state.tools.diagonal = 1_000; // 100 pages/s : plafonné à 8
    // 8 h au plus, même après une semaine : 8 × 28 800 × 0,5 % = 1 152 trouvailles.
    expect(findWhileAway(state, 7 * 24 * 3600, () => 0)).toBe(Math.floor(8 * MAX_AWAY_SECONDS * BASE_FIND_CHANCE));
    expect(state.knowledge).toBe(1152);
    state.settings.autoTurn = false;
    expect(findWhileAway(state, 3600, () => 0)).toBe(0);
  });
});

describe('déchiffrer le livre étrange', () => {
  it('lit le sommaire dès la première trouvaille', () => {
    const state = createInitialState('fr');
    expect(isDeciphered(state, 'contents')).toBe(false);
    expect(decipherPrice(state, 'contents')).toBeUndefined();
    gainFind(state, { kind: 'word', sentence: 'finger', segment: 0 });
    expect(isDeciphered(state, 'contents')).toBe(true);
  });

  it('se paie, ou vient seul au palier, et le reste après une dépense', () => {
    const state = createInitialState('fr');
    state.knowledge = 1;
    expect(decipher(state, 'books')).toBe(false);
    expect(decipher(state, 'pages')).toBe(true);
    expect(state.knowledge).toBe(0);
    expect(isDeciphered(state, 'pages')).toBe(true);
    expect(decipherPrice(state, 'pages')).toBeUndefined();
    state.lifetimeKnowledge = PARTS.seals.freeAt;
    expect(isDeciphered(state, 'seals')).toBe(true);
  });
});
