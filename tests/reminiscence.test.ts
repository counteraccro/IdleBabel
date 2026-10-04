import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { forgetIntuitions, remember } from '../src/systems/reminiscence';
import { bestOf, levelOf, understand } from '../src/systems/technologies';

/** Une partie qui avait compris le filtre jusqu'au niveau 2 et l'Ariane au niveau 1, puis a tout oublié. */
const exiled = () => {
  const state = createInitialState('fr');
  state.knowledge = 1e6;
  understand(state, 'semanticFilter');
  understand(state, 'semanticFilter');
  understand(state, 'ariadne');
  forgetIntuitions(state);
  state.knowledge = 0;
  return state;
};

describe('Réminiscence', () => {
  it('garde le meilleur niveau quand tout est oublié', () => {
    const state = exiled();
    expect(levelOf(state, 'semanticFilter')).toBe(0);
    expect(bestOf(state, 'semanticFilter')).toBe(2);
  });

  it('ne fait rien tant qu’elle n’est pas obtenue, ou qu’on ne la laisse pas faire', () => {
    const state = exiled();
    state.knowledge = 1e6;
    expect(remember(state)).toBe(0);
    state.reminiscence = { known: true, on: false };
    expect(remember(state)).toBe(0);
  });

  it('rachète, la moins chère d’abord, jusqu’au meilleur niveau, pas plus', () => {
    const state = exiled();
    state.reminiscence.known = true;
    state.knowledge = 30; // le filtre I (25), pas l'Ariane (150)
    expect(remember(state)).toBe(1);
    expect(levelOf(state, 'semanticFilter')).toBe(1);
    state.knowledge = 1e6;
    expect(remember(state)).toBe(2);
    expect(levelOf(state, 'semanticFilter')).toBe(2);
    expect(levelOf(state, 'ariadne')).toBe(1);
    expect(levelOf(state, 'speedReading')).toBe(0);
  });

  it('la Brassée, intuition permanente, ne s’oublie pas', () => {
    const state = createInitialState('fr');
    state.knowledge = 1e6;
    understand(state, 'armful');
    understand(state, 'armful');
    understand(state, 'semanticFilter');
    forgetIntuitions(state);
    expect(levelOf(state, 'armful')).toBe(2);
    expect(levelOf(state, 'semanticFilter')).toBe(0);
  });
});
