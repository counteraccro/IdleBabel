import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { PAGES_PER_BOOK } from '../src/systems/books';
import {
  CATCHES,
  CHAPTERS,
  INDEX_FIRST,
  RUN_CHANCE,
  catchRabbit,
  chapterStart,
  platePage,
  rabbitHome,
  rabbitRuns,
} from '../src/systems/rabbit';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';

describe('le Lapin de garenne', () => {
  it('ouvre chaque chapitre sur une page de droite, sa planche en face, et finit par la table avant la dernière page', () => {
    for (let chapter = 0; chapter < CHAPTERS; chapter++) {
      expect(chapterStart(chapter) % 2).toBe(1);
      expect(platePage(chapter) % 2).toBe(0);
    }
    expect(INDEX_FIRST).toBeLessThan(PAGES_PER_BOOK);
  });

  it('ne court que dès le premier chapitre, une double page sur quatre, et plus une fois rentré', () => {
    const state = createInitialState('fr', 0, 12345);
    expect(rabbitRuns(state, 5, 0)).toBe(false);
    expect(rabbitRuns(state, 7, 0)).toBe(true);
    expect(rabbitRuns(state, 7, RUN_CHANCE)).toBe(false);
    // Une fois par double page : sa page de droite.
    expect(rabbitRuns(state, 8, 0)).toBe(false);
    state.rabbitCaught = CATCHES;
    expect(rabbitRuns(state, 7, 0)).toBe(false);
  });

  it('rentre dans ses planches à la troisième prise, pas avant, et donne alors le sceau secret', () => {
    const state = createInitialState('fr', 0, 12345);
    catchRabbit(state);
    catchRabbit(state);
    expect(rabbitHome(state)).toBe(false);
    expect('rabbitHome' in state.seals).toBe(false);
    catchRabbit(state);
    expect(rabbitHome(state)).toBe(true);
    expect('rabbitHome' in state.seals).toBe(true);
    catchRabbit(state);
    expect(state.rabbitCaught).toBe(CATCHES);
  });

  it('a ses textes de même forme dans les deux langues', () => {
    const [a, b] = [fr.rabbit.pages, en.rabbit.pages];
    for (const pages of [a, b]) {
      expect(pages.chapters).toHaveLength(CHAPTERS);
      expect(pages.plates).toHaveLength(CHAPTERS);
      expect(pages.ordinals).toHaveLength(CHAPTERS);
    }
    expect(b.notice).toHaveLength(a.notice.length);
    expect(b.noticeMore).toHaveLength(a.noticeMore.length);
    expect(b.legal).toHaveLength(a.legal.length);
    expect(b.pool).toHaveLength(a.pool.length);
    expect(b.indexEntries).toHaveLength(a.indexEntries.length);
  });
});
