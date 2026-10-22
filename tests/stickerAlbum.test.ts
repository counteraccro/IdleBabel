import { describe, expect, it } from 'vitest';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import frCovers from '../src/i18n/fr/covers.json';
import enCovers from '../src/i18n/en/covers.json';
import { SEALS } from '../src/data/seals';
import { createInitialState } from '../src/core/state';
import { readGameSeedWith } from '../src/core/random';
import { coverDesign } from '../src/systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../src/systems/strangeBook';
import {
  ALBUM_RARES,
  ALBUM_SLOTS,
  DATES,
  RAREST,
  SENSE_TITLES,
  SENSE_WORDS,
  albumSticker,
  checkAlbumFull,
  partSlots,
  rareAt,
  scanAlbum,
} from '../src/systems/stickerAlbum';

const stateWith = (booksFinished: number, seed = 0x3f2a9c1b) => {
  const state = createInitialState('fr', 0, seed);
  state.booksFinished = booksFinished;
  readGameSeedWith(() => state.seed);
  return state;
};

describe('Album d’autocollants', () => {
  it('numérote ses cases de 1 à la dernière, sans trou', () => {
    expect(ALBUM_SLOTS.map((slot) => slot.number)).toEqual(ALBUM_SLOTS.map((_, i) => i + 1));
    expect(partSlots('rares')).toHaveLength(ALBUM_RARES.length);
    expect(ALBUM_RARES).toContain('stickerAlbum');
    expect(ALBUM_RARES).not.toContain('debug');
  });

  it('a un nom pour chaque case, en français et en anglais', () => {
    for (const texts of [fr.stickerAlbum, en.stickerAlbum]) {
      const { parts } = texts;
      expect(parts.leathers.names).toHaveLength(partSlots('leathers').length);
      expect(parts.corners.names).toHaveLength(partSlots('corners').length);
      expect(parts.ornaments.names).toHaveLength(partSlots('ornaments').length);
      expect(parts.rolls.names).toHaveLength(partSlots('rolls').length);
      expect(parts.rarest.names).toHaveLength(RAREST.length);
      expect(parts.dates.names).toHaveLength(DATES.length);
      expect(parts.modern.colors.length * parts.modern.layouts.length).toBe(partSlots('modern').length);
      expect(parts.half.kinds).toHaveLength(2);
    }
    for (const covers of [frCovers, enCovers]) {
      expect(covers.titles).toHaveLength(SENSE_TITLES);
      expect(covers.words).toHaveLength(SENSE_WORDS);
    }
    expect(Object.keys(fr.stickerAlbum).sort()).toEqual(Object.keys(en.stickerAlbum).sort());
  });

  it('remplit chaque case avec le premier livre lu qui lui correspond, et compte les doubles', () => {
    const state = stateWith(3000);
    expect(scanAlbum(state)).toBe(true);
    for (const slot of ALBUM_SLOTS.filter((s) => s.test)) {
      const { book, doubles } = albumSticker(state, slot);
      let first: number | undefined;
      let count = 0;
      for (let i = 0; i < 3000; i++) {
        if (i === STRANGE_BOOK_INDEX || !slot.test!(coverDesign(i), i)) continue;
        first ??= i;
        count++;
      }
      expect(book).toBe(first);
      expect(doubles).toBe(first === undefined ? 0 : count - 1);
    }
  });

  it('avance par petits bouts, et repart du début si le livre recule', () => {
    const state = stateWith(1000);
    expect(scanAlbum(state, 400)).toBe(false);
    expect(scanAlbum(state, 400)).toBe(false);
    expect(scanAlbum(state, 400)).toBe(true);
    const leather = partSlots('leathers')[0];
    expect(albumSticker(state, leather).book).toBeDefined();
    state.booksFinished = 0;
    scanAlbum(state);
    expect(albumSticker(state, leather).book).toBeUndefined();
  });

  it('ne compte pas un livre rare comme une couverture ordinaire ; il a son brillant', () => {
    const state = stateWith(200);
    scanAlbum(state);
    const leather = partSlots('leathers')[0];
    const book = albumSticker(state, leather).book!;
    state.rareBooks = { alice: book };
    state.booksFinished = 199;
    scanAlbum(state);
    state.booksFinished = 200;
    scanAlbum(state);
    expect(albumSticker(state, leather).book).not.toBe(book);
    expect(rareAt(state, book)).toBe('alice');
    const shiny = partSlots('rares').find((slot) => slot.rare === 'alice')!;
    expect(albumSticker(state, shiny).book).toBe(book);
  });

  it('colle les grandes dates une fois le livre lu', () => {
    const state = stateWith(100);
    const [firstBook, strange, tenth, hundredth, thousandth] = partSlots('dates');
    expect(albumSticker(state, firstBook).book).toBe(0);
    expect(albumSticker(state, strange).book).toBe(STRANGE_BOOK_INDEX);
    expect(albumSticker(state, tenth).book).toBe(9);
    expect(albumSticker(state, hundredth).book).toBe(99);
    expect(albumSticker(state, thousandth).book).toBeUndefined();
  });

  it('a son sceau, comme les autres livres rares, et un sceau secret quand il est plein', () => {
    expect(SEALS.some((seal) => seal.id === 'rare-stickerAlbum')).toBe(true);
    expect(SEALS.find((seal) => seal.id === 'stickerAlbumAll')?.plate).toBe('secrets');
  });

  it('n’appose pas son sceau secret tant qu’une case est vide', () => {
    const state = stateWith(2000);
    checkAlbumFull(state);
    expect('stickerAlbumAll' in state.seals).toBe(false);
    scanAlbum(state);
    state.rareBooks = Object.fromEntries(ALBUM_RARES.map((id, i) => [id, 3 + i]));
    checkAlbumFull(state);
    // Le millionième livre n'est pas lu : la case des grandes dates reste vide.
    expect('stickerAlbumAll' in state.seals).toBe(false);
  });
});
