import { describe, expect, it } from 'vitest';
import { createAutoTurn3d } from '../src/ui/book3d/autoTurn3d';
import { producedWholePages, produce } from '../src/systems/production';
import { readPage } from '../src/systems/click';
import { createInitialState } from '../src/core/state';
import type { Turner } from '../src/ui/book3d/turner';

/** Un livre dont on ne regarde que la double page visée. */
const fakeTurner = (): Turner => {
  let target = 0;
  return {
    get target() {
      return target;
    },
    idle: true,
    go: (spread: number) => {
      target = spread;
    },
  } as unknown as Turner;
};

describe('pages qui tournent seules', () => {
  it('tourne une page chaque fois que le compteur de pages passe à l’entier suivant', () => {
    let produced = 0;
    const auto = createAutoTurn3d({ produced: () => produced, max: () => 8 });
    const turner = fakeTurner();
    auto(1 / 60, turner, 100, true);
    expect(turner.target).toBe(0);
    produced = 1;
    auto(1 / 60, turner, 100, true);
    expect(turner.target).toBe(1);
    auto(1 / 60, turner, 100, true);
    expect(turner.target).toBe(1);
  });

  it('suit le compteur de la partie : ni les clics ni les achats ne font tourner de page', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 2; // 0,2 page par seconde
    const auto = createAutoTurn3d({ produced: producedWholePages, max: () => 8 });
    const turner = fakeTurner();
    auto(0.1, turner, 100, true);
    let counterChanged = 0;
    for (let tick = 0; tick < 100; tick++) {
      const before = Math.floor(state.pages);
      produce(state, 0.1);
      if (tick === 20) readPage(state);
      if (tick === 40) state.pages -= 0.35;
      const after = Math.floor(state.pages);
      auto(0.1, turner, 100, true);
      if (tick !== 20 && tick !== 40 && after > before) counterChanged++;
    }
    // Autant de pages tournées que de fois où la production a fait avancer le compteur.
    expect(counterChanged).toBeGreaterThan(0);
    expect(turner.target).toBe(counterChanged);
  });

  it('ne dépasse pas le plafond, et ne garde qu’une page en attente', () => {
    let produced = 0;
    const auto = createAutoTurn3d({ produced: () => produced, max: () => 8 });
    const turner = fakeTurner();
    for (let frame = 0; frame < 60; frame++) {
      produced += 100;
      auto(1 / 60, turner, 1000, true);
    }
    expect(turner.target).toBeGreaterThanOrEqual(7);
    expect(turner.target).toBeLessThanOrEqual(9);
  });

  it('ne rattrape rien tant que le livre n’est pas prêt, ni quand l’option est coupée', () => {
    let produced = 0;
    let max = 8;
    const auto = createAutoTurn3d({ produced: () => produced, max: () => max });
    const turner = fakeTurner();
    produced = 5;
    auto(1 / 60, turner, 100, false);
    auto(1 / 60, turner, 100, true);
    expect(turner.target).toBe(0);
    max = 0;
    produced = 6;
    auto(1 / 60, turner, 100, true);
    expect(turner.target).toBe(0);
  });

  it('s’arrête à la dernière double page', () => {
    let produced = 0;
    const auto = createAutoTurn3d({ produced: () => produced, max: () => 8 });
    const turner = fakeTurner();
    turner.go(3);
    produced = 1;
    auto(1, turner, 3, true);
    expect(turner.target).toBe(3);
  });
});
