import { getLocale, t } from '../../i18n';
import { currentNotation, writeDigits } from '../../core/format';
import { BOON_PRICES } from '../../data/shop';
import { boonKnown } from '../../systems/letter';
import { buy, canBuy, cardWaiting, shopPrice, type ShopItem } from '../../systems/stampShop';
import { folio, heading, textWidth, type Item, type TextItem } from '../strangeBook/pageItems';
import { GHOST_INK, STAMP_INK } from './taskDrawing';
import { babelize, seedOf } from './babelMask';
import { pencilNumber } from './taskPages';
import { scanInBackground } from '../rareBooks/stickerAlbum/albumScan';
import { idle } from '../rareBooks/slowDrawing';
import { POUCH_LOOKAHEAD, POUCH_STEP, findPouchSticker, pouchSlots, type PouchSticker } from '../../systems/stickerAlbum';
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
const actionId = (item: ShopItem): string =>
  item.kind === 'boon' ? `shop:boon:${item.id}` : item.kind === 'hour' ? `shop:hour:${item.of}` : `shop:${item.kind}`;

/**
 * La dernière pochette achetée, notée au crayon sous sa ligne : en train de s'ouvrir (l'album passe les livres lus en
 * revue, puis cherche sa couverture), puis le numéro de la case remplie (rien : plus rien à coller, elle n'est pas payée).
 */
let pouchNote: 'opening' | 'none' | number | undefined;

const pouchText = (note: 'none' | number): string =>
  note === 'none' ? t('whiteBook.tasks.shop.pouchNone') : t('whiteBook.tasks.shop.pouchGiven').replace('{n}', pencilNumber(note));

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
  // Une pochette d'autocollants : en lettres de Babel tant que l'album n'a pas été trouvé.
  const pouch: ShopItem = { kind: 'pouch' };
  const pouchPrice = shopPrice(state, pouch, now);
  const pouchName = t('whiteBook.tasks.shop.pouch');
  const pouchDetail = t('whiteBook.tasks.shop.pouchDetail');
  if (pouchPrice === undefined) {
    items.push(printed(babelize(pouchName, seedOf('shop:pouch')), LEFT, y, 23, { ink: 'ghost' }));
    items.push(printed(babelize(pouchDetail, seedOf('shop:pouchDetail')), LEFT, y + 30, 16, { italic: true, ink: 'ghost' }));
  } else {
    const faded = !canBuy(state, pouch, now) || pouchNote === 'opening';
    items.push(printed(pouchName, LEFT, y, 23, faded ? { ink: 'ghost' } : {}));
    if (pouchNote === undefined)
      items.push(printed(pouchDetail, LEFT, y + 30, 16, { italic: true, ...(faded ? { ink: 'ghost' as const } : { faded: true }) }));
    else {
      const note = pouchNote === 'opening' ? '…' : pouchText(pouchNote);
      items.push(printed(note, LEFT, y + 26, 22, { face: 'hand' }));
    }
    items.push(priceTag(pouchPrice, RIGHT, y, state.tasks.stamps.balance < pouchPrice, marks));
    items.push({ kind: 'action', id: actionId(pouch), x: 60, y: y - 4, width: RIGHT - 60, height: 58 });
  }
  y += ROW;
  // Une fiche du catalogue : une à la fois ; tant que son livre rare n'a pas paru, une note au crayon à la place du détail.
  const card: ShopItem = { kind: 'card' };
  const cardPrice = shopPrice(state, card, now)!;
  const waiting = cardWaiting(state);
  const cardFaded = !canBuy(state, card, now);
  items.push(printed(t('whiteBook.tasks.shop.card'), LEFT, y, 23, cardFaded ? { ink: 'ghost' } : {}));
  if (waiting) items.push(printed(t('whiteBook.tasks.shop.cardWaiting'), LEFT, y + 26, 22, { face: 'hand' }));
  else
    items.push(
      printed(t('whiteBook.tasks.shop.cardDetail'), LEFT, y + 30, 16, {
        italic: true,
        ...(cardFaded ? { ink: 'ghost' as const } : { faded: true }),
      }),
    );
  items.push(priceTag(cardPrice, RIGHT, y, balance < cardPrice, marks));
  items.push({ kind: 'action', id: actionId(card), x: 60, y: y - 4, width: RIGHT - 60, height: 58 });
  y += ROW;
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

/**
 * Une pochette achetée : l'album passe d'abord tous les livres lus en revue, puis elle cherche sa couverture dans les
 * livres pas encore lus ; par petits bouts, dans les moments libres. Payée seulement si elle en trouve une.
 */
const openPouchLater = async (state: GameState): Promise<void> => {
  if (pouchNote === 'opening' || !canBuy(state, { kind: 'pouch' })) return;
  pouchNote = 'opening';
  await scanInBackground(state);
  const from = state.booksFinished;
  let sticker: PouchSticker | undefined;
  for (let start = from; !sticker && start < from + POUCH_LOOKAHEAD && pouchSlots(state).length > 0; start += POUCH_STEP) {
    sticker = findPouchSticker(state, start, start + POUCH_STEP);
    if (!sticker) await idle();
  }
  pouchNote = sticker && buy(state, { kind: 'pouch' }, Math.random, Date.now(), sticker) ? sticker.slot.number : 'none';
};

/** Un clic sur une ligne du guichet : l'achat, s'il se peut. */
export const actOnShop = (state: GameState, id: string): void => {
  const [, kind, value] = id.split(':');
  if (kind !== 'pouch') pouchNote = undefined;
  if (kind === 'boon') buy(state, { kind: 'boon', id: value as BoonId });
  else if (kind === 'pouch') void openPouchLater(state);
  else if (kind === 'card') buy(state, { kind: 'card' });
  else if (kind === 'hour') buy(state, { kind: 'hour', of: value === 'knowledge' ? 'knowledge' : 'reading' });
};
