import { BOON_PRICES, CARD_PRICE, HOUR_PRICE, HOUR_SECONDS, HOUR_STEP, POUCH_PRICE } from '../data/shop';
import { RARE_BOOKS } from '../data/rareBooks';
import { boonKnown, giveBoon } from './letter';
import { dayOf } from './dailyTasks';
import { knowledgePerSecond } from './tasks';
import { creditMethods, gainPages, pagesPerSecond } from './production';
import { addKnowledge, maxTurnsPerSecond } from './knowledge';
import { PAGES_PER_BOOK, PAGES_PER_LEAF } from './books';
import { isRareBookFound } from './rareBooks';
import { pouchSlots, scanAlbum, stickPouch, type PouchSticker } from './stickerAlbum';
import type { BoonId } from '../data/letter';
import type { GameState } from '../core/state';

/**
 * Le guichet (data/shop.ts, .ai/plan-taches.md « Le guichet et les tampons ») : les tampons des tâches s'y dépensent.
 * Rien n'y rend de jetons, d'Éther, ni de bonus pour toujours.
 */

/** Ce qui s'achète au guichet. */
export type ShopItem = { kind: 'boon'; id: BoonId } | { kind: 'pouch' } | { kind: 'card' } | { kind: 'hour'; of: 'reading' | 'knowledge' };

/** Les heures achetées aujourd'hui (les autres jours ne comptent plus). */
export const hoursToday = (state: GameState, now = Date.now()): number =>
  state.tasks.shop.day === dayOf(now) ? state.tasks.shop.hours : 0;

/** Le prix d'une heure : 10, puis 10 de plus à chaque heure achetée aujourd'hui. */
export const hourPrice = (state: GameState, now = Date.now()): number => HOUR_PRICE + HOUR_STEP * hoursToday(state, now);

/** Ce que rapporterait une heure de lecture (pages) ou de Connaissance, au rythme du moment. */
export const hourGain = (state: GameState, of: 'reading' | 'knowledge'): number =>
  of === 'reading' ? pagesPerSecond(state) * HOUR_SECONDS : Math.ceil(knowledgePerSecond(state) * HOUR_SECONDS);

/** L'album « Les Couvertures de Babel » a été trouvé : ses pochettes se vendent. */
export const albumFound = (state: GameState): boolean => state.rareBooks.stickerAlbum !== undefined;

/** La fiche du catalogue achetée attend encore son livre (une seule à la fois). */
export const cardWaiting = (state: GameState): boolean => {
  const card = state.tasks.shop.card;
  return card !== undefined && !isRareBookFound(state, card.id);
};

/** Les livres rares qu'une fiche peut faire paraître : ceux pas encore trouvés. */
const cardBooks = (state: GameState) => RARE_BOOKS.filter((book) => (book.weight ?? 1) > 0 && !isRareBookFound(state, book.id));

/** Les livres lus en une heure, au rythme du moment (les feuilles tournées seules, plafonnées par la Lecture rapide). */
export const booksPerHour = (state: GameState): number =>
  state.settings.autoTurn
    ? (Math.min(pagesPerSecond(state), maxTurnsPerSecond(state) * PAGES_PER_LEAF) * HOUR_SECONDS) / PAGES_PER_BOOK
    : 0;

/**
 * Une fiche du catalogue remplie : un livre rare pas encore trouvé, tiré comme ceux de la bibliothèque (même poids),
 * et le livre où il paraîtra, l'un de ceux lus dans l'heure (le suivant, au moins).
 */
const fillCard = (state: GameState, random: () => number): { id: string; index: number } => {
  const books = cardBooks(state);
  let roll = random() * books.reduce((sum, book) => sum + (book.weight ?? 1), 0);
  const id = (books.find((book) => (roll -= book.weight ?? 1) < 0) ?? books[books.length - 1]).id;
  return { id, index: state.booksFinished + 1 + Math.floor(random() * booksPerHour(state)) };
};

/** Son prix ; rien : pas au tarif, ou pas encore appris (un bonus que la lettre ne connaît pas, l'album pas trouvé). */
export const shopPrice = (state: GameState, item: ShopItem, now = Date.now()): number | undefined => {
  if (item.kind === 'hour') return hourPrice(state, now);
  if (item.kind === 'pouch') return albumFound(state) ? POUCH_PRICE : undefined;
  if (item.kind === 'card') return CARD_PRICE;
  if (!boonKnown(state, item.id)) return undefined;
  return BOON_PRICES.find(([id]) => id === item.id)?.[1];
};

/** Il peut être acheté : au tarif, assez de tampons, et il donnerait quelque chose. */
export const canBuy = (state: GameState, item: ShopItem, now = Date.now()): boolean => {
  const price = shopPrice(state, item, now);
  if (price === undefined || state.tasks.stamps.balance < price) return false;
  if (item.kind === 'hour') return hourGain(state, item.of) > 0;
  if (item.kind === 'card') return !cardWaiting(state) && cardBooks(state).length > 0;
  // Une pochette : des cases vides (tant que l'album n'a pas passé tous les livres lus en revue, on ne le sait pas encore).
  if (item.kind === 'pouch') return !scanAlbum(state, 0) || pouchSlots(state).length > 0;
  return true;
};

/**
 * Acheté : les tampons dépensés, et ce qu'il donne, tout de suite. Renvoie false s'il ne pouvait pas l'être. Une pochette
 * vient avec sa couverture (`sticker`, cherchée avant : systems/stickerAlbum.ts) ; sans elle, rien n'est payé.
 */
export const buy = (
  state: GameState,
  item: ShopItem,
  random: () => number = Math.random,
  now = Date.now(),
  sticker?: PouchSticker,
): boolean => {
  if (!canBuy(state, item, now) || (item.kind === 'pouch' && !sticker)) return false;
  const shop = state.tasks.shop;
  state.tasks.stamps.balance -= shopPrice(state, item, now)!;
  shop.purchases += 1;
  if (item.kind === 'pouch') {
    stickPouch(state, sticker!);
    return true;
  }
  if (item.kind === 'card') {
    shop.card = fillCard(state, random);
    return true;
  }
  if (item.kind === 'boon') {
    // Réservé : sa durée s'ajoute à ce qui restait du même bonus.
    giveBoon(state, item.id, random, now, true);
    return true;
  }
  if (item.of === 'reading') {
    gainPages(state, hourGain(state, 'reading'));
    creditMethods(state, HOUR_SECONDS);
  } else addKnowledge(state, hourGain(state, 'knowledge'));
  shop.hours = hoursToday(state, now) + 1;
  shop.day = dayOf(now);
  return true;
};
