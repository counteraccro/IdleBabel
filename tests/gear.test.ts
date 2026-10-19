import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { SENTENCES } from '../src/data/sentences';
import { AUTOMATIC_AGE, DIGITAL_AGE, TOOLS, type ToolId } from '../src/data/tools';
import { pageOpen, starOpen } from '../src/systems/etherium';
import { gearChoice, gearKnown, resetGearTurn, turnGear } from '../src/systems/gear';
import { lotCost } from '../src/systems/tools';
import { segments, write } from '../src/systems/sentences';

vi.stubGlobal('window', new EventTarget());

/** Toutes les phrases de méthode écrites : chaque méthode est dans la ruche. */
const allTools = (state: GameState): void => {
  for (const sentence of SENTENCES.filter((candidate) => candidate.tool)) {
    write(
      state,
      sentence.id,
      segments(sentence.id).map((_, index) => index),
    );
  }
};

/** Une partie avec l'Âge Numérique, le Rouage acheté (et ces étoiles), toutes les méthodes trouvées. */
const withGear = (stars: string[] = []): GameState => {
  const state = createInitialState('fr');
  state.etherium.push(AUTOMATIC_AGE, DIGITAL_AGE, 'gear.c', ...stars);
  allTools(state);
  return state;
};

const ageOf = (id: ToolId): string => TOOLS.find((tool) => tool.id === id)!.age ?? '';

/** Le jeu qui tourne `seconds` secondes, par pas d'une seconde (la boucle, onglet caché) ; rend les achats. */
const run = (state: GameState, seconds: number): number => {
  let bought = 0;
  for (let i = 0; i < seconds; i++) bought += turnGear(state, 1);
  return bought;
};

beforeEach(resetGearTurn);

describe('Le Rouage', () => {
  it('sa page attend l’Âge Numérique ; les dents des Âges suivants restent fermées', () => {
    const state = createInitialState('fr');
    state.ether = 100_000;
    state.etherReceived = 100_000;
    state.etherium.push(AUTOMATIC_AGE);
    expect(pageOpen(state, 'gear')).toBe(false);
    expect(starOpen(state, 'gear.c')).toBe(false);
    state.etherium.push(DIGITAL_AGE);
    expect(pageOpen(state, 'gear')).toBe(true);
    expect(starOpen(state, 'gear.c')).toBe(true);
    state.etherium.push('gear.c', 'gear.a2', 'gear.a3');
    expect(starOpen(state, 'gear.a4')).toBe(false);
  });

  it('sans l’axe, il ne fait rien', () => {
    const state = createInitialState('fr');
    state.pages = 1e9;
    allTools(state);
    expect(gearKnown(state)).toBe(false);
    expect(turnGear(state, 60)).toBe(0);
  });

  it('l’axe seul : les méthodes de l’Âge Manuel, une toutes les 10 s, jamais une secrète', () => {
    const state = withGear();
    state.pages = 1e30;
    expect(run(state, 9)).toBe(0);
    expect(run(state, 1)).toBe(1);
    expect(run(state, 30)).toBe(3);
    const bought = TOOLS.filter((tool) => state.tools[tool.id] > 0);
    expect(bought.every((tool) => !tool.age && !tool.secret)).toBe(true);
  });

  it('un Âge allumé : il achète aussi ses méthodes ; la cadence la plus rapide compte', () => {
    const state = withGear(['gear.a2', 'gear.a3', 'gear.t1']);
    state.pages = 1e30;
    expect(run(state, 50)).toBe(10);
    expect(gearChoice(state)).toBeDefined();
    expect([AUTOMATIC_AGE, DIGITAL_AGE, '']).toContain(ageOf(gearChoice(state)!.id));
  });

  it('« dès qu’il peut » : tout ce que les pages permettent, d’un coup', () => {
    const state = withGear(['gear.t1', 'gear.t2', 'gear.t3', 'gear.t4']);
    state.pages = 1e6;
    const bought = turnGear(state, 0.1);
    expect(bought).toBeGreaterThan(1);
    expect(gearChoice(state)!.cost).toBeGreaterThan(state.pages);
  });

  it('il attend la meilleure méthode au lieu de prendre une moins bonne', () => {
    const state = withGear();
    state.tools.diagonal = 200;
    state.pages = 0;
    const best = gearChoice(state)!;
    state.pages = best.cost * 0.99;
    expect(turnGear(state, 10)).toBe(0);
    expect(TOOLS.every((tool) => tool.id === 'diagonal' || state.tools[tool.id] === 0)).toBe(true);
    state.pages = best.cost;
    expect(turnGear(state, 0.1)).toBe(1);
    expect(state.tools[best.id]).toBeGreaterThan(best.id === 'diagonal' ? 200 : 0);
  });

  it('au réveil de l’ordinateur : un achat, pas des heures d’achats d’un coup', () => {
    const state = withGear(['gear.t3']);
    state.pages = 1e30;
    expect(turnGear(state, 8 * 3600)).toBe(1);
  });

  it('lot « max » : la meilleure une à une, tant qu’elle reste la meilleure, pas toutes les pages sur elle', () => {
    const state = withGear();
    state.settings.buyLot = 'max';
    state.technologies.armful = 3;
    state.pages = 1e12;
    expect(run(state, 10)).toBe(1);
    const [first] = TOOLS.filter((tool) => state.tools[tool.id] > 0);
    expect(state.tools[first.id]).toBeGreaterThan(1);
    // Il s'arrête quand une autre devient meilleure, avec de quoi la payer.
    expect(gearChoice(state)!.id).not.toBe(first.id);
    expect(gearChoice(state)!.cost).toBeLessThanOrEqual(state.pages);
    expect(run(state, 10)).toBe(1);
    expect(TOOLS.filter((tool) => state.tools[tool.id] > 0).length).toBeGreaterThan(1);
  });

  it('arrêté sous la ruche : il ne fait rien, et l’interrupteur est gardé', () => {
    const state = withGear();
    state.pages = 1e30;
    state.gear.on = false;
    expect(turnGear(state, 60)).toBe(0);
    expect(createInitialState('fr').gear.on).toBe(true);
  });
});
