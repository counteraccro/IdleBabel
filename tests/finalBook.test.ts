import { afterEach, describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { markingDebug, recordDebug, recordOnce } from '../src/core/history';
import { chronicle } from '../src/systems/chronicle';
import { tellFinalBook, whenKey } from '../src/systems/finalBook';
import { setLocale } from '../src/i18n';

const MINUTE = 60_000;

describe('livre de la fin', () => {
  afterEach(() => markingDebug(false));

  it('relève chaque moment une seule fois', () => {
    const state = createInitialState('fr', 0);
    state.booksFinished = 12;
    state.rareBooks = { bible: 4 };
    state.seals = { insomnia: 500, pagesRead1: 200 };
    chronicle(state, 1000);
    chronicle(state, 2000);
    const types = state.history.map((e) => `${e.type}:${e.detail ?? ''}`);
    expect(types).toEqual(['gameStarted:', 'books:10', 'rareBook:bible', 'firstSeal:', 'secretSeal:insomnia']);
    // Le premier sceau garde sa date, pas celle du relevé.
    expect(state.history.find((e) => e.type === 'firstSeal')?.at).toBe(200);
  });

  it('arrondit les durées comme quelqu’un qui a perdu le temps', () => {
    expect(whenKey(10_000)).toBe('now');
    expect(whenKey(20 * MINUTE)).toBe('twentyMinutes');
    expect(whenKey(3 * 24 * 60 * MINUTE)).toBe('days');
    expect(whenKey(5 * 365 * 24 * 60 * MINUTE)).toBe('years');
  });

  it('raconte au « tu », chaque moment placé par sa durée depuis le précédent', () => {
    setLocale('fr');
    const state = createInitialState('fr', 0);
    state.playerName = 'Ana';
    recordOnce(state, 'firstClick', undefined, 20 * MINUTE);
    recordOnce(state, 'firstTool', 'diagonal', 21 * MINUTE);
    const [chapter] = tellFinalBook(state).chapters;
    expect(chapter.paragraphs.map((p) => p.text)).toEqual([
      expect.stringContaining('sauf ton nom\u00a0: Ana.'),
      'Vingt minutes plus tard, tu as tourné ta première page. Elle ne voulait rien dire.',
      'Quelques minutes plus tard, tu as appris à sauter un mot sur deux.',
    ]);
  });

  it('écrit le débogage en marge, sans qu’il fasse passer le temps', () => {
    setLocale('fr');
    const state = createInitialState('fr', 0);
    recordDebug(state, 'Ressources · Pages : 1M', 5 * MINUTE);
    markingDebug(true);
    recordOnce(state, 'books', '10', 5 * MINUTE);
    markingDebug(false);
    recordOnce(state, 'firstClick', undefined, 30 * MINUTE);
    const [chapter] = tellFinalBook(state).chapters;
    expect(chapter.paragraphs.slice(1)).toEqual([
      { text: 'Débogage · Ressources · Pages : 1M', note: true },
      { text: 'Dix livres refermés derrière toi.', debug: true },
      { text: 'Une demi-heure plus tard, tu as tourné ta première page. Elle ne voulait rien dire.' },
    ]);
  });
});
