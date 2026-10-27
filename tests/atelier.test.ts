import { describe, expect, it, vi } from 'vitest';

// L'atelier n'existe qu'en mode débogage (data/atelierOn.ts) : l'adresse ?debug, avant d'importer le jeu.
vi.hoisted(() => {
  (globalThis as { location?: unknown }).location = { search: '?debug' };
});

import { createInitialState, type Curiosity, type GameState } from '../src/core/state';
import { ATELIER_ON } from '../src/data/atelierOn';
import { ETHERIUM_PAGES, OPEN_STARS } from '../src/data/etheriumStars';
import { CART_PLACES, MOUNT_MINUTES, PARTS, RANK_COST, RANK_PAGES, SET_PAGES } from '../src/data/curiosities';
import { lightStar, pageOpen, starOpen } from '../src/systems/etherium';
import {
  arriveCuriosity,
  atelierOpen,
  bookState,
  destroyCuriosity,
  hasSPiece,
  lecternClash,
  rankUp,
  tickArrivals,
  toLectern,
  toggleLock,
} from '../src/systems/curiosities';
import { mountPiece, mountSet, restoreNotebookPiece, tickPresses } from '../src/systems/curiosityPresses';
import { autoPulp, pulpPercent, pulpState } from '../src/systems/curiosityPulp';
import { curiosityEffects, curiosityPrice, curiosityReading, lecternNet } from '../src/systems/curiosityEffects';
import { pagesPerSecond } from '../src/systems/production';
import { prestige, prestigeEther, prestigeGain } from '../src/systems/prestige';
import { checkSeals } from '../src/systems/seals';
import { etherPages } from '../src/systems/prestige';

vi.stubGlobal('window', new EventTarget());

/** Un hasard qui rend toujours la même valeur (0,99 : rien ne s'abîme, une pièce ordinaire sur deux reste). */
const always = (value: number) => () => value;
const MINUTE = 60_000;

/** Une partie où le Sud est allumé (l'atelier ouvert). */
const opened = (): GameState => {
  const state = createInitialState('fr');
  state.etherium = ['explore.s'];
  return state;
};

/** Une curiosité posée à la main : rang, famille, état de ses quatre pièces. */
const put = (
  state: GameState,
  rank: number,
  family: Curiosity['family'],
  pieceState = 2,
  where: Curiosity['where'] = 'cart',
): Curiosity => {
  const book = arriveCuriosity(state, always(0.99));
  Object.assign(book, { rank, family, where, slot: where === 'cart' ? book.slot : 0 });
  for (const part of PARTS) book.parts[part] = { state: pieceState, hue: 0, seed: 1 };
  return book;
};

describe('L’atelier (mode débogage)', () => {
  it('le Sud de la Rose coûte 10 Éther et ouvre la page « L’atelier » ; la troisième presse attend un livre S', () => {
    expect(ATELIER_ON).toBe(true);
    expect(ETHERIUM_PAGES).toContain('atelier');
    const state = createInitialState('fr');
    expect(atelierOpen(state)).toBe(false);
    expect(pageOpen(state, 'atelier')).toBe(false);
    state.ether = 10;
    Object.assign(state, { etheriumInHand: true });
    expect(lightStar(state, 'explore.s')).toBe(true);
    expect(state.ether).toBe(0);
    expect(atelierOpen(state)).toBe(true);
    expect(pageOpen(state, 'atelier')).toBe(true);
    expect(starOpen(state, 'atelier.f1')).toBe(true);
    expect(starOpen(state, 'atelier.f2')).toBe(false);
    expect(starOpen(state, 'atelier.p3')).toBe(false);
    state.atelier.sBooks.push(0);
    expect(starOpen(state, 'atelier.p3')).toBe(true);
    expect(OPEN_STARS.some((star) => star.id === 'atelier.p3')).toBe(true);
  });

  it('une curiosité arrive au plus une fois par heure de jeu, au livre lu suivant', () => {
    const state = opened();
    tickArrivals(state, 3599, always(0.5));
    expect(state.atelier.books).toHaveLength(0);
    tickArrivals(state, 1, always(0.5));
    // L'heure est là : elle attend le prochain livre lu.
    expect(state.atelier.books).toHaveLength(0);
    state.booksFinished += 1;
    tickArrivals(state, 0.1, always(0.5));
    expect(state.atelier.books).toHaveLength(1);
    expect(state.atelier.found).toBe(1);
    expect(state.atelier.news).toBe(true);
    // Fermé (sans le Sud) : rien n'arrive.
    const closed = createInitialState('fr');
    closed.booksFinished = 10;
    tickArrivals(closed, 7200, always(0.5));
    expect(closed.atelier.books).toHaveLength(0);
  });

  it('une pièce S : couchée sur le chariot, sans y prendre de place ; jamais au rebut', () => {
    const state = opened();
    state.atelier.scrap = { rank: 5, state: 3 };
    const book = arriveCuriosity(state, always(0.5), true);
    expect(hasSPiece(book)).toBe(true);
    expect(book.where).toBe('top');
    expect(state.atelier.books).toContain(book);
  });

  it('la règle du rebut, puis le chariot plein : le moins bon part en matière, pas un livre au cadenas', () => {
    const state = opened();
    state.atelier.scrap = { rank: 0, state: 3 };
    // 0,2 : rang F, médiocre, sans pièce S.
    const scrapped = arriveCuriosity(state, always(0.2));
    expect(scrapped.rank).toBe(0);
    expect(state.atelier.books).not.toContain(scrapped);
    expect(state.atelier.reserve).toBe(RANK_PAGES[0]);
    state.atelier.scrap = { rank: -1, state: 0 };
    const books = Array.from({ length: CART_PLACES }, (_, i) => put(state, i < 9 ? 3 : 1, 'pages'));
    toggleLock(state, books[9]);
    const before = state.atelier.reserve;
    const worst = put(state, 3, 'click');
    // Le chariot était plein : un des rangs C (le moins bon sans cadenas) est parti.
    expect(state.atelier.books.filter((book) => book.where === 'cart')).toHaveLength(CART_PLACES);
    expect(state.atelier.books).toContain(books[9]);
    expect(state.atelier.reserve).toBeGreaterThan(before);
    expect(state.atelier.books).toContain(worst);
  });

  it('détruire : des pages de réemploi selon le rang, les pièces aux tiroirs (une sur deux en miettes), la pièce S au carnet', () => {
    const state = opened();
    const book = put(state, 2, 'pages', 2);
    book.parts.spine = { state: 1, hue: 0, seed: 1, set: 3 };
    // 0,3 : rien ne s'abîme (≥ 1/4), une pièce ordinaire sur deux reste (< 1/2).
    destroyCuriosity(state, book, always(0.3));
    expect(state.atelier.reserve).toBe(RANK_PAGES[2]);
    expect(state.atelier.drawers.back[2] + state.atelier.drawers.front[2] + state.atelier.drawers.endpaper[2]).toBe(3);
    expect(state.atelier.notebook[3].spine?.state).toBe(1);
    expect(state.atelier.sPieces).toEqual(['3:spine']);
    expect(state.atelier.destroyed).toBe(1);
    // Au lutrin, on ne détruit pas.
    const kept = put(state, 1, 'click', 2, 'lectern');
    expect(destroyCuriosity(state, kept, always(0.3))).toBeNull();
  });

  it('monter de rang : les pages, le malus à B (montré avant), le 2e bonus à A', () => {
    const state = opened();
    const book = put(state, 3, 'pages');
    book.nextMalus = 'click';
    state.atelier.reserve = RANK_COST[3] + RANK_COST[4];
    expect(rankUp(state, book, always(0.5))).toBe(true);
    expect(book.malus).toBe('click');
    expect(book.nextSecond).toBeDefined();
    const second = book.nextSecond;
    expect(rankUp(state, book, always(0.5))).toBe(true);
    expect(book.rank).toBe(5);
    expect(book.second).toBe(second);
    expect(state.atelier.reserve).toBe(0);
    // A : le dernier pas se fait avec un set de pièces S.
    expect(rankUp(state, book, always(0.5))).toBe(false);
    const { bonus, malus } = curiosityEffects(book);
    expect(bonus.map((effect) => effect.family)).toEqual(['pages', second]);
    expect(malus).toEqual([{ family: 'click', value: 8 }]);
  });

  it('au lutrin : il agit (l’état compté), deux de la même famille se gênent', () => {
    const state = opened();
    const base = pagesPerSecond({ ...state, tools: { ...state.tools, diagonal: 10 } });
    const book = put(state, 4, 'pages', 3);
    book.malus = 'price';
    expect(toLectern(state, book)).toBe(true);
    // B neuf : +13 % × 1,3 ; le malus du prix : +5 %.
    expect(lecternNet(state, 'pages')).toBeCloseTo(13 * 1.3);
    expect(curiosityReading(state)).toBeCloseTo(1 + 0.169);
    expect(curiosityPrice(state)).toBeCloseTo(1.05);
    expect(pagesPerSecond({ ...state, tools: { ...state.tools, diagonal: 10 } })).toBeCloseTo(base * 1.169);
    const other = put(state, 1, 'pages');
    expect(lecternClash(state, other)).toBe(book);
    expect(toLectern(state, other)).toBe(false);
    // Hors du Sud (l'atelier fermé), le lutrin ne fait plus rien.
    state.etherium = [];
    expect(curiosityReading(state)).toBe(1);
  });

  it('les presses : une pièce du tiroir remontée, finie en temps réel ; l’ancienne au tiroir', () => {
    const state = opened();
    const book = put(state, 1, 'click', 0);
    state.atelier.drawers.front[3] = 1;
    expect(mountPiece(state, book, 'front', 3, always(0.99), 0)).toBe(true);
    expect(state.atelier.drawers.front[3]).toBe(0);
    expect(mountPiece(state, book, 'front', 3, always(0.99), 0)).toBe(false);
    tickPresses(state, always(0.99), MOUNT_MINUTES[3] * MINUTE - 1);
    expect(book.parts.front.state).toBe(0);
    tickPresses(state, always(0.99), MOUNT_MINUTES[3] * MINUTE);
    expect(book.parts.front.state).toBe(3);
    expect(state.atelier.mounted).toBe(1);
    // L'ancienne, médiocre : au tiroir (0,99 : intacte, pas en miettes).
    expect(state.atelier.drawers.front[0]).toBe(0);
    expect(bookState(book)).toBe(0);
  });

  it('un set complet au carnet, restauré puis monté sur un livre A : il devient ce livre S ; le détruire, un sceau secret', () => {
    const state = opened();
    for (const part of PARTS) state.atelier.notebook[1][part] = { state: 1, hue: 30, seed: 2, set: 1 };
    state.atelier.drawers.back = [2, 0, 0, 0];
    state.atelier.reserve = 16;
    expect(restoreNotebookPiece(state, 1, 'back', 0)).toBe(true);
    expect(state.atelier.drawers.back).toEqual([0, 0, 0, 0]);
    expect(state.atelier.reserve).toBe(0);
    tickPresses(state, always(0.99), 10 * 60 * MINUTE);
    expect(state.atelier.notebook[1].back?.state).toBe(2);
    const book = put(state, 5, 'knowledge');
    state.atelier.reserve = SET_PAGES;
    expect(mountSet(state, book, 1, always(0.99))).toBe(true);
    expect(book.rank).toBe(6);
    expect(book.set).toBe(1);
    expect(state.atelier.sBooks).toEqual([1]);
    expect(curiosityEffects(book).bonus.map((effect) => effect.family)).toEqual(['pages', 'letter']);
    checkSeals(state);
    expect(state.seals['atelierBook-1']).toBeDefined();
    destroyCuriosity(state, book, always(0.99));
    checkSeals(state);
    expect(state.seals.unmakeMasterpiece).toBeDefined();
  });

  it('le pilon : à la main et au-delà du stock gardé ; au prestige, son Éther en plus, puis à zéro ; le chariot se vide', () => {
    const state = opened();
    state.atelier.drawers.spine[3] = 12;
    expect(autoPulp(state, 'spine', 3)).toBe(true);
    expect(state.atelier.drawers.spine[3]).toBe(10);
    expect(state.atelier.pulp).toBe(8);
    state.atelier.drawers.back[0] = 300;
    state.atelier.keep = -1;
    expect(pulpState(state, 0)).toBe(300);
    expect(pulpPercent(state)).toBe(3);
    const loose = put(state, 2, 'finds');
    const locked = put(state, 2, 'away');
    toggleLock(state, locked);
    state.totalPagesRead = 1000 ** 3 * etherPages();
    const gain = prestigeGain(state);
    expect(prestigeEther(state)).toBe(gain + Math.floor(gain * 0.03));
    prestige(state);
    expect(state.ether).toBe(gain + Math.floor(gain * 0.03));
    expect(state.etherReceived).toBe(gain);
    expect(state.atelier.pulp).toBe(0);
    expect(state.atelier.books).not.toContain(loose);
    expect(state.atelier.books).toContain(locked);
  });

  it('les sceaux de l’atelier : curiosités trouvées, le lutrin plein', () => {
    const state = opened();
    put(state, 0, 'pages', 2, 'lectern').slot = 0;
    put(state, 0, 'click', 2, 'lectern').slot = 1;
    put(state, 0, 'finds', 3, 'lectern').slot = 2;
    checkSeals(state);
    expect(state.seals['curiositiesFound-1']).toBeDefined();
    expect(state.seals.lecternFull).toBeDefined();
    expect(state.seals.likeNew).toBeDefined();
  });
});

describe('L’atelier : textes et sauvegarde', () => {
  it('chaque sceau de l’atelier a sa consigne et son titre, en français et en anglais ; le secret, sa phrase-indice', async () => {
    const { ATELIER_SEALS, SEALS } = await import('../src/data/seals');
    const { ANOMALIES } = await import('../src/data/anomalies');
    for (const locale of ['fr', 'en'] as const) {
      const book = (await import(`../src/i18n/${locale}/strangeBook.json`)).default;
      const white = JSON.stringify((await import(`../src/i18n/${locale}/whiteBook.json`)).default);
      expect(book.plates.atelier).toBeTruthy();
      for (const seal of ATELIER_SEALS) {
        expect(book.seals[seal.text], seal.id).toBeTruthy();
        expect(book.sealTitles[seal.id], seal.id).toBeTruthy();
      }
      expect(book.seals.unmakeMasterpiece).toBeTruthy();
      expect(white).toContain('"hintUnmakeMasterpiece"');
    }
    expect(SEALS.some((seal) => seal.id === 'unmakeMasterpiece')).toBe(true);
    expect(ANOMALIES.some((anomaly) => anomaly.id === 'hintUnmakeMasterpiece')).toBe(true);
  });

  it('l’atelier se sauvegarde, et une partie d’avant lui en reçoit un vide', async () => {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
    });
    const { loadGame, saveGame } = await import('../src/core/save');
    const state = opened();
    put(state, 3, 'mimic');
    state.atelier.drawers.spine[2] = 4;
    saveGame(state);
    const loaded = loadGame('fr');
    expect(loaded.atelier.books).toHaveLength(1);
    expect(loaded.atelier.drawers.spine[2]).toBe(4);
    const old = JSON.parse(items.get('idle-babel-save')!);
    delete old.atelier;
    items.set('idle-babel-save', JSON.stringify(old));
    expect(loadGame('fr').atelier).toEqual(createInitialState('fr').atelier);
    vi.unstubAllGlobals();
  });
});
