import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { prestige } from '../src/systems/prestige';
import { awayFindsShare, awayTurnsMultiplier, handFindsMultiplier } from '../src/systems/etherium';
import { guessPrice, segments, write } from '../src/systems/sentences';
import {
  awayShare,
  clickShare,
  duplicateShare,
  levelOf,
  maxAwaySeconds,
  nextPrice,
  rareChance,
  targetShare,
  turnsPerSecond,
} from '../src/systems/technologies';
import { rareBookAt } from '../src/systems/rareBooks';
import { pagesTurnedAway } from '../src/systems/knowledge';

/** Une partie aux étoiles `stars` allumées. */
const lit = (...stars: string[]): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = stars;
  return state;
};

describe('Les effets des étoiles', () => {
  it('Livre ouvert, page de droite : des feuilles tournées en plus', () => {
    expect(turnsPerSecond(lit('reading.r1', 'reading.r2', 'reading.r3'))).toBe(turnsPerSecond(lit()) + 12);
  });

  it('Main : part de la production par clic, Annulaire, Auriculaire', () => {
    expect(clickShare(lit('hands.t', 'hands.m', 'hands.m2'))).toBeCloseTo(0.08);
    expect(handFindsMultiplier(lit())).toBe(1);
    expect(handFindsMultiplier(lit('hands.a'))).toBe(2);
    expect(nextPrice(lit('hands.o'), 'muscleMemory')).toBe(nextPrice(lit(), 'muscleMemory')! / 2);
  });

  it('Chouette : intuitions −10 % puis −25 %, le Bec devine deux morceaux', () => {
    expect(nextPrice(lit('knowledge.wl'), 'semanticFilter')).toBe(Math.ceil(nextPrice(lit(), 'semanticFilter')! * 0.9));
    expect(nextPrice(lit('knowledge.wl', 'knowledge.el'), 'semanticFilter')).toBe(Math.ceil(nextPrice(lit(), 'semanticFilter')! * 0.75));
    const id = 'diagonal';
    const twoMissing = (state: GameState): GameState => {
      write(
        state,
        id,
        segments(id)
          .map((_, index) => index)
          .slice(2),
      );
      return state;
    };
    expect(guessPrice(twoMissing(lit()), id)).toBeUndefined();
    expect(guessPrice(twoMissing(lit('knowledge.k')), id)).toBeDefined();
  });

  it('Loupe : Fil d’Ariane, doublons, livres rares', () => {
    expect(targetShare(lit('finds.r1'))).toBeCloseTo(Math.min(1, targetShare(lit()) + 0.1));
    expect(duplicateShare(lit('finds.r2'))).toBeCloseTo(Math.max(0, duplicateShare(lit()) - 0.1));
    expect(rareChance(lit('finds.g1', 'finds.g2', 'finds.g3'))).toBeCloseTo(rareChance(lit()) * 3.6);
  });

  it('Lune : part et heures comptées, trouvailles en entier, feuilles doublées', () => {
    expect(awayShare(lit('away.d0', 'away.c1', 'away.c2'))).toBeCloseTo(awayShare(lit()) + 0.3);
    expect(maxAwaySeconds(lit('away.d1', 'away.d2', 'away.d3'))).toBe(maxAwaySeconds(lit()) + 16 * 3600);
    expect(awayFindsShare(lit(), 0.5)).toBe(0.5);
    expect(awayFindsShare(lit('away.tip'), 0.5)).toBe(1);
    const state = lit('away.x');
    state.tools.ladder = 1000;
    expect(pagesTurnedAway(state, 60, awayTurnsMultiplier(state))).toBe(2 * pagesTurnedAway(state, 60));
  });
});

describe('Au réveil', () => {
  /** Une partie prête pour le prestige, qui a lu 9 milliards de pages depuis le réveil d'avant. */
  const ready = (...stars: string[]): GameState => {
    const state = lit(...stars);
    state.totalPagesRead = 1e10;
    state.wake.pages = 1e9;
    state.cycleKnowledge = 300;
    state.tools.diagonal = 250;
    state.tools.voice = 1000;
    state.technologies = { semanticFilter: 3, ariadne: 2 };
    state.booksFinished = 40;
    return state;
  };

  it('la Porte : Diagonales, Doigts, l’arche, les pages et la Connaissance de la partie d’avant', () => {
    const state = ready('start.sill', 'start.l1', 'start.l2', 'start.l3', 'start.top', 'start.r1', 'start.r2', 'start.r3');
    prestige(state);
    expect(state.tools.diagonal).toBe(15 + 2);
    expect(state.tools.finger).toBe(10);
    expect(state.tools.voice).toBe(10);
    expect(state.pages).toBeCloseTo(9e7);
    expect(state.knowledge).toBeCloseTo(30);
    expect(state.wake).toEqual({ pages: 1e10, book: 41, clicks: 0, stars: 8 });
  });

  it('sans étoile, rien ne reste', () => {
    const state = ready();
    prestige(state);
    expect(state.tools.diagonal).toBe(0);
    expect(state.pages).toBe(0);
    expect(state.knowledge).toBe(0);
  });

  it('l’Aigrette gauche garde le 1er niveau, le Reflet offre un niveau de Filtre', () => {
    const state = ready('knowledge.al', 'finds.c');
    prestige(state);
    expect(levelOf(state, 'ariadne')).toBe(1);
    expect(levelOf(state, 'semanticFilter')).toBe(2);
    expect(levelOf(state, 'muscleMemory')).toBe(0);
  });

  it('la Poignée : le premier livre pris au réveil a plus de chance d’être rare', () => {
    const state = lit('start.k');
    // Sur 2000 livres, chacun premier du réveil à son tour : ×10 la chance (1/200 → 1/20).
    let withHandle = 0;
    for (let index = 100; index < 2100; index++) {
      state.wake.book = index;
      withHandle += rareBookAt(state, index) ? 1 : 0;
    }
    expect(withHandle).toBeGreaterThan(50);
    state.etherium = [];
    let without = 0;
    for (let index = 100; index < 2100; index++) without += rareBookAt(state, index) ? 1 : 0;
    expect(without).toBeLessThan(30);
  });
});
