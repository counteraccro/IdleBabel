import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { COLORING_DRAWINGS } from '../src/data/coloring';
import { colorZone, drawingDone } from '../src/systems/coloring';
import { prestige } from '../src/systems/prestige';

/** Des dessins de deux zones (les vrais ont leurs Path2D, ui/rareBooks/coloring). */
const ZONES = Object.fromEntries(COLORING_DRAWINGS.map(({ id }) => [id, ['a', 'b']]));

const fill = (state: ReturnType<typeof createInitialState>, drawing: string): void => {
  for (const zone of ZONES[drawing]) colorZone(state, drawing, zone, '#d8492f', ZONES);
};

describe('Colorie la Bibliothèque', () => {
  it('une zone prend la couleur du crayon, la gomme l’efface', () => {
    const state = createInitialState('fr', 0, 1);
    expect(colorZone(state, 'tower', 'a', '#4f9fd8', ZONES)).toBe(true);
    expect(state.coloring.tower).toEqual({ a: '#4f9fd8' });
    expect(colorZone(state, 'tower', 'a', '#4f9fd8', ZONES)).toBe(false);
    expect(colorZone(state, 'tower', 'a', null, ZONES)).toBe(true);
    expect(state.coloring.tower).toEqual({});
  });

  it('le premier dessin fini : « Sans dépasser » ; tous : le sceau secret', () => {
    const state = createInitialState('fr', 0, 1);
    colorZone(state, 'tower', 'a', '#4f9fd8', ZONES);
    expect('coloringFirst' in state.seals).toBe(false);
    colorZone(state, 'tower', 'b', '#4f9fd8', ZONES);
    expect(drawingDone(state, 'tower', ZONES)).toBe(true);
    expect('coloringFirst' in state.seals).toBe(true);
    for (const { id } of COLORING_DRAWINGS.slice(0, -1)) fill(state, id);
    expect('coloringAll' in state.seals).toBe(false);
    fill(state, COLORING_DRAWINGS.at(-1)!.id);
    expect('coloringAll' in state.seals).toBe(true);
  });

  it('les couleurs restent au prestige', () => {
    const state = createInitialState('fr', 0, 1);
    fill(state, 'night');
    state.totalPagesRead = 1e15;
    expect(prestige(state)).toBeGreaterThan(0);
    expect(state.coloring.night).toEqual({ a: '#d8492f', b: '#d8492f' });
  });
});
