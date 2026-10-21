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

const heightOf = (entries: readonly ContentsEntry[]): number => entries.reduce((sum, entry) => sum + (entry.sub ? SUB_STEP : STEP), 0);

/** Le sommaire tient sur une page sans se tasser. */
export const contentsFit = (entries: readonly ContentsEntry[]): boolean => heightOf(entries) <= BOTTOM - TOP;

/**
 * Le sommaire sur deux pages, face à face (demande de l'auteur, 17/10 : il était « trop tassé ») : la première se remplit
 * sans se tasser, la suite va en face ; une partie garde ses sous-parties avec elle (la coupe tombe avant une partie).
 */
export const splitContents = (entries: readonly ContentsEntry[]): [ContentsEntry[], ContentsEntry[]] => {
  let cut = 0;
  for (let index = 1; index <= entries.length; index++) {
    if (heightOf(entries.slice(0, index)) > BOTTOM - TOP) break;
    if (index === entries.length || !entries[index].sub) cut = index;
  }
  // Une seule partie trop longue pour une page : coupée là où la page est pleine.
  if (cut === 0) while (cut < entries.length && heightOf(entries.slice(0, cut + 1)) <= BOTTOM - TOP) cut++;
  return [entries.slice(0, cut), entries.slice(cut)];
};

/** Sommaire du livre blanc (ou une de ses deux pages) : chaque partie et son numéro de page, un clic mène à sa page. */
export const contentsItems = (state: GameState, entries: ContentsEntry[], number: number): Item[] => {
  const squeeze = Math.min(1, (BOTTOM - TOP) / Math.max(1, heightOf(entries)));
  let y = TOP;
  return [
    // Sur deux pages, chacune a son titre, comme le sommaire du Grand Livre.
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
