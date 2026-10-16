import { getLocale, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { BOON_SECONDS, CURSE_SECONDS, GOLDEN_SECONDS, type LotteryBoonId, type LotteryCurseId } from '../../data/lottery';
import type { ToolId } from '../../data/tools';
import type { Draw } from '../../systems/lottery';
import type { MachineDraw } from './lotteryMachine3d';

/**
 * Ce que disent les textes de la Loterie : un bonus ou un malus (« Production ×2 », « Le Doigt qui Guide arrêtée »), et le
 * résultat d'un tirage sur le panneau du gros lot. Les nombres en chiffres arabes, courts : le panneau est en Cinzel.
 */
export const effectText = (id: LotteryBoonId | LotteryCurseId, method?: ToolId): string =>
  t(`ui.lottery.effects.${id}`).replace('{m}', method ? t(`tools.${method}.name`) : '');

const length = (seconds: number): string =>
  seconds >= 3600 ? t('ui.lottery.hour') : t('ui.lottery.minutes').replace('{n}', String(seconds / 60));

const short = (value: number): string => formatNumber(Math.floor(value), getLocale(), 'short');

const resultOf = (draw: Draw): MachineDraw['result'] => {
  if (draw.outcome === 'gain')
    return {
      title: t('ui.lottery.gain.title'),
      line: t('ui.lottery.gain.line')
        .replace('{p}', short(draw.pages ?? 0))
        .replace('{k}', short(draw.knowledge ?? 0)),
    };
  if (draw.boon) return { title: t('ui.lottery.boon'), line: `${effectText(draw.boon, draw.method)} · ${length(BOON_SECONDS)}` };
  if (draw.curse)
    return {
      title: t('ui.lottery.curse'),
      line: `${effectText(draw.curse, draw.method)} · ${length(draw.curse === 'golden' ? GOLDEN_SECONDS : CURSE_SECONDS)}`,
    };
  return { title: t('ui.lottery.nothing.title'), line: t('ui.lottery.nothing.line') };
};

/** Un tirage, pour la machine : ses rouleaux, son résultat. */
export const machineDraw = (draw: Draw): MachineDraw => ({ reels: draw.reels, result: resultOf(draw) });
