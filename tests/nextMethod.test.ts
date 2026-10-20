import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { segments, write } from '../src/systems/sentences';
import { ANNOUNCE_AFTER, announcedTool, toolPieces } from '../src/systems/nextMethod';

const writeAll = (state: GameState, id: string): void =>
  write(
    state,
    id,
    segments(id).map((_, index) => index),
  );

/** Une partie où les méthodes `open` sont ouvertes (leur phrase complète). */
const game = (...open: string[]): GameState => {
  const state = createInitialState('fr');
  open.forEach((id) => writeAll(state, id));
  return state;
};

describe('La méthode qui s’annonce', () => {
  it('attend 25 achats de la dernière méthode ouverte', () => {
    const state = game('diagonal');
    state.tools.diagonal = ANNOUNCE_AFTER - 1;
    expect(announcedTool(state)).toBeUndefined();
    state.tools.diagonal = ANNOUNCE_AFTER;
    expect(announcedTool(state)).toBe('finger');
  });

  it('compte sur la dernière ouverte, pas sur les précédentes', () => {
    const state = game('diagonal', 'finger');
    state.tools.diagonal = 100;
    expect(announcedTool(state)).toBeUndefined();
    state.tools.finger = ANNOUNCE_AFTER;
    expect(announcedTool(state)).toBe('voice');
  });

  it('jamais la première, ni une fois sa phrase complète', () => {
    expect(announcedTool(game())).toBeUndefined();
    const state = game('diagonal', 'finger');
    state.tools.finger = ANNOUNCE_AFTER;
    writeAll(state, 'voice');
    expect(announcedTool(state)).not.toBe('voice');
  });

  it('ni une méthode secrète, ni celle d’un Âge pas acheté', () => {
    const state = game('diagonal', 'finger', 'voice', 'lectern', 'ladder');
    state.tools.ladder = 1000;
    // Après l'Échelle viennent la Page Cornée (secrète) puis le Métronome (Âge Automatique, pas acheté).
    expect(announcedTool(state)).toBeUndefined();
  });

  it('dit où en est sa phrase, et quand le dernier morceau se devine', () => {
    const state = game('diagonal');
    const total = segments('finger').length;
    expect(toolPieces(state, 'finger')).toEqual({ sentence: 'finger', found: 0, total, guessable: false });
    write(
      state,
      'finger',
      segments('finger')
        .map((_, index) => index)
        .slice(1),
    );
    expect(toolPieces(state, 'finger')).toMatchObject({ found: total - 1, guessable: true });
  });
});
