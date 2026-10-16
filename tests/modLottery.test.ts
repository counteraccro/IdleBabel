import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { clearQuantities, modify } from '../src/mods/quantities';
import { clearHooks, registerHook, type ModDraw } from '../src/mods/hooks';
import { modGame } from '../src/mods/game';
import { drawLottery, forceDraw } from '../src/systems/lottery';
import { pagesPerSecond } from '../src/systems/production';
import { catchMimic, spawnMimic } from '../src/systems/mimic';
import { BOON_SECONDS, CURSE_SECONDS, GOLDEN_SECONDS } from '../src/data/lottery';

vi.stubGlobal('window', new EventTarget());

afterEach(() => {
  clearQuantities();
  clearHooks();
  forceDraw(null);
});

/** Une partie qui lit, avec des jetons. */
const reading = () => {
  const state = createInitialState('fr');
  state.tools.diagonal = 10;
  state.lottery.tokens = 5;
  return state;
};

/** La Loterie dans l'API des mods (l'auteur, 16/10) : ses grandeurs, son crochet, IdleBabel.game.lottery(). */
describe('la Loterie pour les mods', () => {
  it('lotteryOdds:<résultat> change les chances : seul le gain sort', () => {
    for (const outcome of ['nothing', 'boon', 'curse', 'jackpot']) modify(`lotteryOdds:${outcome}`, () => 0);
    const state = reading();
    for (let i = 0; i < 5; i++) expect(drawLottery(state)!.outcome).toBe('gain');
  });

  it('lotteryGain, lotteryBoon, lotteryCurse : la durée du gain, des bonus, des malus (Mimic dorée comprise)', () => {
    modify('lotteryGain', () => 2);
    modify('lotteryBoon', () => 0.5);
    modify('lotteryCurse', () => 3);
    const state = reading();
    forceDraw('gain');
    drawLottery(state, Math.random, 0);
    expect(state.pages).toBeCloseTo(pagesPerSecond(state) * 3600);
    forceDraw('all2');
    drawLottery(state, Math.random, 0);
    forceDraw('half');
    drawLottery(state, Math.random, 0);
    forceDraw('golden');
    drawLottery(state, Math.random, 0);
    expect(state.lottery.effects.find((effect) => effect.id === 'all2')!.end).toBe(BOON_SECONDS * 500);
    expect(state.lottery.effects.find((effect) => effect.id === 'half')!.end).toBe(CURSE_SECONDS * 3000);
    expect(state.lottery.golden!.until).toBe(GOLDEN_SECONDS * 3000);
  });

  it('tokenChance : une Mimic attrapée lâche toujours un jeton', () => {
    modify('tokenChance', () => 3);
    const state = createInitialState('fr');
    spawnMimic(state);
    expect(catchMimic(state, Date.now(), () => 0.9)!.token).toBe(true);
    expect(state.lottery.tokens).toBe(1);
  });

  it('le crochet lottery reçoit chaque tirage ; game.lottery() dit les jetons et ce qui est en cours', () => {
    const draws: ModDraw[] = [];
    registerHook('lottery', (draw) => void draws.push(draw));
    const state = reading();
    forceDraw('all3');
    drawLottery(state);
    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({ outcome: 'boon', boon: 'all3' });
    expect(draws[0].reels).toHaveLength(3);
    const lottery = modGame(state).lottery();
    expect(lottery).toMatchObject({ tokens: 4, draws: 1, blocked: false, golden: 0 });
    expect(lottery.effects[0].id).toBe('all3');
    expect(lottery.effects[0].left).toBeGreaterThan(3590);
  });

  it('toutes les chances à 0 : le jeton donne « rien »', () => {
    for (const outcome of ['nothing', 'gain', 'boon', 'curse', 'jackpot']) modify(`lotteryOdds:${outcome}`, () => 0);
    expect(drawLottery(reading())!.outcome).toBe('nothing');
  });
});
