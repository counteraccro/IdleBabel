import { describe, expect, it } from 'vitest';
import { affordableTools, buyTool, buyTools, chosenLot, lotCost, lotSize, toolCost, validLot } from '../src/systems/tools';
import { armfulLots, understand } from '../src/systems/technologies';
import { pagesPerSecond, produce } from '../src/systems/production';
import { createInitialState } from '../src/core/state';

describe('outils', () => {
  it('le prix augmente de 15 % par exemplaire', () => {
    expect(toolCost(15, 0)).toBe(15);
    expect(toolCost(15, 1)).toBeCloseTo(17.25);
    expect(toolCost(15, 10)).toBeCloseTo(60.68, 1);
  });

  it("l'achat débite les pages, ajoute l'outil et l'inscrit une seule fois dans l'historique", () => {
    const state = createInitialState('fr');
    state.pages = 100;
    expect(buyTool(state, 'diagonal')).toBe(true);
    expect(buyTool(state, 'diagonal')).toBe(true);
    expect(state.tools.diagonal).toBe(2);
    expect(state.pages).toBeCloseTo(100 - 15 - 17.25);
    expect(state.history.filter((e) => e.type === 'firstTool')).toHaveLength(1);
  });

  it("l'achat est refusé sans assez de pages", () => {
    const state = createInitialState('fr');
    state.pages = 10;
    expect(buyTool(state, 'diagonal')).toBe(false);
    expect(state.tools.diagonal).toBe(0);
  });

  it('la production suit le temps écoulé', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 10;
    expect(pagesPerSecond(state)).toBeCloseTo(1);
    produce(state, 30);
    expect(state.pages).toBeCloseTo(30);
  });

  it('un lot coûte la somme des prix, chacun 15 % plus cher', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 3;
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += toolCost(15, 3 + i);
    expect(lotCost(state, 'diagonal', 10)).toBeCloseTo(sum);
    expect(lotCost(state, 'diagonal', 1)).toBe(toolCost(15, 3));
  });

  it('un lot s’achète en entier, ou pas du tout', () => {
    const state = createInitialState('fr');
    state.pages = lotCost(state, 'diagonal', 10) - 1;
    expect(buyTools(state, 'diagonal', 10)).toBe(0);
    expect(state.tools.diagonal).toBe(0);
    state.pages += 1;
    expect(buyTools(state, 'diagonal', 10)).toBe(10);
    expect(state.tools.diagonal).toBe(10);
    expect(state.pages).toBeCloseTo(0);
  });

  it('« max » prend tout ce que les pages permettent', () => {
    const state = createInitialState('fr');
    state.pages = lotCost(state, 'diagonal', 37) + 1;
    expect(affordableTools(state, 'diagonal')).toBe(37);
    expect(buyTools(state, 'diagonal', 'max')).toBe(37);
    expect(state.pages).toBeCloseTo(1);
    // Plus assez pour une : « max » dit le prix de la prochaine, et n'achète rien.
    expect(lotSize(state, 'diagonal', 'max')).toBe(1);
    expect(buyTools(state, 'diagonal', 'max')).toBe(0);
    expect(state.tools.diagonal).toBe(37);
  });

  it('un lot inconnu (sauvegarde abîmée) achète une par une', () => {
    expect(validLot(7)).toBe(1);
    expect(validLot('max')).toBe('max');
    expect(validLot(100)).toBe(100);
  });

  it('la Brassée ouvre les lots un à un : ×10, ×100, puis max', () => {
    const state = createInitialState('fr');
    state.knowledge = 1e6;
    expect(armfulLots(state)).toEqual([1]);
    understand(state, 'armful');
    expect(armfulLots(state)).toEqual([1, 10]);
    understand(state, 'armful');
    understand(state, 'armful');
    expect(armfulLots(state)).toEqual([1, 10, 100, 'max']);
    expect(understand(state, 'armful')).toBe(false);
  });

  it('le lot choisi mais pas encore ouvert : le plus grand qui l’est ; Maj : ×10 seulement s’il est ouvert', () => {
    const state = createInitialState('fr');
    state.settings.buyLot = 'max';
    expect(chosenLot(state)).toBe(1);
    expect(chosenLot(state, true)).toBe(1);
    state.knowledge = 1e6;
    understand(state, 'armful');
    expect(chosenLot(state)).toBe(10);
    understand(state, 'armful');
    expect(chosenLot(state)).toBe(100);
    expect(chosenLot(state, true)).toBe(10);
    understand(state, 'armful');
    expect(chosenLot(state)).toBe('max');
  });
});
