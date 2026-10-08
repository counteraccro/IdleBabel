import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { passTime } from '../src/core/absence';
import { SEALS } from '../src/data/seals';
import { STARS } from '../src/data/etheriumStars';
import { checkSeals } from '../src/systems/seals';
import { closeEtherium, prestige } from '../src/systems/prestige';
import { lightStar } from '../src/systems/etherium';
import { readPage } from '../src/systems/click';

vi.stubGlobal('window', new EventTarget());

/** Une partie prête pour le prestige (assez de pages pour un Éther). */
const ready = () => {
  const state = createInitialState('fr');
  state.totalPagesRead = 1e10;
  return state;
};

describe('revue des sceaux (08/10)', () => {
  it('prolonge les pages lues jusqu’à 10³⁰, la réserve jusqu’à 10³⁶, le temps de jeu jusqu’à mille heures', () => {
    const steps = (text: string) => SEALS.filter((seal) => seal.text === text).map((seal) => seal.tier?.n);
    expect(steps('pagesRead').at(-1)).toBe(1e30);
    expect(steps('stock').at(-1)).toBe(1e36);
    expect(steps('playTime').at(-1)).toBe(1000);
    expect(steps('booksFinished').at(-1)).toBe(50_000);
  });

  it('scelle les prestiges, l’Éther reçu, les étoiles, une constellation entière et l’Âge Automatique', () => {
    const state = createInitialState('fr');
    state.exiles = 5;
    state.etherReceived = 12;
    state.etherium = STARS.filter((star) => star.page === 'reading').map((star) => star.id);
    state.etherium.push('ages.auto');
    checkSeals(state, 1);
    expect(state.seals['prestiges-5']).toBe(1);
    expect(state.seals['prestiges-10']).toBeUndefined();
    expect(state.seals['etherReceived-10']).toBe(1);
    expect(state.seals['etherReceived-100']).toBeUndefined();
    expect(state.seals['starsLit-1']).toBe(1);
    expect(state.seals['constellation-reading']).toBe(1);
    expect(state.seals['constellation-hands']).toBeUndefined();
    expect(state.seals['automaticAge']).toBe(1);
  });

  it('scelle la Connaissance trouvée, et le livre blanc', () => {
    const state = createInitialState('fr');
    state.lifetimeKnowledge = 150;
    checkSeals(state, 1);
    expect(state.seals['knowledgeFound-100']).toBe(1);
    expect(state.seals['firstSentence']).toBeUndefined();
  });

  it('une partie entière sans un clic, d’un réveil au prestige suivant : un secret ; pas la toute première', () => {
    const state = ready();
    readPage(state);
    prestige(state);
    expect(state.seals['noHands']).toBeUndefined();
    state.totalPagesRead = 1e12;
    prestige(state);
    expect(state.seals['noHands']).toBeDefined();
    const clicked = ready();
    prestige(clicked);
    clicked.totalPagesRead = 1e12;
    readPage(clicked);
    prestige(clicked);
    expect(clicked.seals['noHands']).toBeUndefined();
  });

  it('l’Etherium refermé sans y allumer une étoile : un secret', () => {
    const state = ready();
    prestige(state);
    lightStar(state, 'reading.s0');
    closeEtherium(state);
    expect(state.seals['emptyEtherium']).toBeUndefined();
    state.totalPagesRead = 1e12;
    prestige(state);
    closeEtherium(state);
    expect(state.seals['emptyEtherium']).toBeDefined();
  });

  it('une nuit entière d’absence : un sceau', () => {
    const state = createInitialState('fr');
    passTime(state, 7 * 3600, 'away');
    expect(state.seals['fullNight']).toBeUndefined();
    passTime(state, 8 * 3600, 'away');
    expect(state.seals['fullNight']).toBeDefined();
  });

  it('exactement 410 pages en réserve, sans rien qui lise : un secret', () => {
    const state = createInitialState('fr');
    state.pages = 410.5;
    state.tools.diagonal = 1;
    checkSeals(state, 1);
    expect(state.seals['exactly410']).toBeUndefined();
    state.tools.diagonal = 0;
    checkSeals(state, 2);
    expect(state.seals['exactly410']).toBe(2);
  });
});
