import { getLocale, t } from '../../i18n';
import { currentNotation, writeDigits } from '../../core/format';
import { BOON_PRICES } from '../../data/shop';
import { boonKnown } from '../../systems/letter';
import { buy, canBuy, shopPrice, type ShopItem } from '../../systems/stampShop';
import { folio, heading, textWidth, type Item, type TextItem } from '../strangeBook/pageItems';
import { GHOST_INK, STAMP_INK } from './taskDrawing';
import { babelize, seedOf } from './babelMask';
import { pencilNumber } from './taskPages';
import type { BoonId } from '../../data/letter';
import type { GameState } from '../../core/state';

/**
 * Le guichet (maquette validée .ai/maquette-guichet.html, ses mesures reprises), en face de la carte de lecteur : un tarif
 * imprimé, celui de la Bibliothèque. Chaque ligne, son prix au bout ; trop cher, elle pâlit ; un clic l'achète. Les bonus
 * que la lettre n'a pas encore appris restent en symboles de Babel.
 */

const LEFT = 70;
const RIGHT = 580;
const TOP = 166;
const BOON_COLUMN = 250;
const BOON_ROW = 28;
const ROW = 64;

/** Une ligne d'action du guichet : « shop:boon:trance », « shop:hour:reading »… */
const actionId = (item: ShopItem): string => (item.kind === 'boon' ? `shop:boon:${item.id}` : `shop:hour:${item.of}`);

const printed = (text: string, x: number, y: number, size: number, style: Partial<TextItem> = {}): TextItem => ({
  kind: 'text',
  text,
  x,
  y,
  size,
  align: 'left',
  ...style,
});

/** Le prix imprimé, aligné à droite sur `right`, et le petit tampon dessiné devant (dans `marks`). */
const priceTag = (price: number, right: number, y: number, faded: boolean, marks: { x: number; y: number; faded: boolean }[]): Item => {
  const item = printed(writeDigits(String(price)), right, y, 22, { align: 'right', ...(faded ? { ink: 'ghost' as const } : {}) });
  marks.push({ x: right - textWidth(item) - 18, y: y + 11, faded });
  return item;
};

/** Les petits tampons devant les prix, à l'encre violette (au tarif) ou pâles (trop chers). */
const drawMarks = (context: CanvasRenderingContext2D, marks: { x: number; y: number; faded: boolean }[]): void => {
  for (const mark of marks) {
    context.save();
    context.translate(mark.x, mark.y);
    context.rotate(-0.08);
    context.strokeStyle = mark.faded ? GHOST_INK : STAMP_INK;
    context.lineWidth = 1.6;
    context.beginPath();
    context.roundRect(-8, -6, 16, 12, 2);
    context.stroke();
    context.restore();
  }
};

/** Ce qu'il reste sur la carte, au crayon, en bas de la page. */
const balanceText = (balance: number): string =>
  balance === 0
    ? t('whiteBook.tasks.shop.onCardNone')
    : balance === 1
      ? t('whiteBook.tasks.shop.onCardOne')
      : t('whiteBook.tasks.shop.onCard').replace('{n}', pencilNumber(balance, true));

/** La page du guichet (à droite, en face de la carte de lecteur). */
export const shopItems = (state: GameState, number: number): Item[] => {
  const now = Date.now();
  const balance = state.tasks.stamps.balance;
  const items: Item[] = [...heading(t('whiteBook.tasks.shop.title'))];
  const marks: { x: number; y: number; faded: boolean }[] = [];
  let y = TOP;
  // Réserver un bonus : deux colonnes, le nom en italique, son prix au bout.
  items.push(printed(t('whiteBook.tasks.shop.boon'), LEFT, y, 23));
  y += 34;
  BOON_PRICES.forEach(([id, price], index) => {
    const x = 90 + (index % 2) * BOON_COLUMN;
    const rowY = y + Math.floor(index / 2) * BOON_ROW;
    const name = t(`ui.letter.boons.${id}.name`);
    if (!boonKnown(state, id)) {
      items.push(printed(babelize(name, seedOf(`shop:${id}`)), x, rowY, 18, { italic: true, ink: 'ghost' }));
      return;
    }
    const item: ShopItem = { kind: 'boon', id };
    const faded = !canBuy(state, item, now);
    items.push(printed(name, x, rowY, 18, { italic: true, ...(faded ? { ink: 'ghost' as const } : { faded: true }) }));
    items.push(priceTag(price, x + 200, rowY - 2, faded, marks));
    items.push({ kind: 'action', id: actionId(item), x, y: rowY - 4, width: 210, height: 26 });
  });
  y += Math.ceil(BOON_PRICES.length / 2) * BOON_ROW + 16;
  // Une heure de lecture (la ligne du titre), ou de Connaissance (le début de la ligne d'en dessous).
  const reading: ShopItem = { kind: 'hour', of: 'reading' };
  const knowledge: ShopItem = { kind: 'hour', of: 'knowledge' };
  const readingFaded = !canBuy(state, reading, now);
  const knowledgeFaded = !canBuy(state, knowledge, now);
  const pale = (faded: boolean, italic = false): Partial<TextItem> =>
    faded ? { ink: 'ghost', italic } : italic ? { italic, faded: true } : {};
  items.push(printed(t('whiteBook.tasks.shop.hour'), LEFT, y, 23, pale(readingFaded)));
  const or = printed(t('whiteBook.tasks.shop.hourKnowledge'), LEFT, y + 30, 16, pale(knowledgeFaded, true));
  items.push(or);
  items.push(printed(t('whiteBook.tasks.shop.hourMore'), LEFT + textWidth(or), y + 30, 16, pale(readingFaded && knowledgeFaded, true)));
  const price = shopPrice(state, reading, now)!;
  items.push(priceTag(price, RIGHT, y, balance < price, marks));
  items.push({ kind: 'action', id: actionId(reading), x: 60, y: y - 4, width: RIGHT - 60, height: 32 });
  items.push({ kind: 'action', id: actionId(knowledge), x: 60, y: y + 28, width: textWidth(or) + 10, height: 24 });
  y += ROW;
  const key = JSON.stringify([getLocale(), currentNotation(), marks]);
  items.push({ kind: 'drawing', key, draw: (context) => drawMarks(context, marks) });
  items.push({ kind: 'text', text: balanceText(balance), x: 320, y: 684, size: 24, align: 'center', face: 'hand', faded: true });
  items.push(folio(number));
  return items;
};

/** Un clic sur une ligne du guichet : l'achat, s'il se peut. */
export const actOnShop = (state: GameState, id: string): void => {
  const [, kind, value] = id.split(':');
  if (kind === 'boon') buy(state, { kind: 'boon', id: value as BoonId });
  else if (kind === 'hour') buy(state, { kind: 'hour', of: value === 'knowledge' ? 'knowledge' : 'reading' });
};
