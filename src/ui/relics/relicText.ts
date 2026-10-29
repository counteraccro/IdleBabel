import { getLocale, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { relicBonus } from '../../systems/relics';
import type { RelicId } from '../../data/relics';
import type { GameState } from '../../core/state';

/** Le nom d'une relique (« La Loupe »). */
export const relicName = (id: RelicId): string => t(`ui.relics.names.${id}`);

/** Ce qu'elle donne, au niveau de ses étoiles : « Connaissance ×1,5 à chaque trouvaille », « lettre +40 % ». */
export const relicBonusText = (state: GameState, id: RelicId): string => {
  const value = relicBonus(state, id);
  // ×1,75 : deux décimales (formatNumber arrondit à une).
  if (id === 'loupe')
    return writeDigits(
      t('ui.relics.bonus.loupe').replace('{n}', new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value)),
    );
  // Le Jeton : des jetons, pas un pourcentage.
  if (id === 'token') return writeDigits(t('ui.relics.bonus.token').replace('{n}', String(value)));
  return writeDigits(t(`ui.relics.bonus.${id}`).replace('{n}', formatNumber(Math.round(value * 100), getLocale())));
};

/** Un temps d'attente lisible : « 11 h 42 », « 8 min ». */
export const waitText = (ms: number): string => {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return writeDigits(hours ? `${hours} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min`);
};
