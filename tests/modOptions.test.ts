import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { clearMods, registerMod } from '../src/mods/registry';
import { modOption, modOptionValues, modsWithOptions, setModOption, type ModOption } from '../src/mods/modOptions';
import { modGame } from '../src/mods/game';
import { nextToolCost } from '../src/systems/tools';
import { pagesPerSecond, toolRate } from '../src/systems/production';
import { nextEtherPages, prestigeGain } from '../src/systems/prestige';

vi.stubGlobal('window', new EventTarget());

afterEach(() => clearMods());

const OPTIONS: ModOption[] = [
  {
    id: 'methods',
    name: { fr: 'Méthodes', en: 'Methods' },
    choices: [
      { id: 'all', name: 'Toutes' },
      { id: 'none', name: 'Aucune' },
    ],
    default: 'all',
  },
  { id: 'panel', name: 'Bloc', default: true },
];

describe('Les options des mods', () => {
  it('prennent leur défaut, puis la valeur gardée ; le mod est prévenu à chaque changement', () => {
    const state = createInitialState('fr');
    const seen: unknown[] = [];
    registerMod(state, 'essai', { version: '1.0.0', options: OPTIONS, onOptions: (values) => seen.push(values) });
    expect(seen).toEqual([{ methods: 'all', panel: true }]);
    setModOption(state, 'essai', 'panel', false);
    expect(state.modOptions.essai).toEqual({ panel: false });
    expect(modOption(state, 'essai', 'panel')).toBe(false);
    expect(seen.at(-1)).toEqual({ methods: 'all', panel: false });
    expect(modsWithOptions().map((mod) => [mod.id, mod.version])).toEqual([['essai', '1.0.0']]);
  });

  it('reprennent leur défaut quand la valeur gardée ne vaut plus rien (choix renommé, mauvais type)', () => {
    const state = createInitialState('fr');
    state.modOptions.essai = { methods: 'disparu', panel: 'oui' };
    registerMod(state, 'essai', { options: OPTIONS });
    expect(modOptionValues(state, 'essai')).toEqual({ methods: 'all', panel: true });
    expect(modOption(state, 'essai', 'inconnue')).toBeUndefined();
  });

  it('sautent une option mal formée ; un mod sans option n’a pas de page', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const state = createInitialState('fr');
    registerMod(state, 'sans', {});
    registerMod(state, 'casse', { options: [{ id: 'x', name: 'X', default: 'pas une case' } as ModOption, ...OPTIONS] });
    expect(modsWithOptions().map((mod) => [mod.id, mod.options.length])).toEqual([['casse', 2]]);
    error.mockRestore();
  });
});

describe('IdleBabel.game', () => {
  it('rend les vrais chiffres du jeu : prix avec l’Économie du geste, production, gain d’Éther', () => {
    const state = createInitialState('fr');
    state.tools.diagonal = 12;
    state.technologies.bargain = 3;
    state.totalPagesRead = 5e10;
    const game = modGame(state);
    const diagonal = game.methods().find((method) => method.id === 'diagonal')!;
    expect(diagonal.nextCost).toBe(nextToolCost(state, 'diagonal'));
    expect(diagonal.rate).toBe(toolRate(state, 'diagonal'));
    expect(diagonal.owned).toBe(12);
    expect(game.pagesPerSecond()).toBe(pagesPerSecond(state));
    expect(game.ether()).toEqual({ gain: prestigeGain(state), total: 5e10, next: nextEtherPages(state) });
    expect(game.ether().gain).toBeGreaterThan(0);
    const gesture = game.intuitions().find((intuition) => intuition.id === 'diagonalGesture')!;
    expect(gesture.method).toBe('diagonal');
    expect(game.intuitions().find((intuition) => intuition.id === 'bargain')!.level).toBe(3);
  });

  it('dit la relique qui agit et le temps avant de pouvoir en changer', () => {
    const state = createInitialState('fr');
    expect(modGame(state).relics()).toEqual({ active: null, name: null, found: 0, changeIn: 0 });
    state.relics.found = { loupe: 1, hourglass: 2 };
    state.relics.active = 'hourglass';
    state.relics.lockedUntil = Date.now() + 3_600_000;
    const relics = modGame(state).relics();
    expect(relics).toMatchObject({ active: 'hourglass', found: 2 });
    expect(relics.name).toBeTruthy();
    expect(relics.changeIn).toBeGreaterThan(3590);
    expect(relics.changeIn).toBeLessThanOrEqual(3600);
  });
});
