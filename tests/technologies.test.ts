import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { passTime } from '../src/core/absence';
import { AWAY_SHARE, DUPLICATE_SHARE, MAX_AWAY_SECONDS, MAX_TURNS_PER_SECOND, TARGET_SHARE } from '../src/data/knowledge';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { maxTurnsPerSecond } from '../src/systems/knowledge';
import { pagesPerSecond, toolRate } from '../src/systems/production';
import { PAGES_PER_CLICK, readPage } from '../src/systems/click';
import { RARE_CHANCE, drawRareBook } from '../src/systems/rareBooks';
import { write, segments } from '../src/systems/sentences';
import {
  duplicateShare,
  levelOf,
  lockOf,
  maxLevel,
  nextPrice,
  priceAt,
  rareChance,
  targetShare,
  technologiesCompletion,
  understand,
} from '../src/systems/technologies';
import type { TechnologyId } from '../src/data/technologies';

vi.stubGlobal('window', new EventTarget());

/** Une partie où l'intuition `id` est comprise jusqu'au niveau `level`. */
const withLevel = (id: TechnologyId, level: number) => {
  const state = createInitialState('fr');
  state.technologies[id] = level;
  return state;
};

/** La phrase d'une méthode complète : la méthode est retrouvée. */
const unlock = (state: ReturnType<typeof createInitialState>, tool: string) =>
  write(
    state,
    tool,
    segments(tool).map((_, index) => index),
  );

describe('Intuitions de l’Âge I', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Fil d’Ariane et Mémoire des phrases : plus de trouvailles dans la phrase cherchée, moins de doublons', () => {
    expect(targetShare(withLevel('ariadne', 0))).toBeCloseTo(TARGET_SHARE);
    expect(targetShare(withLevel('ariadne', 3))).toBeCloseTo(0.9);
    expect(duplicateShare(withLevel('sentenceMemory', 0))).toBeCloseTo(DUPLICATE_SHARE);
    expect(duplicateShare(withLevel('sentenceMemory', 4))).toBeCloseTo(0);
  });

  it('Lecture rapide : le plafond des feuilles qui tournent seules monte jusqu’à 20 par seconde', () => {
    expect(maxTurnsPerSecond(withLevel('speedReading', 0))).toBe(MAX_TURNS_PER_SECOND);
    expect(maxTurnsPerSecond(withLevel('speedReading', 1))).toBe(10);
    expect(maxTurnsPerSecond(withLevel('speedReading', 5))).toBe(20);
  });

  it('Mémoire musculaire : un clic rapporte en plus une part de la production d’une seconde', () => {
    const state = withLevel('muscleMemory', 2);
    state.tools.diagonal = 1000; // 100 pages/s
    readPage(state);
    expect(state.pages).toBeCloseTo(PAGES_PER_CLICK + 100 * 0.02);
  });

  it('Cartographie du Retour et Sommeil profond : plus de lecture comptée, plus longtemps', () => {
    const away = (map: number, sleep: number) => {
      const state = withLevel('returnMap', map);
      state.technologies.deepSleep = sleep;
      state.tools.diagonal = 100; // 10 pages/s
      return passTime(state, 48 * 3600, 'away');
    };
    expect(away(0, 0).pages).toBeCloseTo(10 * MAX_AWAY_SECONDS * AWAY_SHARE);
    expect(away(5, 0).pages).toBeCloseTo(10 * MAX_AWAY_SECONDS);
    const slept = away(0, 2);
    expect(slept.pages).toBeCloseTo(10 * (MAX_AWAY_SECONDS + 2 * 3600) * AWAY_SHARE);
    expect(slept.capped).toBe(true);
  });

  it('Sommeil profond : sans fin, chaque heure coûte le double de la précédente', () => {
    expect(maxLevel('deepSleep')).toBe(Infinity);
    expect(priceAt('deepSleep', 0)).toBe(2_500);
    expect(priceAt('deepSleep', 3)).toBe(20_000);
    const state = createInitialState('fr');
    state.knowledge = 1e9;
    for (let i = 0; i < 12; i++) expect(understand(state, 'deepSleep')).toBe(true);
    expect(levelOf(state, 'deepSleep')).toBe(12);
  });

  it('Flair : plus de livres rares, et un livre rare le reste ; plus rien à comprendre quand tous sont trouvés', () => {
    expect(rareChance(withLevel('flair', 4))).toBeCloseTo(1 / 100);
    for (let index = 3; index < 3000; index++)
      if (drawRareBook(index, () => false, RARE_CHANCE)) expect(drawRareBook(index, () => false, 1 / 100)).toBeDefined();
    const state = createInitialState('fr');
    for (const [index, book] of RARE_BOOKS.entries()) state.rareBooks[book.id] = index;
    expect(lockOf(state, 'flair')).toBe('nothingLeft');
    expect(nextPrice(state, 'flair')).toBeUndefined();
  });

  it('Une par méthode : cachée tant que la méthode n’est pas retrouvée, puis sa production ×2 par niveau', () => {
    const state = createInitialState('fr');
    state.knowledge = 1e9;
    expect(lockOf(state, 'fingerGesture')).toBe('unknownGesture');
    expect(understand(state, 'fingerGesture')).toBe(false);
    unlock(state, 'finger');
    expect(nextPrice(state, 'fingerGesture')).toBe(125);
    state.tools.finger = 2; // 1 page/s
    expect(understand(state, 'fingerGesture')).toBe(true);
    expect(understand(state, 'fingerGesture')).toBe(true);
    expect(pagesPerSecond(state)).toBeCloseTo(4);
    // Ce que lit chacune (livre blanc, ruche des méthodes) : 0,5 × 2².
    expect(toolRate(state, 'finger')).toBeCloseTo(2);
  });

  it('la page de titre compte les intuitions qui ont une fin', () => {
    const state = withLevel('deepSleep', 30);
    expect(technologiesCompletion(state)).toBe(0);
    state.technologies.ariadne = 3;
    expect(technologiesCompletion(state)).toBeGreaterThan(0);
  });
});
