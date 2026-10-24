import { getLocale, messages, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { BOON_SECONDS, CURSE_SECONDS, GOLDEN_SECONDS, type LotteryBoonId, type LotteryCurseId } from '../../data/lottery';
import type { ToolId } from '../../data/tools';
import type { Draw } from '../../systems/lottery';
import { boonFactor, halfFactor } from '../../systems/lotteryStars';
import type { MachineResult } from './lotteryMachine3d';
import { ROMAN } from '../../data/sagaTomes';
import type { GameState } from '../../core/state';

/**
 * Ce que disent les textes de la Loterie : un bonus ou un malus (« Production ×2 », « Le Doigt qui Guide arrêté »), et le
 * résultat d'un tirage sur le panneau du gros lot. Les nombres en chiffres arabes, courts : le panneau est en Cinzel. Le
 * facteur est celui du moment (le rouleau de la valeur de l'Etherium le change).
 */
export const effectText = (state: GameState, id: LotteryBoonId | LotteryCurseId, method?: ToolId): string =>
  t(`ui.lottery.effects.${id}`)
    .replace('{x}', factorText(state, id))
    .replace('{m}', method ? t(`tools.${method}.name`) : '')
    // L'accord (« Le Bit arrêté », « La Roue à Livres arrêtée », « Les Livres Intriqués arrêtés ») : le genre de la méthode
    // (tools.json, « f », « m », et au pluriel « mp », « fp »).
    .replace('{e}', method ? (AGREEMENT[t(`tools.${method}.gender`)] ?? '') : '');

/** La terminaison de « arrêté » selon le genre d'une méthode. */
const AGREEMENT: Record<string, string> = { f: 'e', mp: 's', fp: 'es' };

/** Le facteur d'un bonus (« 1,5 »), ou le diviseur de la production (« 2 ») ; rien pour les autres. */
const factorText = (state: GameState, id: LotteryBoonId | LotteryCurseId): string => {
  if (id === 'stopped' || id === 'golden') return '';
  const value = id === 'half' ? 1 / halfFactor(state) : boonFactor(state, id);
  return String(Math.round(value * 100) / 100).replace('.', getLocale() === 'fr' ? ',' : '.');
};

/** Une durée courte : « 1 h », « 1 h 30 », « 10 min » (arrondie à la minute). */
const length = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return t('ui.lottery.minutes').replace('{n}', String(minutes));
  const rest = minutes % 60;
  return t('ui.lottery.hours').replace('{n}', String(Math.floor(minutes / 60))) + (rest ? ` ${String(rest).padStart(2, '0')}` : '');
};

const short = (value: number): string => formatNumber(Math.floor(value), getLocale(), 'short');

const resultOf = (state: GameState, draw: Draw): MachineResult => {
  // Les rouleaux sur 4 · 1 · 0 : le Jeton (« UNE RELIQUE · Le Jeton »).
  if (draw.relic) return { title: t('ui.lottery.relic.title'), line: t('ui.lottery.relic.line') };
  // Le gros lot : le tome gagné (« Tome II · On en parlait tout bas »).
  if (draw.tome !== undefined) {
    const { tome, titles } = messages().ui.endings;
    return { title: t('ui.lottery.jackpot'), line: `${tome.replace('{n}', ROMAN[draw.tome])} · ${titles[draw.tome]}` };
  }
  if (draw.outcome === 'gain')
    return {
      title: t('ui.lottery.gain.title'),
      line: t('ui.lottery.gain.line')
        .replace('{p}', short(draw.pages ?? 0))
        .replace('{k}', short(draw.knowledge ?? 0)),
    };
  if (draw.boon)
    return { title: t('ui.lottery.boon'), line: `${effectText(state, draw.boon, draw.method)} · ${length(draw.seconds ?? BOON_SECONDS)}` };
  if (draw.curse)
    return {
      title: t('ui.lottery.curse'),
      line: `${effectText(state, draw.curse, draw.method)} · ${length(draw.seconds ?? (draw.curse === 'golden' ? GOLDEN_SECONDS : CURSE_SECONDS))}`,
    };
  return { title: t('ui.lottery.nothing.title'), line: t('ui.lottery.nothing.line') };
};

/**
 * Ce que le panneau dit d'un tirage : son résultat ; puis, si la Mimic dorée a écrasé la Mimic ordinaire, ce que
 * celle-ci a rendu (« + 1,2 M de Connaissance · + 1 jeton »).
 */
export const drawResults = (state: GameState, draw: Draw): MachineResult[] => [
  resultOf(state, draw),
  ...(draw.crushed
    ? [
        {
          title: t('ui.lottery.crushed'),
          line:
            t('ui.lottery.gain.knowledge').replace('{k}', short(draw.crushed.knowledge)) +
            (draw.crushed.token ? ` · ${t('ui.lottery.token')}` : ''),
        },
      ]
    : []),
];
