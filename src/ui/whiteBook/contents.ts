import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { folio, heading, type Item } from '../strangeBook/pageItems';
import type { GameState } from '../../core/state';

/** Une ligne du sommaire : une partie (méthodes, souvenirs, anomalies) ou, en retrait, une famille d'anomalies. */
export interface ContentsEntry {
  title: (state: GameState) => string;
  page: number;
  sub?: boolean;
}

const TOP = 180;
const STEP = 56;
const SUB_STEP = 40;
/** Bas du sommaire, au-dessus du numéro de page : au-delà, les lignes se resserrent. */
const BOTTOM = 700;

/** Sommaire du livre blanc : chaque partie et son numéro de page, un clic mène à sa page. */
export const contentsItems = (state: GameState, entries: ContentsEntry[], number: number): Item[] => {
  const height = entries.reduce((sum, entry) => sum + (entry.sub ? SUB_STEP : STEP), 0);
  const squeeze = Math.min(1, (BOTTOM - TOP) / height);
  let y = TOP;
  return [
    ...heading(t('whiteBook.contents')),
    ...entries.flatMap((entry): Item[] => {
      const size = entry.sub ? 20 : 26;
      const step = (entry.sub ? SUB_STEP : STEP) * squeeze;
      const top = y;
      y += step;
      return [
        { kind: 'text', text: entry.title(state), x: entry.sub ? 130 : 90, y: top, size, align: 'left', spacing: 2, faded: entry.sub },
        { kind: 'dots', x1: 400, x2: 520, y: top + size * 0.75 },
        { kind: 'text', text: writeDigits(String(entry.page)), x: 550, y: top, size, align: 'right', faded: entry.sub },
        { kind: 'link', y: top - 10, height: step - 4, target: entry.page },
      ];
    }),
    folio(number),
  ];
};
