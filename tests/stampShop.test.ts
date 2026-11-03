import { afterEach, describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from '../src/core/state';
import { BOON } from '../src/data/letter';
import { activeBoons, boonOn, forgetBoons } from '../src/systems/boons';
import { booksPerHour, buy, canBuy, cardWaiting, hourPrice, hoursToday, shopPrice } from '../src/systems/stampShop';
import { rareBookAt, takeBook } from '../src/systems/rareBooks';
import { RARE_BOOKS } from '../src/data/rareBooks';
import { findRelic, relicCanBePut, relicWorn, secondRelic, setSecondRelic } from '../src/systems/relics';
import { pagesPerSecond } from '../src/systems/production';
import { albumSticker, pouchSlots, scanAlbum, searchPouchSticker } from '../src/systems/stickerAlbum';
import { coverDesign } from '../src/systems/coverDesign';

/** Une partie qui lit seule (une Lecture Diagonale), `balance` tampons sur la carte, les étoiles `stars` allumées. */
const game = (balance: number, ...stars: string[]): GameState => {
  const state = createInitialState('fr', 0, 1);
  state.etherium = stars;
  state.tools.diagonal = 1;
  state.tasks.stamps.balance = balance;
  return state;
};

const NOON = new Date(2026, 10, 2, 12).getTime();
const NEXT_DAY = new Date(2026, 10, 3, 9).getTime();

afterEach(() => forgetBoons());

describe('le guichet', () => {
  it('réserve un bonus appris : les tampons dépensés, le bonus lancé ; sa durée s’ajoute à ce qui restait', () => {
    const state = game(100);
    expect(buy(state, { kind: 'boon', id: 'trance' }, Math.random, NOON)).toBe(true);
    expect(state.tasks.stamps.balance).toBe(70);
    expect(boonOn('trance', NOON + 1000)).toBe(true);
    buy(state, { kind: 'boon', id: 'trance' }, Math.random, NOON);
    expect(activeBoons(NOON)[0].left).toBe(60_000);
    expect(state.tasks.shop.purchases).toBe(2);
  });

  it('ne vend pas un bonus que la lettre ne connaît pas, ni Quatre cent dix', () => {
    const state = game(100);
    expect(shopPrice(state, { kind: 'boon', id: 'eye' })).toBeUndefined();
    expect(buy(state, { kind: 'boon', id: 'eye' })).toBe(false);
    expect(shopPrice(game(100, 'quill.r1'), { kind: 'boon', id: 'eye' })).toBe(15);
    expect(shopPrice(state, { kind: 'boon', id: 'fourTen' })).toBeUndefined();
    expect(state.tasks.stamps.balance).toBe(100);
  });

  it('l’Éclair donne ses dix minutes de lecture d’un coup', () => {
    const state = game(100, 'quill.r5');
    const pages = state.pages;
    buy(state, { kind: 'boon', id: 'flash' }, Math.random, NOON);
    expect(state.pages - pages).toBeCloseTo(pagesPerSecond(state) * BOON.flash);
  });

  it('pas assez de tampons : rien', () => {
    const state = game(29);
    expect(canBuy(state, { kind: 'boon', id: 'trance' })).toBe(false);
    expect(buy(state, { kind: 'boon', id: 'trance' })).toBe(false);
    expect(state.tasks.stamps.balance).toBe(29);
  });

  it('une heure de lecture : une heure de pages ; 10, puis 10 de plus à chaque heure, remis à 10 le lendemain', () => {
    const state = game(100);
    const pages = state.pages;
    expect(hourPrice(state, NOON)).toBe(10);
    buy(state, { kind: 'hour', of: 'reading' }, Math.random, NOON);
    expect(state.pages - pages).toBeCloseTo(pagesPerSecond(state) * 3600);
    buy(state, { kind: 'hour', of: 'knowledge' }, Math.random, NOON);
    expect(state.tasks.stamps.balance).toBe(70);
    expect(hoursToday(state, NOON)).toBe(2);
    expect(hourPrice(state, NOON)).toBe(30);
    expect(hourPrice(state, NEXT_DAY)).toBe(10);
    buy(state, { kind: 'hour', of: 'reading' }, Math.random, NEXT_DAY);
    expect(hoursToday(state, NEXT_DAY)).toBe(1);
  });

  it('une heure de Connaissance au rythme du moment ; pages qui ne tournent pas seules : rien à vendre', () => {
    const state = game(100);
    const knowledge = state.knowledge;
    buy(state, { kind: 'hour', of: 'knowledge' }, Math.random, NOON);
    expect(state.knowledge).toBeGreaterThan(knowledge);
    state.settings.autoTurn = false;
    expect(canBuy(state, { kind: 'hour', of: 'knowledge' }, NOON)).toBe(false);
  });

  it('le secret : une cinquième heure le même jour, à 50 tampons ; quatre ne suffisent pas', () => {
    const state = game(500);
    for (let hour = 0; hour < 4; hour += 1) buy(state, { kind: 'hour', of: 'reading' }, Math.random, NOON);
    expect('fifthHour' in state.seals).toBe(false);
    expect(hourPrice(state, NOON)).toBe(50);
    buy(state, { kind: 'hour', of: 'knowledge' }, Math.random, NOON);
    expect('fifthHour' in state.seals).toBe(true);
  });
});

describe('la pochette d’autocollants', () => {
  /** Une partie de `books` livres lus, l'album trouvé, tous les livres passés en revue. */
  const reader = (books: number, balance = 100): GameState => {
    const state = game(balance);
    state.booksFinished = books;
    state.rareBooks.stickerAlbum = 0;
    scanAlbum(state);
    return state;
  };

  it('ne se vend pas tant que l’album n’a pas été trouvé ; 50 tampons sinon', () => {
    expect(shopPrice(game(100), { kind: 'pouch' })).toBeUndefined();
    expect(shopPrice(reader(10), { kind: 'pouch' })).toBe(50);
  });

  it('colle la couverture du premier livre pas encore lu qui remplit une case vide', () => {
    const state = reader(50);
    const empty = pouchSlots(state).length;
    const sticker = searchPouchSticker(state)!;
    expect(sticker.book).toBeGreaterThanOrEqual(50);
    expect(sticker.slot.test!(coverDesign(sticker.book), sticker.book)).toBe(true);
    for (let book = 50; book < sticker.book; book++)
      expect(pouchSlots(state).some((slot) => slot.test!(coverDesign(book), book))).toBe(false);
    expect(buy(state, { kind: 'pouch' }, Math.random, NOON, sticker)).toBe(true);
    expect(state.tasks.stamps.balance).toBe(50);
    expect(state.stickers).toEqual({ [sticker.slot.number]: sticker.book });
    expect(albumSticker(state, sticker.slot).book).toBe(sticker.book);
    expect(pouchSlots(state)).toHaveLength(empty - 1);
  });

  it('cherche aussi les introuvables, une fois les couvertures ordinaires toutes trouvées', () => {
    const state = reader(50);
    for (const slot of pouchSlots(state)) if (slot.part !== 'rarest') state.stickers[slot.number] = 0;
    const sticker = searchPouchSticker(state)!;
    expect(sticker.slot.part).toBe('rarest');
    expect(sticker.slot.test!(coverDesign(sticker.book), sticker.book)).toBe(true);
  });

  it('le livre lu plus tard garde sa case, sans double', () => {
    const state = reader(50);
    const sticker = searchPouchSticker(state)!;
    buy(state, { kind: 'pouch' }, Math.random, NOON, sticker);
    state.booksFinished = sticker.book + 1;
    scanAlbum(state);
    expect(albumSticker(state, sticker.slot)).toEqual({ book: sticker.book, doubles: 0 });
  });

  it('sans couverture trouvée, ou plus rien à coller : rien n’est payé', () => {
    const state = reader(50);
    expect(buy(state, { kind: 'pouch' })).toBe(false);
    for (const slot of pouchSlots(state)) state.stickers[slot.number] = 0;
    expect(canBuy(state, { kind: 'pouch' })).toBe(false);
    expect(searchPouchSticker(state)).toBeUndefined();
    expect(state.tasks.stamps.balance).toBe(100);
  });
});

describe('la fiche du catalogue', () => {
  it('50 tampons : un livre rare pas encore trouvé, au livre suivant ou à l’un de ceux lus dans l’heure', () => {
    const state = game(100);
    state.booksFinished = 500;
    expect(shopPrice(state, { kind: 'card' })).toBe(50);
    expect(buy(state, { kind: 'card' }, () => 0.999, NOON)).toBe(true);
    expect(state.tasks.stamps.balance).toBe(50);
    const card = state.tasks.shop.card!;
    expect(card.index).toBeGreaterThan(500);
    expect(card.index).toBeLessThanOrEqual(501 + booksPerHour(state));
    expect(rareBookAt(state, card.index)).toBe(card.id);
  });

  it('une à la fois : la suivante quand son livre a paru ; il n’est tiré à aucun autre livre', () => {
    const state = game(200);
    buy(state, { kind: 'card' }, () => 0, NOON);
    const card = state.tasks.shop.card!;
    expect(cardWaiting(state)).toBe(true);
    expect(canBuy(state, { kind: 'card' })).toBe(false);
    for (let index = 0; index < 20_000; index++) if (index !== card.index) expect(rareBookAt(state, index)).not.toBe(card.id);
    expect(takeBook(state, card.index)).toBe(card.id);
    expect(cardWaiting(state)).toBe(false);
    expect(canBuy(state, { kind: 'card' })).toBe(true);
  });

  it('plus de livre rare à trouver : plus de fiche', () => {
    const state = game(100);
    for (const book of RARE_BOOKS) state.rareBooks[book.id] = 0;
    expect(canBuy(state, { kind: 'card' })).toBe(false);
  });
});

describe('le double crochet', () => {
  /** Une partie avec la Loupe (qui agit, le délai en cours) et le Sablier trouvés, `balance` tampons. */
  const twoRelics = (balance = 100) => {
    const state = game(balance);
    findRelic(state, 'loupe', NOON);
    findRelic(state, 'hourglass', NOON);
    state.relics.lockedUntil = NOON + 10 * 3_600_000;
    return state;
  };

  it('40 tampons, deux reliques trouvées au moins, pas déjà en cours', () => {
    const one = game(100);
    findRelic(one, 'loupe', NOON);
    expect(canBuy(one, { kind: 'hook' }, NOON)).toBe(false);
    const state = twoRelics();
    expect(shopPrice(state, { kind: 'hook' })).toBe(40);
    expect(buy(state, { kind: 'hook' }, Math.random, NOON)).toBe(true);
    expect(state.tasks.stamps.balance).toBe(60);
    expect(canBuy(state, { kind: 'hook' }, NOON + 1000)).toBe(false);
    expect(canBuy(state, { kind: 'hook' }, NOON + 25 * 3_600_000)).toBe(true);
  });

  it('pendant 24 h, une seconde relique se pose sans délai et agit avec la première ; puis elle s’arrête', () => {
    const state = twoRelics();
    expect(relicCanBePut(state, 'hourglass', NOON)).toBe(false);
    buy(state, { kind: 'hook' }, Math.random, NOON);
    expect(relicCanBePut(state, 'hourglass', NOON)).toBe(true);
    expect(setSecondRelic(state, 'loupe', NOON)).toBe(false);
    expect(setSecondRelic(state, 'hourglass', NOON)).toBe(true);
    expect(secondRelic(state, NOON)).toBe('hourglass');
    expect(relicWorn(state, 'loupe', NOON) && relicWorn(state, 'hourglass', NOON)).toBe(true);
    // Le délai de la première n'a pas bougé.
    expect(state.relics.lockedUntil).toBe(NOON + 10 * 3_600_000);
    const after = NOON + 24 * 3_600_000 + 1;
    expect(relicWorn(state, 'hourglass', after)).toBe(false);
    expect(secondRelic(state, after)).toBeNull();
  });
});
