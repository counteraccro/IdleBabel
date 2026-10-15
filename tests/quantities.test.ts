import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { clearQuantities, combineOf, modded, modify, QUANTITIES, rule, tune } from '../src/mods/quantities';
import { clearHooks, registerHook, type Hooks } from '../src/mods/hooks';
import { mountModApi } from '../src/mods/api';
import { lotCost, nextToolCost, buyTools } from '../src/systems/tools';
import { pagesPerSecond, toolRate } from '../src/systems/production';
import { findChance } from '../src/systems/knowledge';
import { awayShare, duplicateShare, maxAwaySeconds, nextPrice, rareChance, turnsPerSecond, understand } from '../src/systems/technologies';
import { letterStays, letterWait, catchLetter } from '../src/systems/letter';
import { catchMimic, mimicBonusShare, mimicEvery } from '../src/systems/mimic';
import { relicLockHours, findRelic } from '../src/systems/relics';
import { etherDeserved, nextEtherPages } from '../src/systems/prestige';
import { findableTarget } from '../src/systems/findable';
import { segments } from '../src/systems/sentences';
import { lightStar } from '../src/systems/etherium';
import { takeBook, forceRareBook } from '../src/systems/rareBooks';
import { closeBook } from '../src/systems/books';
import { sealEvent } from '../src/systems/seals';
import { COST_GROWTH } from '../src/data/tools';
import { ETHER_PAGES } from '../src/data/etherium';

vi.stubGlobal('window', new EventTarget());

afterEach(() => {
  clearQuantities();
  clearHooks();
  forceRareBook(1, undefined);
});

/** Une partie avancée : des méthodes, des intuitions, de l'Éther (pour que chaque grandeur ait de quoi agir). */
const advanced = () => {
  const state = createInitialState('fr');
  state.tools.diagonal = 30;
  state.tools.finger = 10;
  state.technologies.speedReading = 2;
  state.technologies.returnMap = 1;
  state.pages = 1e9;
  state.knowledge = 1e9;
  return state;
};

describe('les grandeurs (IdleBabel.modify)', () => {
  it('sans mod, ne changent rien, au bit près', () => {
    const state = advanced();
    for (const name of Object.keys(QUANTITIES))
      expect(modded(name), name).toBe(QUANTITIES[name as keyof typeof QUANTITIES] === 'product' ? 1 : 0);
    expect(modded('method:diagonal')).toBe(1);
    expect(nextToolCost(state, 'diagonal')).toBe(15 * COST_GROWTH ** 30);
    expect(rule('costGrowth', COST_GROWTH)).toBe(COST_GROWTH);
  });

  it('multiplient (×) ou ajoutent (+) là où le jeu calcule chaque chiffre', () => {
    const state = advanced();
    const before = {
      pps: pagesPerSecond(state),
      diagonal: toolRate(state, 'diagonal'),
      finger: toolRate(state, 'finger'),
      cost: nextToolCost(state, 'finger'),
      find: findChance(state),
      rare: rareChance(state),
      turns: turnsPerSecond(state),
      away: awayShare(state),
      awaySeconds: maxAwaySeconds(state),
      duplicates: duplicateShare(state),
      wait: letterWait(state).max,
      stays: letterStays(state),
      mimic: mimicEvery(state),
      gives: mimicBonusShare(state),
      lock: relicLockHours(state),
      price: nextPrice(state, 'semanticFilter')!,
    };
    modify('reading', () => 2);
    modify('method:diagonal', () => 3);
    modify('methodCost', () => 0.5);
    modify('methodCost:finger', () => 0.5);
    modify('findChance', () => 4);
    modify('rareChance', () => 2);
    modify('turns', () => 3);
    modify('awayShare', () => 0.1);
    modify('awayHours', () => 2);
    modify('duplicates', () => -0.05);
    modify('letterWait', () => 0.5);
    modify('letterStays', () => 4);
    modify('mimicEvery', () => 2);
    modify('mimicGives', () => 0.2);
    modify('relicLock', () => 0.25);
    modify('intuitionCost', () => 2);
    expect(toolRate(state, 'diagonal')).toBeCloseTo(before.diagonal * 6);
    expect(toolRate(state, 'finger')).toBeCloseTo(before.finger * 2);
    expect(nextToolCost(state, 'finger')).toBeCloseTo(before.cost / 4);
    expect(findChance(state)).toBeCloseTo(before.find * 4);
    expect(rareChance(state)).toBeCloseTo(before.rare * 2);
    expect(turnsPerSecond(state)).toBe(before.turns + 3);
    expect(awayShare(state)).toBeCloseTo(before.away + 0.1);
    expect(maxAwaySeconds(state)).toBe(before.awaySeconds + 7200);
    expect(duplicateShare(state)).toBeCloseTo(before.duplicates - 0.05);
    expect(letterWait(state).max).toBeCloseTo(before.wait / 2);
    expect(letterStays(state)).toBe(before.stays + 4);
    expect(mimicEvery(state)).toBe(before.mimic * 2);
    expect(mimicBonusShare(state)).toBeCloseTo(before.gives + 0.2);
    expect(relicLockHours(state)).toBe(before.lock / 4);
    expect(nextPrice(state, 'semanticFilter')).toBe(before.price * 2);
  });

  it('combinent plusieurs mods : facteurs multipliés, ajouts additionnés ; un mod cassé ne compte pas', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    modify('findChance', () => 2);
    modify('findChance', () => 3);
    modify('findChance', () => -1);
    modify('findChance', () => Number.NaN);
    modify('findChance', () => {
      throw new Error('cassé');
    });
    modify('turns', () => 1);
    modify('turns', () => 2);
    expect(modded('findChance')).toBe(6);
    expect(modded('turns')).toBe(3);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('refusent un nom inconnu ; une méthode se vise par « method:<id> »', () => {
    expect(modify('vitesse', () => 2)).toBe(false);
    expect(modify('method:', () => 2)).toBe(false);
    expect(modify('findChance', 2 as never)).toBe(false);
    expect(combineOf('method:diagonal')).toBe('product');
    expect(combineOf('methodCost:finger')).toBe('product');
    expect(combineOf('turns')).toBe('sum');
  });

  it('se posent par window.IdleBabel, un nombre fixe ou une fonction', () => {
    const state = advanced();
    const api = mountModApi(state);
    const before = findChance(state);
    expect(api.modify('findChance', 2)).toBe(true);
    expect(api.modify('findChance', () => 1.5)).toBe(true);
    expect(findChance(state)).toBeCloseTo(before * 3);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(api.modify('rien', 2)).toBe(false);
    expect(api.tune('costGrowth', 0.5)).toBe(false);
    error.mockRestore();
  });
});

describe('les règles (IdleBabel.tune)', () => {
  it('changent la hausse des prix, le seuil de découverte et le prix de l’Éther', () => {
    const state = advanced();
    expect(tune('costGrowth', 1.1)).toBe(true);
    expect(nextToolCost(state, 'diagonal')).toBeCloseTo(15 * 1.1 ** 30);
    expect(lotCost(state, 'diagonal', 2)).toBeCloseTo(15 * 1.1 ** 30 * 2.1);
    // Le Doigt attend 25 Lectures Diagonales : avec 30, sa phrase se trouve ; avec un seuil de 50, pas encore.
    state.written.diagonal = segments('diagonal').map((_, index) => index);
    expect(findableTarget(state)).toBe('finger');
    expect(tune('methodGate', 50)).toBe(true);
    expect(findableTarget(state)).toBeUndefined();
    state.totalPagesRead = 8 * ETHER_PAGES;
    expect(etherDeserved(state)).toBe(2);
    expect(tune('etherPages', ETHER_PAGES / 8)).toBe(true);
    expect(etherDeserved(state)).toBe(4);
    expect(nextEtherPages(state)).toBe(125 * (ETHER_PAGES / 8));
  });

  it('refusent une règle inconnue ou une valeur hors bornes', () => {
    expect(tune('vitesse', 2)).toBe(false);
    expect(tune('costGrowth', 1)).toBe(false);
    expect(tune('methodGate', 2.5)).toBe(false);
    expect(tune('etherPages', Number.POSITIVE_INFINITY)).toBe(false);
    expect(rule('costGrowth', COST_GROWTH)).toBe(COST_GROWTH);
  });
});

describe('les nouveaux crochets', () => {
  const listen = <N extends keyof Hooks>(name: N): Parameters<Hooks[N]>[0][] => {
    const calls: Parameters<Hooks[N]>[0][] = [];
    registerHook(name, ((value: Parameters<Hooks[N]>[0]) => {
      calls.push(value);
    }) as Hooks[N]);
    return calls;
  };

  it('disent les achats, les intuitions, les étoiles, les livres, les reliques, les sceaux, la Mimic et les bonus', () => {
    const state = advanced();
    const buys = listen('buy');
    buyTools(state, 'diagonal', 1);
    expect(buys).toEqual([{ method: 'diagonal', count: 1, cost: expect.any(Number) }]);

    const intuitions = listen('intuition');
    understand(state, 'semanticFilter');
    expect(intuitions).toEqual([{ id: 'semanticFilter', level: 1 }]);

    const stars = listen('star');
    state.ether = 10;
    state.etheriumInHand = true;
    lightStar(state, 'reading.s0');
    expect(stars).toEqual([{ id: 'reading.s0', cost: 1 }]);

    const rare = listen('rareBook');
    forceRareBook(7, 'bible');
    takeBook(state, 7);
    takeBook(state, 7);
    expect(rare).toEqual([{ id: 'bible', index: 7 }]);

    const books = listen('book');
    closeBook(state);
    expect(books).toEqual([{ finished: 1 }]);

    const relics = listen('relic');
    findRelic(state, 'loupe');
    expect(relics).toEqual([{ id: 'loupe' }]);

    const seals = listen('seal');
    sealEvent(state, 'lastInstant');
    sealEvent(state, 'lastInstant');
    expect(seals).toEqual([{ id: 'lastInstant' }]);

    const mimics = listen('mimicCaught');
    state.mimic.at = Date.now();
    state.mimic.eaten = 100;
    catchMimic(state);
    expect(mimics).toEqual([{ eaten: 100, bonus: 10 }]);

    const boons = listen('boon');
    catchLetter(state, 5, () => 0);
    expect(boons).toEqual([{ id: 'trance', seconds: 30 }]);
  });
});
