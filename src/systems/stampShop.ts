import { BOON_PRICES, HOUR_PRICE, HOUR_SECONDS, HOUR_STEP, POUCH_PRICE } from '../data/shop';
import { boonKnown, giveBoon } from './letter';
import { dayOf } from './dailyTasks';
import { knowledgePerSecond } from './tasks';
import { creditMethods, gainPages, pagesPerSecond } from './production';
import { addKnowledge } from './knowledge';
import { pouchSlots, scanAlbum, stickPouch, type PouchSticker } from './stickerAlbum';
import type { BoonId } from '../data/letter';
import type { GameState } from '../core/state';

/**
 * Le guichet (data/shop.ts, .ai/plan-taches.md « Le guichet et les tampons ») : les tampons des tâches s'y dépensent.
 * Rien n'y rend de jetons, d'Éther, ni de bonus pour toujours.
 */

/** Ce qui s'achète au guichet. */
export type ShopItem = { kind: 'boon'; id: BoonId } | { kind: 'pouch' } | { kind: 'hour'; of: 'reading' | 'knowledge' };

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

/** Son prix ; rien : pas au tarif, ou pas encore appris (un bonus que la lettre ne connaît pas, l'album pas trouvé). */
export const shopPrice = (state: GameState, item: ShopItem, now = Date.now()): number | undefined => {
  if (item.kind === 'hour') return hourPrice(state, now);
  if (item.kind === 'pouch') return albumFound(state) ? POUCH_PRICE : undefined;
  if (!boonKnown(state, item.id)) return undefined;
  return BOON_PRICES.find(([id]) => id === item.id)?.[1];
};

/** Il peut être acheté : au tarif, assez de tampons, et il donnerait quelque chose. */
export const canBuy = (state: GameState, item: ShopItem, now = Date.now()): boolean => {
  const price = shopPrice(state, item, now);
  if (price === undefined || state.tasks.stamps.balance < price) return false;
  if (item.kind === 'hour') return hourGain(state, item.of) > 0;
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
