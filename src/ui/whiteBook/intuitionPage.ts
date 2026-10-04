import { getLocale, messages, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { BASE_FIND_CHANCE } from '../../data/knowledge';
import { technology, levelOf, nextPrice, filterMultiplier } from '../../systems/technologies';
import { babelize, seedOf } from './babelMask';
import { paragraph } from './paragraph';
import { folio, type Item } from '../strangeBook/pageItems';
import type { TechnologyId } from '../../data/technologies';
import type { GameState } from '../../core/state';

interface IntuitionTexts {
  name: string;
  description: string;
  effect: string;
  /** Une phrase du chercheur par niveau : la dernière comprise s'écrit en exergue. */
  notes: string[];
}

const texts = (id: TechnologyId): IntuitionTexts =>
  (messages().whiteBook.intuitions as unknown as Record<TechnologyId, IntuitionTexts>)[id];

const percent = (value: number): string =>
  writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 2 }).format(value));

/** Ce que l'intuition change, au niveau `level` : un nombre lisible (la chance de trouvaille pour le filtre). */
const effectAt = (state: GameState, id: TechnologyId, level: number): string => {
  switch (id) {
    case 'semanticFilter':
      return percent(Math.min(1, BASE_FIND_CHANCE * filterMultiplier(state, level)));
  }
};

/**
 * Page d'une intuition (repère de la page : 640 × 800), comme celle d'une méthode : son sceau (doré
 * dès le premier niveau compris), son nom, la dernière phrase comprise en exergue (en symboles avant), ce
 * qu'elle fait, son niveau et son effet (maintenant → au niveau suivant), puis, au crayon, de quoi
 * comprendre le niveau suivant et son prix (un clic : c'est payé ; estompé s'il manque de la Connaissance).
 */
export const intuitionItems = (state: GameState, id: TechnologyId, number: number): Item[] => {
  const text = texts(id);
  const level = levelOf(state, id);
  const max = technology(id).prices.length;
  const price = nextPrice(state, id);
  const note = level > 0 ? text.notes[level - 1] : babelize(text.notes[0], seedOf(`${id}:note`));
  const quote = paragraph(`« ${note} »`, 250, {
    left: 110,
    width: 420,
    size: 22,
    line: 32,
    align: 'center',
    italic: true,
    faded: level === 0,
  });
  const description = paragraph(text.description, quote.bottom + 34, { left: 110, width: 420, size: 20, line: 29, align: 'center' });
  const now = effectAt(state, id, level);
  const effect = price === undefined ? now : `${now}  →  ${effectAt(state, id, level + 1)}`;
  const y = Math.max(description.bottom + 50, 470);
  const affordable = price !== undefined && state.knowledge >= price;
  const offer =
    price === undefined
      ? t('whiteBook.intuition.done')
      : t(affordable ? 'whiteBook.intuition.offer' : 'whiteBook.intuition.short').replace('{n}', formatNumber(price, getLocale()));
  return [
    {
      kind: 'seal',
      id: `intuition:${id}`,
      series: `intuition:${id}`,
      tier: 0,
      look: level > 0 ? 'gold' : 'embossed',
      x: 320,
      y: 108,
      size: 112,
    },
    { kind: 'text', text: text.name, x: 320, y: 182, size: 22, align: 'center', caps: true, spacing: 3 },
    { kind: 'rule', y: 222, width: 180 },
    ...quote.items,
    ...description.items,
    {
      kind: 'text',
      text: t('whiteBook.intuition.level')
        .replace('{n}', writeDigits(String(level)))
        .replace('{max}', writeDigits(String(max))),
      x: 320,
      y,
      size: 22,
      align: 'center',
      spacing: 3,
      face: 'title',
    },
    { kind: 'text', text: text.effect, x: 320, y: y + 44, size: 18, align: 'center', italic: true, faded: true, spacing: 2 },
    { kind: 'text', text: effect, x: 320, y: y + 74, size: 28, align: 'center', spacing: 2, face: 'title' },
    { kind: 'text', text: offer, x: 320, y: 640, size: 30, align: 'center', face: 'hand', faded: !affordable, steady: true },
    ...(affordable ? [{ kind: 'action', id: 'pay', y: 632, height: 44 } satisfies Item] : []),
    folio(number),
  ];
};
