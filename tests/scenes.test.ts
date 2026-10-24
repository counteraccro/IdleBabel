import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { AUTOMATIC_AGE } from '../src/data/tools';
import { SCENES, sceneOfAge, sceneShown } from '../src/scene/scenes';

describe('un fond par Âge', () => {
  it("l'Âge Manuel est au désert", () => {
    expect(sceneOfAge(createInitialState('fr'))).toBe('desert');
  });

  it("l'Âge Automatique est sous les étoiles", () => {
    const state = createInitialState('fr');
    state.etherium.push(AUTOMATIC_AGE);
    expect(sceneOfAge(state)).toBe('nuit');
  });

  it('chaque fond a son Âge, la verrière attend le troisième, le jour et la nuit le quatrième', () => {
    expect(SCENES.map(({ id, age }) => [id, age])).toEqual([
      ['desert', 1],
      ['nuit', 2],
      ['verriere', 3],
      ['jour-nuit', 4],
    ]);
  });
});

describe('garder un fond', () => {
  it('le fond gardé reste, quel que soit l’Âge', () => {
    const state = createInitialState('fr');
    state.etherium.push(AUTOMATIC_AGE);
    state.settings.scene = 'desert';
    expect(sceneShown(state)).toBe('desert');
  });

  it("un fond pas encore vu n'est pas montré (réglage gardé d'une sauvegarde effacée)", () => {
    const state = createInitialState('fr');
    state.settings.scene = 'nuit';
    expect(sceneShown(state)).toBe('desert');
  });
});
