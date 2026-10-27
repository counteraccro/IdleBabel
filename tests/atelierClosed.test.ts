import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { ATELIER_ON } from '../src/data/atelierOn';
import { ETHERIUM_PAGES, OPEN_STARS } from '../src/data/etheriumStars';
import { ANOMALIES } from '../src/data/anomalies';
import { PLATES, SEALS } from '../src/data/seals';
import { lightStar } from '../src/systems/etherium';
import { arriveCuriosity, atelierOpen, tickArrivals } from '../src/systems/curiosities';
import { curiosityReading } from '../src/systems/curiosityEffects';
import { refundClosedStars } from '../src/core/closedStars';

vi.stubGlobal('window', new EventTarget());

/** L'atelier, première version en mode débogage seulement (l'auteur, 27/10 : « tout caché hors debug »). */
describe('L’atelier hors débogage', () => {
  it('le Sud reste « plus tard », la page, les sceaux et la phrase de l’atelier n’existent pas', () => {
    expect(ATELIER_ON).toBe(false);
    expect(ETHERIUM_PAGES).not.toContain('atelier');
    expect(OPEN_STARS.some((star) => star.id === 'explore.s' || star.page === 'atelier')).toBe(false);
    expect(SEALS.some((seal) => seal.plate === 'atelier' || seal.id === 'unmakeMasterpiece')).toBe(false);
    expect(PLATES).toContain('atelier');
    expect(ANOMALIES.some((anomaly) => anomaly.id === 'hintUnmakeMasterpiece')).toBe(false);
    const state = createInitialState('fr');
    Object.assign(state, { ether: 100, etheriumInHand: true });
    expect(lightStar(state, 'explore.s')).toBe(false);
  });

  it('une partie qui l’a ouvert en débogage le garde (rien n’est rendu), mais rien n’arrive ni n’agit', () => {
    const state = createInitialState('fr');
    state.etherium = ['explore.s', 'atelier.f1'];
    expect(refundClosedStars(state).etherium).toEqual(['explore.s', 'atelier.f1']);
    expect(atelierOpen(state)).toBe(false);
    state.booksFinished = 10;
    tickArrivals(state, 7200, () => 0.5);
    expect(state.atelier.books).toHaveLength(0);
    const book = arriveCuriosity(state, () => 0.5);
    Object.assign(book, { where: 'lectern', slot: 0, family: 'pages', rank: 5 });
    expect(curiosityReading(state)).toBe(1);
  });
});
