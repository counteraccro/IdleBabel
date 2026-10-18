import { BOON_SECONDS, LOTTERY_BOONS, LOTTERY_CURSES, OUTCOMES } from '../../data/lottery';
import { TOOLS } from '../../data/tools';
import { forceDraw } from '../../systems/lottery';
import { dailyTokensLeft } from '../../systems/tokenRelic';
import { lotteryEffects, startLotteryEffect } from '../../systems/lotteryEffects';
import { goldenHere, spawnGolden } from '../../systems/goldenMimic';
import { chips } from '../debugControls';
import { duration, type DebugSubject } from './subject';

/** La Loterie (systems/lottery.ts) : des jetons, le prochain tirage imposé, la Mimic dorée tout de suite. */
export const LOTTERY_SUBJECT: DebugSubject = {
  id: 'resources:lottery',
  chapter: 'resources',
  name: 'La Loterie',
  description: 'Des jetons, le prochain tirage imposé, la Mimic dorée tout de suite, les bonus et malus en cours.',
  peek: (state) => `${state.lottery.tokens} jeton(s)`,
  build: (kit, state) => {
    kit.number(
      'Jetons',
      () => state.lottery.tokens,
      (value) => (state.lottery.tokens = Math.max(0, Math.floor(value))),
      { steps: true },
    );
    kit.row(
      'Prochain tirage',
      chips([
        ['Au hasard', () => forceDraw(null)],
        ...OUTCOMES.map((one): [string, () => void] => [one.id, () => forceDraw(one.id)]),
        ...LOTTERY_BOONS.map((one): [string, () => void] => [one.id, () => forceDraw(one.id)]),
        ...LOTTERY_CURSES.map((one): [string, () => void] => [one.id, () => forceDraw(one.id)]),
        ['Le Jeton (4 · 1 · 0)', () => forceDraw('relic')],
      ]),
      'Un résultat (le gros lot donne « rien » sans le tome 1, ou sans tome écrit à gagner), ou un bonus, ou un malus précis, ou le Jeton (« rien » s’il est déjà trouvé).',
    );
    kit.row(
      'Tout de suite',
      chips([
        ['La Mimic dorée', () => spawnGolden(state)],
        // Tous les bonus d'une heure (le ×10 sur la première méthode qu'on a) : la machine se bloque.
        [
          'Tous les bonus',
          () => {
            const method = TOOLS.find((tool) => state.tools[tool.id] > 0)?.id;
            for (const boon of LOTTERY_BOONS)
              if (boon.id !== 'method10' || method)
                startLotteryEffect(state, boon.id, BOON_SECONDS, Date.now(), boon.id === 'method10' ? method : undefined);
          },
        ],
        ['Effacer bonus et malus', () => ((state.lottery.effects = []), (state.lottery.golden = null))],
      ]),
    );
    kit.info(
      'En cours',
      () =>
        [
          ...lotteryEffects(state).map(
            (effect) => `${effect.id}${effect.method ? ` (${effect.method})` : ''} ${duration((effect.end - Date.now()) / 1000)}`,
          ),
          ...(goldenHere(state) ? [`Mimic dorée ${duration((state.lottery.golden!.until - Date.now()) / 1000)}`] : []),
        ].join(', ') || 'rien',
    );
    kit.info('Jetons du jour (le Jeton)', () => String(dailyTokensLeft(state)));
    kit.info('Tirages', () => String(state.lottery.draws));
  },
};
