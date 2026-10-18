import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { loadGame, saveGame } from '../src/core/save';
import { RELIC_REELS } from '../src/data/lottery';
import { drawLottery, forceDraw, reelsFor } from '../src/systems/lottery';
import { relicFound } from '../src/systems/relics';
import { dailyTokensLeft, lotteryTokens, refreshTokenDay } from '../src/systems/tokenRelic';
import { SEALS } from '../src/data/seals';

vi.stubGlobal('window', new EventTarget());

const DAY = new Date(2026, 9, 18, 12).getTime();
const NEXT_DAY = new Date(2026, 9, 19, 0, 5).getTime();

/** Une partie qui a le Jeton, posé. */
const withToken = () => {
  const state = createInitialState('fr');
  state.relics.found.token = DAY;
  state.relics.active = 'token';
  return state;
};

describe('Le Jeton (la 5e relique)', () => {
  it('se gagne à la Loterie, rouleaux sur 4 · 1 · 0 : rangé, son récit, son sceau, et il agit s’il est le premier', () => {
    const state = createInitialState('fr');
    state.lottery.tokens = 1;
    forceDraw('relic');
    const draw = drawLottery(state, Math.random, DAY)!;
    expect(draw.reels).toEqual([...RELIC_REELS]);
    expect(draw.relic).toBe(true);
    expect(draw.outcome).toBe('nothing');
    expect(relicFound(state, 'token')).toBe(true);
    expect(state.relics.active).toBe('token');
    expect(state.lorePending).toContain('relicToken');
    expect(SEALS.find((seal) => seal.id === 'relicToken')!.reached(state)).toBe(true);
  });

  it('ne sort qu’une fois : trouvé, le tirage forcé donne « rien »', () => {
    const state = withToken();
    state.lottery.tokens = 1;
    forceDraw('relic');
    const draw = drawLottery(state, Math.random, DAY)!;
    expect(draw.relic).toBeUndefined();
    expect(draw.reels).not.toEqual([...RELIC_REELS]);
  });

  it('se tire sur « rien », une fois sur 50 en tout', () => {
    // Le premier nombre choisit « rien » (0), les trois suivants ses rouleaux ; le cinquième décide du Jeton : sous
    // 1/50 ÷ 40 % (0,05), il sort.
    const sure = [0, 0.1, 0.2, 0.3, 0.04];
    const state = createInitialState('fr');
    state.lottery.tokens = 1;
    let i = 0;
    expect(drawLottery(state, () => sure[i++ % sure.length], DAY)!.relic).toBe(true);
    const missed = [0, 0.1, 0.2, 0.3, 0.06];
    const other = createInitialState('fr');
    other.lottery.tokens = 1;
    i = 0;
    expect(drawLottery(other, () => missed[i++ % missed.length], DAY)!.relic).toBeUndefined();
  });

  it('un « rien » ordinaire ne tombe jamais sur 4 · 1 · 0', () => {
    for (let i = 0; i < 2000; i++) expect(reelsFor('nothing', Math.random)).not.toEqual([...RELIC_REELS]);
  });

  it('offre 5 jetons par jour, joués avant les jetons gagnés, perdus à minuit (pas cumulés)', () => {
    const state = withToken();
    state.lottery.tokens = 2;
    expect(refreshTokenDay(state, DAY)).toBe(5);
    expect(refreshTokenDay(state, DAY)).toBe(0);
    expect(lotteryTokens(state, DAY)).toBe(7);
    drawLottery(state, Math.random, DAY);
    expect(dailyTokensLeft(state, DAY)).toBe(4);
    expect(state.lottery.tokens).toBe(2);
    // Minuit : les 4 restants sont perdus, 5 nouveaux arrivent.
    expect(dailyTokensLeft(state, NEXT_DAY)).toBe(0);
    expect(refreshTokenDay(state, NEXT_DAY)).toBe(5);
    expect(lotteryTokens(state, NEXT_DAY)).toBe(7);
  });

  it('une étoile allumée dans la journée ajoute la différence (7, puis 10)', () => {
    const state = withToken();
    refreshTokenDay(state, DAY);
    state.etherium.push('relics.t1');
    expect(refreshTokenDay(state, DAY)).toBe(2);
    state.etherium.push('relics.t2');
    expect(refreshTokenDay(state, DAY)).toBe(3);
    expect(dailyTokensLeft(state, DAY)).toBe(10);
  });

  it('seulement quand il agit ; reposé le même jour, il ne redonne rien', () => {
    const state = withToken();
    state.relics.found.loupe = DAY;
    refreshTokenDay(state, DAY);
    state.relics.active = 'loupe';
    expect(dailyTokensLeft(state, DAY)).toBe(0);
    expect(refreshTokenDay(state, DAY)).toBe(0);
    state.relics.active = 'token';
    expect(refreshTokenDay(state, DAY)).toBe(0);
    expect(dailyTokensLeft(state, DAY)).toBe(5);
  });

  it('se garde dans la sauvegarde', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => (store[key] = value),
    });
    const state = withToken();
    refreshTokenDay(state, DAY);
    saveGame(state);
    expect(loadGame('fr').lottery.daily).toEqual({ day: '2026-10-18', left: 5, given: 5 });
    vi.unstubAllGlobals();
    vi.stubGlobal('window', new EventTarget());
  });
});
