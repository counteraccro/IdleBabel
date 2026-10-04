import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { BASE_FIND_CHANCE, GUESS_PRICE, LUCK_PAGES, MAX_AWAY_SECONDS } from '../src/data/knowledge';
import { drawFind, findChance, findText, findWhileAway, gainFind, rollFind } from '../src/systems/knowledge';
import { levelOf, nextPrice, technologiesCompletion, understand } from '../src/systems/technologies';
import { FILTER_BONUS, TECHNOLOGIES } from '../src/data/technologies';
import { completion, currentTarget, guess, isComplete, segments, toolUnlocked, write } from '../src/systems/sentences';
import { anyPartNews, isDeciphered, markAllPartsRead, markPartRead, partHasNews } from '../src/systems/decipher';
import { READABLE_AT } from '../src/data/decipher';
import { SENTENCES } from '../src/data/sentences';
import { LOCALES } from '../src/i18n/locales';

/** Tirages rejoués dans l'ordre, puis 0,5. */
const sequence =
  (...values: number[]) =>
  () =>
    values.shift() ?? 0.5;

/** Une partie où la première trouvaille (le coup de chance) a déjà eu lieu. */
const started = () => {
  const state = createInitialState('fr');
  state.lifetimeKnowledge = 1;
  return state;
};

describe('phrases du livre blanc', () => {
  it('ont des identifiants uniques (les morceaux écrits sont rangés par identifiant)', () => {
    const ids = SENTENCES.map((sentence) => sentence.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ont un auteur (citations) qui renvoie à une phrase existante, dans chaque langue', () => {
    const ids = new Set(SENTENCES.map((sentence) => sentence.id));
    for (const messages of Object.values(LOCALES)) for (const id of Object.keys(messages.whiteBook.sources)) expect(ids, id).toContain(id);
  });

  it('ont le même nombre de morceaux dans chaque langue', () => {
    for (const sentence of SENTENCES) {
      const counts = Object.values(LOCALES).map(
        (messages) => (messages.whiteBook.sentences as Record<string, string>)[sentence.id]?.split('/').length,
      );
      expect(new Set(counts).size, sentence.id).toBe(1);
      expect(counts[0], sentence.id).toBeGreaterThan(1);
    }
  });

  it('sont toutes à trouver, même la Lecture Diagonale : chaque méthode se découvre avec sa phrase', () => {
    const state = createInitialState('fr');
    expect(toolUnlocked(state, 'diagonal')).toBe(false);
    expect(currentTarget(state)).toBe('diagonal');
    expect(completion(state)).toBe(0);
    write(
      state,
      'diagonal',
      segments('diagonal').map((_, index) => index),
    );
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
    state.tools.diagonal = 1_000; // 100 pages/s : plafonné à 8 feuilles, 16 pages par seconde
    // 8 h au plus, même après une semaine : 16 × 28 800 × 0,5 % = 2 304 trouvailles.
    expect(findWhileAway(state, 7 * 24 * 3600, () => 0)).toBe(Math.floor(16 * MAX_AWAY_SECONDS * BASE_FIND_CHANCE));
    expect(state.knowledge).toBe(2304);
    state.settings.autoTurn = false;
    expect(findWhileAway(state, 3600, () => 0)).toBe(0);
  });
});

describe('déchiffrer le Grand Livre', () => {
  it('lit le sommaire dès la première trouvaille', () => {
    const state = createInitialState('fr');
    expect(isDeciphered(state, 'contents')).toBe(false);
    gainFind(state, { kind: 'word', sentence: 'finger', segment: 0 });
    expect(isDeciphered(state, 'contents')).toBe(true);
  });

  it('lit chaque partie à son palier, sans rien dépenser', () => {
    const state = createInitialState('fr');
    state.knowledge = 100;
    state.lifetimeKnowledge = READABLE_AT.seals - 1;
    expect(isDeciphered(state, 'seals')).toBe(false);
    state.lifetimeKnowledge = READABLE_AT.seals;
    expect(isDeciphered(state, 'seals')).toBe(true);
    expect(state.knowledge).toBe(100);
  });

  it('signale une partie devenue lisible jusqu’à ce qu’elle soit vue', () => {
    const state = createInitialState('fr');
    state.lifetimeKnowledge = READABLE_AT.pages;
    markAllPartsRead(state);
    expect(anyPartNews(state)).toBe(false);
    state.lifetimeKnowledge = READABLE_AT.books;
    expect(partHasNews(state, 'books')).toBe(true);
    expect(partHasNews(state, 'methods')).toBe(false);
    markPartRead(state, 'books');
    expect(partHasNews(state, 'books')).toBe(false);
  });
});

describe('Intuitions', () => {
  it('se comprennent niveau après niveau, contre de la Connaissance ; le filtre multiplie la chance de trouvaille', () => {
    const state = createInitialState('fr');
    state.knowledge = 4;
    expect(understand(state, 'semanticFilter')).toBe(false);
    state.knowledge = 60;
    expect(understand(state, 'semanticFilter')).toBe(true);
    expect(state.knowledge).toBe(55);
    expect(nextPrice(state, 'semanticFilter')).toBe(50);
    expect(findChance(state)).toBeCloseTo(BASE_FIND_CHANCE * FILTER_BONUS);
    expect(understand(state, 'semanticFilter')).toBe(true);
    expect(levelOf(state, 'semanticFilter')).toBe(2);
    expect(findChance(state)).toBeCloseTo(BASE_FIND_CHANCE * FILTER_BONUS ** 2);
    expect(technologiesCompletion(state)).toBeCloseTo(2 / 5);
  });

  it('s’arrêtent au dernier niveau', () => {
    const state = createInitialState('fr');
    state.knowledge = 1e9;
    for (let i = 0; i < 10; i++) understand(state, 'semanticFilter');
    expect(levelOf(state, 'semanticFilter')).toBe(5);
    expect(nextPrice(state, 'semanticFilter')).toBeUndefined();
  });

  it('ont toutes leurs textes, une phrase par niveau, en français et en anglais', () => {
    for (const locale of Object.values(LOCALES))
      for (const tech of TECHNOLOGIES) {
        const text = (locale.whiteBook.intuitions as Record<string, { name: string; notes: string[] }>)[tech.id];
        expect(text.name).toBeTruthy();
        expect(text.notes).toHaveLength(tech.prices.length);
      }
  });
});
