import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { loadGame, saveGame } from '../src/core/save';
import { CURSE_SECONDS, GOLDEN_SECONDS, GOLDEN_STRIKES } from '../src/data/lottery';
import { drawLottery, drawableBoons, forceDraw, lotteryBlocked, reelsFor } from '../src/systems/lottery';
import { allLotteryBoons, lotteryMethod, lotteryReading } from '../src/systems/lotteryEffects';
import { SEALS } from '../src/data/seals';
import { goldenGone, goldenHere, spawnGolden, strikeGolden } from '../src/systems/goldenMimic';
import { catchMimic, mimicReading, spawnMimic } from '../src/systems/mimic';
import { gainPages, pagesPerSecond, toolRate } from '../src/systems/production';
import { gainFind } from '../src/systems/knowledge';
import { prestige } from '../src/systems/prestige';

vi.stubGlobal('window', new EventTarget());

const find = { kind: 'word', sentence: 'diagonal', segment: 0, duplicate: true } as const;

/** Une partie qui lit : dix diagonales, deux doigts. */
const reading = () => {
  const state = createInitialState('fr');
  state.tools.diagonal = 10;
  state.tools.finger = 2;
  state.lottery.tokens = 5;
  return state;
};

describe('La Loterie', () => {
  it('ne tourne pas sans jeton ; un tirage coûte un jeton', () => {
    const state = createInitialState('fr');
    expect(drawLottery(state)).toBeUndefined();
    expect(state.lottery.draws).toBe(0);
    state.lottery.tokens = 2;
    expect(drawLottery(state)).toBeDefined();
    expect(state.lottery.tokens).toBe(1);
    expect(state.lottery.draws).toBe(1);
  });

  it('montre le résultat sur les rouleaux : différents, deux pareils, trois pareils, trois 0, trois 7', () => {
    for (let i = 0; i < 50; i++) {
      const random = Math.random;
      const nothing = reelsFor('nothing', random);
      expect(new Set(nothing).size).toBe(3);
      expect(new Set(reelsFor('gain', random)).size).toBe(2);
      const boon = reelsFor('boon', random);
      expect(new Set(boon).size).toBe(1);
      expect([0, 7]).not.toContain(boon[0]);
    }
    expect(reelsFor('curse', Math.random)).toEqual([0, 0, 0]);
    expect(reelsFor('jackpot', Math.random)).toEqual([7, 7, 7]);
  });

  it('le gros lot donne « rien » tant que son livre n’est pas écrit', () => {
    const state = reading();
    forceDraw('jackpot');
    expect(drawLottery(state)?.outcome).toBe('nothing');
  });

  it('le gain : trente minutes de lecture, d’un coup', () => {
    const state = reading();
    forceDraw('gain');
    const draw = drawLottery(state)!;
    expect(draw.outcome).toBe('gain');
    expect(state.pages).toBeCloseTo(pagesPerSecond(state) * 1800);
    expect(draw.pages).toBeCloseTo(state.pages);
  });

  it('les bonus d’une heure se cumulent : ×2 puis ×3 = ×6', () => {
    const state = reading();
    const base = pagesPerSecond(state);
    forceDraw('all2');
    drawLottery(state, Math.random, 0);
    forceDraw('all3');
    drawLottery(state, Math.random, 0);
    expect(lotteryReading(state, 1000)).toBe(6);
    vi.useFakeTimers({ now: 1000 });
    expect(pagesPerSecond(state)).toBeCloseTo(base * 6);
    vi.useRealTimers();
    expect(lotteryReading(state, 3_600_000 + 1)).toBe(1);
  });

  it('un bonus en cours ne se tire plus ; tous en cours, la machine se bloque (le jeton reste)', () => {
    const state = reading();
    state.lottery.tokens = 10;
    forceDraw('all2');
    drawLottery(state, Math.random, 0);
    forceDraw('all2');
    const again = drawLottery(state, Math.random, 0)!;
    expect(again.boon).not.toBe('all2');
    expect(state.lottery.effects.find((effect) => effect.id === 'all2')!.end).toBe(3_600_000);
    expect(drawableBoons(state, 0)).toHaveLength(2);
    forceDraw('boon');
    drawLottery(state, Math.random, 0);
    forceDraw('boon');
    drawLottery(state, Math.random, 0);
    expect(allLotteryBoons(state, 0)).toBe(true);
    expect(lotteryBlocked(state, 0)).toBe(true);
    expect(drawLottery(state, Math.random, 0)).toBeUndefined();
    expect(state.lottery.tokens).toBe(6);
    // Une heure plus tard, tout est fini : la machine reprend.
    expect(lotteryBlocked(state, 3_600_001)).toBe(false);
  });

  it('sans méthode, pas de ×10 : les trois autres suffisent à bloquer la machine', () => {
    const state = createInitialState('fr');
    state.lottery.tokens = 5;
    for (let i = 0; i < 3; i++) {
      forceDraw('boon');
      expect(drawLottery(state, Math.random, 0)!.boon).not.toBe('method10');
    }
    expect(lotteryBlocked(state, 0)).toBe(true);
  });

  it('les sceaux : tous les malus, tous les bonus, tout ensemble ; les jetons joués', () => {
    const state = reading();
    state.lottery.tokens = 20;
    const now = Date.now();
    const reached = (id: string) => SEALS.find((seal) => seal.id === id)!.reached(state);
    for (const curse of ['half', 'stopped', 'golden'] as const) {
      forceDraw(curse);
      drawLottery(state, Math.random, now);
    }
    expect(reached('allCurses')).toBe(true);
    expect(reached('allEffects')).toBe(false);
    for (const boon of ['all15', 'all2', 'all3', 'method10'] as const) {
      forceDraw(boon);
      drawLottery(state, Math.random, now);
    }
    expect(reached('allBoons')).toBe(true);
    expect(reached('allEffects')).toBe(true);
    expect(reached('tokensSpent-1')).toBe(true);
    expect(reached('tokensSpent-10')).toBe(false);
    state.lottery.draws = 1000;
    expect(reached('tokensSpent-1000')).toBe(true);
  });

  it('×10 pour une méthode qu’on a ; la méthode qui lit le plus s’arrête (malus)', () => {
    const state = reading();
    forceDraw('method10');
    const draw = drawLottery(state, Math.random, 0)!;
    expect(['diagonal', 'finger']).toContain(draw.method);
    expect(lotteryMethod(state, draw.method!, 1)).toBe(10);
    const other = reading();
    other.tools.finger = 4;
    // Les doigts lisent plus que les diagonales.
    expect(4 * toolRate(other, 'finger')).toBeGreaterThan(10 * toolRate(other, 'diagonal'));
    forceDraw('stopped');
    expect(drawLottery(other, Math.random, 0)!.method).toBe('finger');
    expect(lotteryMethod(other, 'finger', 1)).toBe(0);
    expect(lotteryMethod(other, 'finger', CURSE_SECONDS * 1000 + 1)).toBe(1);
  });

  it('un nouveau tirage n’efface pas un malus en cours', () => {
    const state = reading();
    forceDraw('half');
    drawLottery(state, Math.random, 0);
    forceDraw('all2');
    drawLottery(state, Math.random, 0);
    expect(lotteryReading(state, 1)).toBe(1);
  });

  it('les jetons, les bonus et malus restent au prestige', () => {
    const state = reading();
    forceDraw('all2');
    drawLottery(state);
    state.totalPagesRead = 1e10;
    prestige(state);
    expect(state.lottery.tokens).toBe(4);
    expect(lotteryReading(state)).toBe(2);
  });

  it('se sauvegarde', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => (store[key] = value),
    });
    const state = reading();
    forceDraw('half');
    drawLottery(state);
    saveGame(state);
    const loaded = loadGame('fr');
    expect(loaded.lottery.tokens).toBe(4);
    expect(loaded.lottery.effects).toEqual(state.lottery.effects);
    vi.unstubAllGlobals();
    vi.stubGlobal('window', new EventTarget());
  });
});

describe('La Mimic dorée', () => {
  it('mange tout ce qui est gagné pendant cinq minutes, avant la Mimic, et ne rend rien', () => {
    const state = reading();
    state.etherium = ['explore.e'];
    spawnMimic(state, () => 0.5, 0);
    spawnGolden(state, () => 0.5);
    gainPages(state, 100);
    gainFind(state, find);
    expect(state.pages).toBe(0);
    expect(state.mimic.eaten).toBe(0);
    expect(state.lottery.golden!.pages).toBe(100);
    expect(state.lottery.golden!.knowledge).toBeGreaterThan(0);
    // Un gain de la Loterie tiré pendant qu'elle est là y passe aussi.
    forceDraw('gain');
    expect(drawLottery(state)!.pages).toBe(0);
    expect(goldenHere(state, Date.now() + GOLDEN_SECONDS * 1000 + 1)).toBe(false);
    expect(goldenGone(state, Date.now() + GOLDEN_SECONDS * 1000 + 1)).toBe(true);
    expect(state.lottery.golden).toBeNull();
    expect(state.pages).toBe(0);
  });

  it('on ne peut pas la tuer ; frappée dix fois : un sceau secret', () => {
    const state = reading();
    spawnGolden(state);
    for (let i = 1; i < GOLDEN_STRIKES; i++) strikeGolden(state);
    expect('tenTimes' in state.seals).toBe(false);
    strikeGolden(state);
    expect(goldenHere(state)).toBe(true);
    expect('tenTimes' in state.seals).toBe(true);
  });
});

describe('Les jetons de la Mimic', () => {
  it('une Mimic attrapée sur trois lâche un jeton', () => {
    const state = createInitialState('fr');
    spawnMimic(state);
    expect(catchMimic(state, Date.now(), () => 0.5)!.token).toBe(false);
    spawnMimic(state);
    expect(catchMimic(state, Date.now(), () => 0.2)!.token).toBe(true);
    expect(state.lottery.tokens).toBe(1);
  });

  it('revue du 16/10 : un 2e « méthode arrêtée » allonge la même ; la Mimic cachée par la dorée ne ralentit plus', () => {
    const state = reading();
    forceDraw('stopped');
    const first = drawLottery(state, Math.random, 0)!.method;
    forceDraw('stopped');
    expect(drawLottery(state, Math.random, 0)!.method).toBe(first);
    expect(state.lottery.effects.filter((effect) => effect.id === 'stopped')).toHaveLength(1);
    expect(state.lottery.effects[0].end).toBe(2 * CURSE_SECONDS * 1000);
    const other = reading();
    spawnMimic(other);
    expect(mimicReading(other)).toBeLessThan(1);
    spawnGolden(other);
    expect(mimicReading(other)).toBe(1);
  });

  it('revue du 16/10 : la Mimic dorée prolongée garde sa durée entière ; le tirage dit sa durée', () => {
    const state = reading();
    forceDraw('golden');
    expect(drawLottery(state, Math.random, 0)!.seconds).toBe(GOLDEN_SECONDS);
    forceDraw('golden');
    drawLottery(state, Math.random, 1000);
    expect(state.lottery.golden!.total).toBe(2 * GOLDEN_SECONDS * 1000 - 1000);
  });

  it('revue du 16/10 : un gain avalé par la Mimic ordinaire compte (elle le rendra)', () => {
    const state = reading();
    state.settings.autoTurn = true;
    spawnMimic(state);
    forceDraw('gain');
    const draw = drawLottery(state, () => 0.5)!;
    expect(draw.knowledge).toBe(state.mimic.eaten);
  });
});
