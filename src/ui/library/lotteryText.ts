import { getLocale, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { BOON_SECONDS, CURSE_SECONDS, GOLDEN_SECONDS, type LotteryBoonId, type LotteryCurseId } from '../../data/lottery';
import type { ToolId } from '../../data/tools';
import type { Draw } from '../../systems/lottery';
import type { MachineResult } from './lotteryMachine3d';

/**
 * Ce que disent les textes de la Loterie : un bonus ou un malus (« Production ×2 », « Le Doigt qui Guide arrêté »), et le
 * résultat d'un tirage sur le panneau du gros lot. Les nombres en chiffres arabes, courts : le panneau est en Cinzel.
 */
export const effectText = (id: LotteryBoonId | LotteryCurseId, method?: ToolId): string =>
  t(`ui.lottery.effects.${id}`)
    .replace('{m}', method ? t(`tools.${method}.name`) : '')
    // L'accord (« Le Bit arrêté », « La Roue à Livres arrêtée ») : le genre de la méthode (tools.json, « f », « m »).
    .replace('{e}', method && t(`tools.${method}.gender`) === 'f' ? 'e' : '');

/** Une durée courte : « 1 h », « 1 h 30 », « 10 min » (arrondie à la minute). */
const length = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return t('ui.lottery.minutes').replace('{n}', String(minutes));
  const rest = minutes % 60;
  return t('ui.lottery.hours').replace('{n}', String(Math.floor(minutes / 60))) + (rest ? ` ${String(rest).padStart(2, '0')}` : '');
};

const short = (value: number): string => formatNumber(Math.floor(value), getLocale(), 'short');

const resultOf = (draw: Draw): MachineResult => {
  if (draw.outcome === 'gain')
    return {
      title: t('ui.lottery.gain.title'),
      line: t('ui.lottery.gain.line')
        .replace('{p}', short(draw.pages ?? 0))
        .replace('{k}', short(draw.knowledge ?? 0)),
    };
  if (draw.boon)
    return { title: t('ui.lottery.boon'), line: `${effectText(draw.boon, draw.method)} · ${length(draw.seconds ?? BOON_SECONDS)}` };
  if (draw.curse)
    return {
      title: t('ui.lottery.curse'),
      line: `${effectText(draw.curse, draw.method)} · ${length(draw.seconds ?? (draw.curse === 'golden' ? GOLDEN_SECONDS : CURSE_SECONDS))}`,
    };
  return { title: t('ui.lottery.nothing.title'), line: t('ui.lottery.nothing.line') };
};

/**
 * Ce que le panneau dit d'un tirage : son résultat ; puis, si la Mimic dorée a écrasé la Mimic ordinaire, ce que
 * celle-ci a rendu (« + 1,2 M de Connaissance · + 1 jeton »).
 */
export const drawResults = (draw: Draw): MachineResult[] => [
  resultOf(draw),
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
