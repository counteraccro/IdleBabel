import {
  MOUNT_MINUTES,
  NEW,
  PARTS,
  PRESSES,
  RANK_A,
  RANK_S,
  RESTORE_MINUTES,
  RESTORE_PAGES,
  RESTORE_PIECES,
  RESTORE_TIME,
  SET_PAGES,
  type PieceId,
} from '../data/curiosities';
import { atelierLevels } from './etherium';
import { freeFromPresses, newPiece, noteAtelier, settleTop, takeOut } from './curiosities';
import type { Curiosity, CuriosityPiece, GameState, PressJob } from '../core/state';

/**
 * Les presses de l'établi (2, la troisième avec son étoile) : remplacer une pièce par une meilleure du tiroir (30 min à 4 h
 * selon l'état posé), restaurer une pièce S d'un cran (2 h à 8 h, l'établi : moins ; deux pièces du tiroir et des pages de
 * réemploi). Elles travaillent en temps réel, jeu fermé compris ; finie, la pièce va sur son livre (l'ancienne part au tiroir,
 * elle peut s'abîmer en sortant). Et monter un set de quatre pièces S sur un livre de rang A : il devient ce livre S.
 */

type Random = () => number;
const MINUTE = 60_000;

/** Les places de l'établi. */
export const pressCount = (state: GameState): number => PRESSES + (atelierLevels(state).thirdPress ? 1 : 0);
export const freePresses = (state: GameState): number => Math.max(0, pressCount(state) - state.atelier.jobs.length);

/** Ce que fait une presse sur cette pièce d'un livre, ou du carnet. */
export const bookJob = (state: GameState, book: Curiosity, part: PieceId): PressJob | undefined =>
  state.atelier.jobs.find((job) => job.book === book.id && job.part === part);
export const notebookJob = (state: GameState, set: number, part: PieceId): PressJob | undefined =>
  state.atelier.jobs.find((job) => job.carnet === set && job.part === part);

/** Remplacer la pièce `part` d'un livre par une du tiroir, plus belle (`to`) : la pièce quitte le tiroir tout de suite. */
export const mountPiece = (state: GameState, book: Curiosity, part: PieceId, to: number, random: Random, now = Date.now()): boolean => {
  const atelier = state.atelier;
  const piece = book.parts[part];
  if (
    !atelier.books.includes(book) ||
    piece.set !== undefined ||
    to <= piece.state ||
    atelier.drawers[part][to] <= 0 ||
    freePresses(state) <= 0 ||
    bookJob(state, book, part)
  )
    return false;
  atelier.drawers[part][to] -= 1;
  const total = MOUNT_MINUTES[to] * MINUTE;
  atelier.jobs.push({ kind: 'mount', book: book.id, part, to, piece: newPiece(to, random), end: now + total, total });
  return true;
};

/** Restaurer une pièce S d'un cran : deux pièces du même type au tiroir, et les pages de son état. */
export const canRestore = (state: GameState, part: PieceId, pieceState: number): boolean =>
  pieceState < NEW &&
  state.atelier.drawers[part].reduce((sum, count) => sum + count, 0) >= RESTORE_PIECES &&
  state.atelier.reserve >= RESTORE_PAGES[pieceState];

/** Le temps d'une restauration (l'établi : −25 %, −50 %), en millisecondes. */
export const restoreMs = (state: GameState, pieceState: number): number =>
  RESTORE_MINUTES[pieceState] * RESTORE_TIME[atelierLevels(state).bench] * MINUTE;

const restore = (state: GameState, piece: CuriosityPiece, part: PieceId, job: Partial<PressJob>, now: number): boolean => {
  const atelier = state.atelier;
  if (piece.set === undefined || !canRestore(state, part, piece.state) || freePresses(state) <= 0) return false;
  // Les moins bonnes du tiroir d'abord.
  const drawer = atelier.drawers[part];
  for (let n = 0; n < RESTORE_PIECES; n++) drawer[drawer.findIndex((count) => count > 0)] -= 1;
  atelier.reserve -= RESTORE_PAGES[piece.state];
  const total = restoreMs(state, piece.state);
  atelier.jobs.push({ kind: 'restore', part, to: piece.state + 1, end: now + total, total, ...job });
  return true;
};

/** Restaurer une pièce S d'un livre S (un livre qui porte une pièce S doit d'abord être détruit pour la garder). */
export const restoreBookPiece = (state: GameState, book: Curiosity, part: PieceId, now = Date.now()): boolean =>
  book.rank === RANK_S && !bookJob(state, book, part) && restore(state, book.parts[part], part, { book: book.id }, now);

/** Restaurer une pièce du carnet. */
export const restoreNotebookPiece = (state: GameState, set: number, part: PieceId, now = Date.now()): boolean => {
  const piece = state.atelier.notebook[set]?.[part];
  return !!piece && !notebookJob(state, set, part) && restore(state, piece, part, { carnet: set }, now);
};

/** Le set de ce livre S est complet au carnet, et aucune de ses pièces n'est à une presse. */
export const setReady = (state: GameState, set: number): boolean =>
  PARTS.every((part) => state.atelier.notebook[set]?.[part] && !notebookJob(state, set, part));

/**
 * Monter un set complet sur un livre de rang A (64 pages de réemploi) : il devient ce livre S, ses anciennes pièces vont aux
 * tiroirs (sans risque).
 */
export const mountSet = (state: GameState, book: Curiosity, set: number, random: Random): boolean => {
  const atelier = state.atelier;
  if (book.rank !== RANK_A || !setReady(state, set) || atelier.reserve < SET_PAGES || !atelier.books.includes(book)) return false;
  atelier.reserve -= SET_PAGES;
  freeFromPresses(state, book);
  for (const part of PARTS) takeOut(state, book.parts[part], part, random, false);
  const pieces = atelier.notebook[set];
  book.parts = Object.fromEntries(PARTS.map((part) => [part, pieces[part]!])) as Curiosity['parts'];
  atelier.notebook[set] = {};
  book.rank = RANK_S;
  book.set = set;
  for (const key of ['malus', 'second', 'nextMalus', 'nextSecond'] as const) delete book[key];
  if (!atelier.sBooks.includes(set)) atelier.sBooks.push(set);
  settleTop(state);
  noteAtelier({ kind: 'setMounted', set });
  return true;
};

/** Le livre S qu'on peut monter sur ce livre A (le premier set prêt), s'il y en a un. */
export const readySets = (state: GameState): number[] => state.atelier.notebook.map((_, set) => set).filter((set) => setReady(state, set));

/** Les presses qui ont fini : la pièce va sur son livre, ou la pièce S gagne son cran. L'étoile du trousseau s'allume. */
export const tickPresses = (state: GameState, random: Random, now = Date.now()): void => {
  const atelier = state.atelier;
  const done = atelier.jobs.filter((job) => job.end <= now);
  if (!done.length) return;
  atelier.jobs = atelier.jobs.filter((job) => job.end > now);
  atelier.news = true;
  for (const job of done) {
    if (job.kind === 'mount') {
      const book = atelier.books.find((candidate) => candidate.id === job.book);
      if (!book || !job.piece) continue;
      takeOut(state, book.parts[job.part], job.part, random);
      book.parts[job.part] = { ...job.piece, state: job.to };
      atelier.mounted += 1;
      noteAtelier({ kind: 'mounted', part: job.part, to: job.to });
      continue;
    }
    const piece =
      job.carnet !== undefined
        ? atelier.notebook[job.carnet]?.[job.part]
        : atelier.books.find((candidate) => candidate.id === job.book)?.parts[job.part];
    if (piece) piece.state = job.to;
    noteAtelier({ kind: 'restored', part: job.part, to: job.to });
  }
};
