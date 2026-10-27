import {
  ARRIVAL_MINUTES,
  BETTER_PIECE,
  CART_PLACES,
  DAMAGE,
  ETHER_FROM_RANK,
  FAMILIES,
  KEEP_ORDINARY,
  LECTERN_PLACES,
  LOCKS,
  PARTS,
  PIECE_SPREAD,
  RANK_A,
  RANK_COST,
  RANK_ODDS,
  RANK_PAGES,
  RANK_S,
  S_CHANCE,
  S_STATE_ODDS,
  SETS,
  STATE_ODDS,
  type FamilyId,
  type PieceId,
} from '../data/curiosities';
import { ATELIER_ON } from '../data/atelierOn';
import { atelierLevels, atelierLit } from './etherium';
import { autoPulp } from './curiosityPulp';
import type { Curiosity, CuriosityPiece, GameState } from '../core/state';

/**
 * L'atelier des curiosités (data/curiosities.ts ; .ai/plan-curiosites.md, maquette .ai/maquette-atelier-interface.html) :
 * l'arrivée d'une curiosité, la règle du rebut, le chariot plein, le démontage (pages de réemploi et pièces aux tiroirs), le
 * rang qui monte, le lutrin et le cadenas. Les presses : systems/curiosityPresses.ts ; le pilon : systems/curiosityPulp.ts ;
 * ce que donnent les curiosités du lutrin : systems/curiosityEffects.ts. Tout se tire avec `random` (Math.random) : les
 * curiosités ne tiennent pas à la graine de la partie.
 */

type Random = () => number;

/** L'atelier est ouvert : le Sud de la Rose allumé, et (pour cette première version) le mode débogage. */
export const atelierOpen = (state: GameState): boolean => ATELIER_ON && atelierLit(state);

/** Un tirage dans une liste de chances (leurs poids). */
export const pickOdds = (odds: readonly number[], random: Random): number => {
  let rest = random() * odds.reduce((sum, odd) => sum + odd, 0);
  for (let i = 0; i < odds.length; i++) if ((rest -= odds[i]) < 0) return i;
  return odds.length - 1;
};
const pickOf = <T>(list: readonly T[], random: Random): T => list[Math.floor(random() * list.length)];
const clampState = (state: number): number => Math.max(0, Math.min(3, state));

/** Une pièce neuve dans son dessin (sa teinte, sa graine), d'un livre S ou non. */
export const newPiece = (state: number, random: Random, set?: number): CuriosityPiece => ({
  state,
  hue: set === undefined ? Math.floor(random() * 360) : SETS[set].hue,
  seed: Math.floor(random() * 2 ** 31),
  ...(set === undefined ? {} : { set }),
});

/** L'état d'un livre : la moyenne de ses pièces, arrondie vers le bas (une pièce abîmée se voit). */
export const bookState = (book: Curiosity): number =>
  Math.floor(PARTS.reduce((sum, part) => sum + book.parts[part].state, 0) / PARTS.length);

/** Un livre qui porte une pièce S (et n'est pas encore un livre S) : il attend couché sur le chariot, jamais détruit seul. */
export const hasSPiece = (book: Curiosity): boolean => book.rank < RANK_S && PARTS.some((part) => book.parts[part].set !== undefined);

/** Ce que vaut un livre sur le chariot plein : son rang, puis son état. */
const worth = (book: Curiosity): number => book.rank * 10 + bookState(book);

/** La famille principale : celle d'un livre, ou le 1er bonus d'un livre S. Deux de la même ne vont pas ensemble au lutrin. */
export const mainFamily = (book: Curiosity): FamilyId => (book.set === undefined ? book.family : SETS[book.set].bonus);

/** Une autre famille que celles-ci, jamais l'Éther (le malus ne punit pas le prestige ; le 2e bonus non plus). */
const otherFamily = (not: readonly (FamilyId | undefined)[], random: Random): FamilyId =>
  pickOf(
    FAMILIES.filter((family) => family !== 'ether' && !not.includes(family)),
    random,
  );

/**
 * Tire ce qui viendra au prochain rang (le malus à B, le 2e bonus à A), pour que la fiche le montre avant de confirmer ; et ce
 * qu'a déjà un livre arrivé à ce rang.
 */
const drawAhead = (book: Curiosity, random: Random): void => {
  if (book.rank >= 4 && !book.malus) book.malus = otherFamily([book.family], random);
  if (book.rank >= RANK_A && !book.second) book.second = otherFamily([book.family, book.malus], random);
  if (book.rank === 3 && !book.nextMalus) book.nextMalus = otherFamily([book.family], random);
  if (book.rank === 4 && !book.nextSecond) book.nextSecond = otherFamily([book.family, book.malus], random);
};

/** Une curiosité tirée : son rang, sa famille, son état, une pièce S peut-être (1 sur 10, le flair : plus). */
export const makeCuriosity = (state: GameState, random: Random, withS = false): Curiosity => {
  const levels = atelierLevels(state);
  const rank = pickOdds(RANK_ODDS, random);
  let family = pickOf(FAMILIES, random);
  while (family === 'ether' && rank < ETHER_FROM_RANK) family = pickOf(FAMILIES, random);
  const overall = pickOdds(STATE_ODDS, random);
  const hue = Math.floor(random() * 360);
  const parts = Object.fromEntries(
    PARTS.map((part) => {
      let pieceState = clampState(overall + pickOf(PIECE_SPREAD, random));
      if (random() < BETTER_PIECE[levels.eye]) pieceState = clampState(pieceState + 1);
      return [part, { ...newPiece(pieceState, random), hue }];
    }),
  ) as Record<PieceId, CuriosityPiece>;
  if (withS || random() < S_CHANCE[levels.flair]) {
    const set = Math.floor(random() * SETS.length);
    parts[pickOf(PARTS, random)] = newPiece(pickOdds(S_STATE_ODDS, random), random, set);
  }
  const book: Curiosity = {
    id: state.atelier.nextId++,
    rank,
    startRank: rank,
    family,
    parts,
    where: 'cart',
    slot: -1,
    locked: false,
    title: Math.floor(random() * 2 ** 31),
  };
  drawAhead(book, random);
  return book;
};

/** Ce que l'atelier a fait de lui-même, à dire dans la ligne discrète sous la scène (rien n'est sauvegardé). */
export type AtelierNote =
  | { kind: 'arrived'; rank: number; s: boolean }
  | { kind: 'scrapped'; rank: number; pages: number }
  | { kind: 'cartFull'; rank: number; pages: number }
  | { kind: 'destroyed'; rank: number; pages: number; lost: number; damaged: number; sKept: number; sLost: number }
  | { kind: 'mounted'; part: PieceId; to: number }
  | { kind: 'restored'; part: PieceId; to: number }
  | { kind: 'setMounted'; set: number };
const notes: AtelierNote[] = [];
export const atelierNotes = (): readonly AtelierNote[] => notes;
export const noteAtelier = (note: AtelierNote): void => {
  notes.unshift(note);
  notes.length = Math.min(notes.length, 2);
};

/** Ce qu'il est advenu des pièces d'un livre sorties à l'instant. */
interface Outcome {
  lost: number;
  damaged: number;
  sKept: number;
  sLost: number;
}

/**
 * Une pièce sort d'un livre : au tiroir, ou au carnet si c'est une pièce S (gardée si elle vaut mieux que celle qu'il a). En
 * sortant (`risky`), elle peut s'abîmer d'un cran (la main sûre : moins souvent), et une pièce ordinaire sur deux tombe en
 * miettes ; une médiocre abîmée est perdue. Au-delà du stock gardé par tiroir, le surplus part au pilon.
 */
export const takeOut = (
  state: GameState,
  piece: CuriosityPiece,
  part: PieceId,
  random: Random,
  risky = true,
  outcome: Outcome = { lost: 0, damaged: 0, sKept: 0, sLost: 0 },
): Outcome => {
  const hurt = risky && random() < DAMAGE[atelierLevels(state).hand];
  const after = piece.state - (hurt ? 1 : 0);
  if (hurt) outcome.damaged += 1;
  const atelier = state.atelier;
  if (piece.set !== undefined) {
    if (after < 0) {
      outcome.sLost += 1;
      return outcome;
    }
    const key = `${piece.set}:${part}`;
    if (!atelier.sPieces.includes(key)) atelier.sPieces.push(key);
    // Un doublon prend la place de la pièce du carnet s'il vaut mieux (qu'elle, ou que ce qu'elle sera, restaurée).
    const have = atelier.notebook[piece.set][part];
    const restoring = atelier.jobs.find((job) => job.carnet === piece.set && job.part === part);
    if (!have || Math.max(have.state, restoring?.to ?? 0) < after) {
      atelier.notebook[piece.set][part] = { ...piece, state: after };
      if (restoring) atelier.jobs = atelier.jobs.filter((job) => job !== restoring);
    }
    outcome.sKept += 1;
    return outcome;
  }
  if (after < 0 || (risky && random() >= KEEP_ORDINARY)) {
    outcome.lost += 1;
    return outcome;
  }
  atelier.drawers[part][after] += 1;
  autoPulp(state, part, after);
  return outcome;
};

/** Le livre ne bouge plus d'une presse : ce qui y était posé retourne au tiroir (la pièce du tiroir n'est pas perdue). */
export const freeFromPresses = (state: GameState, book: Curiosity): void => {
  const atelier = state.atelier;
  for (const job of atelier.jobs)
    if (job.book === book.id && job.kind === 'mount' && job.piece) atelier.drawers[job.part][job.piece.state] += 1;
  atelier.jobs = atelier.jobs.filter((job) => job.book !== book.id);
};

/**
 * Détruire un livre : ses pages deviennent des pages de réemploi (selon son rang), ses pièces vont aux tiroirs ou au carnet
 * (elles peuvent s'abîmer en sortant). Un livre S détruit : un sceau secret. Pas un livre du lutrin.
 */
export const destroyCuriosity = (state: GameState, book: Curiosity, random: Random): Outcome | null => {
  const atelier = state.atelier;
  if (book.where === 'lectern' || !atelier.books.includes(book)) return null;
  atelier.reserve += RANK_PAGES[book.rank];
  freeFromPresses(state, book);
  atelier.books = atelier.books.filter((other) => other !== book);
  const outcome: Outcome = { lost: 0, damaged: 0, sKept: 0, sLost: 0 };
  for (const part of PARTS) takeOut(state, book.parts[part], part, random, true, outcome);
  atelier.destroyed += 1;
  // Un livre S détruit : le sceau secret « Défaire un chef-d'œuvre » (data/seals.ts).
  if (book.rank === RANK_S) atelier.sDestroyed += 1;
  settleTop(state);
  return outcome;
};

const cartBooks = (state: GameState): Curiosity[] => state.atelier.books.filter((book) => book.where === 'cart');

/** La première place libre du chariot (-1 : plein). */
export const freeCartSlot = (state: GameState): number => {
  const used = new Set(cartBooks(state).map((book) => book.slot));
  for (let slot = 0; slot < CART_PLACES; slot++) if (!used.has(slot)) return slot;
  return -1;
};

/** La première place libre du lutrin (-1 : plein). */
export const freeLecternSlot = (state: GameState): number => {
  const used = new Set(state.atelier.books.filter((book) => book.where === 'lectern').map((book) => book.slot));
  for (let slot = 0; slot < LECTERN_PLACES; slot++) if (!used.has(slot)) return slot;
  return -1;
};

/** Un livre couché sur le dessus qui ne porte plus de pièce S (monté en livre S, sa pièce S démontée) : au chariot, s'il y a place. */
export const settleTop = (state: GameState): void => {
  for (const book of state.atelier.books) {
    if (book.where !== 'top' || hasSPiece(book)) continue;
    const slot = freeCartSlot(state);
    if (slot < 0) return;
    book.where = 'cart';
    book.slot = slot;
  }
};

/**
 * Une curiosité arrive : à pièce S, couchée sur le dessus du chariot (elle ne prend pas de place) ; sinon la règle du rebut,
 * puis le chariot : plein, le moins bon (sans cadenas, l'arrivant compris) part en matière. L'étoile du trousseau s'allume.
 */
export const arriveCuriosity = (state: GameState, random: Random, withS = false): Curiosity => {
  const atelier = state.atelier;
  const book = makeCuriosity(state, random, withS);
  atelier.found += 1;
  atelier.news = true;
  atelier.books.push(book);
  if (hasSPiece(book)) {
    book.where = 'top';
    noteAtelier({ kind: 'arrived', rank: book.rank, s: true });
    return book;
  }
  const { rank, state: worst } = atelier.scrap;
  if (book.rank <= rank && bookState(book) <= worst) {
    destroyCuriosity(state, book, random);
    noteAtelier({ kind: 'scrapped', rank: book.rank, pages: RANK_PAGES[book.rank] });
    return book;
  }
  const slot = freeCartSlot(state);
  if (slot >= 0) {
    book.slot = slot;
    noteAtelier({ kind: 'arrived', rank: book.rank, s: false });
    return book;
  }
  const out = [...cartBooks(state).filter((other) => !other.locked), book].sort((a, b) => worth(a) - worth(b))[0];
  book.slot = out.slot;
  destroyCuriosity(state, out, random);
  noteAtelier({ kind: 'cartFull', rank: out.rank, pages: RANK_PAGES[out.rank] });
  return book;
};

/** Le cadenas : sur un livre du chariot, neuf au plus (une place tourne toujours). */
export const canLock = (state: GameState, book: Curiosity): boolean =>
  book.where === 'cart' && (book.locked || state.atelier.books.filter((other) => other.locked).length < LOCKS);
export const toggleLock = (state: GameState, book: Curiosity): boolean => {
  if (!canLock(state, book)) return false;
  book.locked = !book.locked;
  return true;
};

/** Le livre du lutrin avec lequel celui-ci se gênerait (même famille principale), s'il y en a un. */
export const lecternClash = (state: GameState, book: Curiosity): Curiosity | undefined =>
  state.atelier.books.find((other) => other !== book && other.where === 'lectern' && mainFamily(other) === mainFamily(book));

/** Poser un livre au lutrin : une place libre, pas de pièce S en attente, pas de gêne. */
export const toLectern = (state: GameState, book: Curiosity): boolean => {
  const slot = freeLecternSlot(state);
  if (book.where === 'lectern' || slot < 0 || hasSPiece(book) || lecternClash(state, book)) return false;
  book.where = 'lectern';
  book.slot = slot;
  book.locked = false;
  return true;
};

/** Le ranger au chariot (depuis le lutrin), s'il y a une place. */
export const toCart = (state: GameState, book: Curiosity): boolean => {
  const slot = freeCartSlot(state);
  if (book.where !== 'lectern' || slot < 0) return false;
  book.where = 'cart';
  book.slot = slot;
  return true;
};

/** Monter d'un rang avec les pages de réemploi (jusqu'à A ; le dernier pas se fait avec un set de pièces S). */
export const rankUp = (state: GameState, book: Curiosity, random: Random): boolean => {
  const atelier = state.atelier;
  if (book.rank >= RANK_A || atelier.reserve < RANK_COST[book.rank]) return false;
  atelier.reserve -= RANK_COST[book.rank];
  book.rank += 1;
  if (book.rank === 4) {
    book.malus = book.nextMalus;
    delete book.nextMalus;
  }
  if (book.rank === RANK_A) {
    book.second = book.nextSecond;
    delete book.nextSecond;
  }
  drawAhead(book, random);
  atelier.rankUps += 1;
  return true;
};

/** Ce que coûte le prochain rang (undefined : A, ou S). */
export const rankCost = (book: Curiosity): number | undefined => (book.rank < RANK_A ? RANK_COST[book.rank] : undefined);

/** L'atelier visité : l'étoile du trousseau s'éteint. */
export const visitAtelier = (state: GameState): void => {
  state.atelier.news = false;
};

/** Une curiosité par livre lu au plus, et au plus une toutes les tant de secondes de jeu (l'arrivage : moins). */
export const arrivalSeconds = (state: GameState): number => ARRIVAL_MINUTES[atelierLevels(state).arrival] * 60;

/**
 * Le temps de l'atelier, à chaque tick : les curiosités arrivent en lisant, une fois le Sud allumé (le temps de jeu compté,
 * puis le prochain livre lu) ; les presses travaillent (systems/curiosityPresses.ts, même jeu fermé).
 */
export const tickArrivals = (state: GameState, elapsed: number, random: Random): void => {
  if (!atelierOpen(state)) return;
  const atelier = state.atelier;
  atelier.sinceArrival += elapsed;
  if (atelier.sinceArrival < arrivalSeconds(state)) return;
  if (atelier.waitBook < 0) atelier.waitBook = state.booksFinished;
  if (state.booksFinished <= atelier.waitBook) return;
  atelier.sinceArrival = 0;
  atelier.waitBook = -1;
  arriveCuriosity(state, random);
};

/**
 * Au prestige, le chariot se vide (orientation validée le 26/10) : ses livres partent en matière, sauf ceux au cadenas et
 * ceux qui portent une pièce S ; le lutrin reste.
 */
export const emptyCart = (state: GameState, random: Random): void => {
  for (const book of cartBooks(state)) if (!book.locked) destroyCuriosity(state, book, random);
};
