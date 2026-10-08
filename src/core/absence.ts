import { findWhileAway, pagesTurnedAway } from '../systems/knowledge';
import { readWhileAway } from '../systems/awayReading';
import { creditMethods, gainPages, pagesPerSecond } from '../systems/production';
import { checkSeals, sealEvent } from '../systems/seals';
import { tellLore } from '../systems/lore';
import { meetStrangeBook } from '../systems/decipher';
import { awayShare, maxAwaySeconds } from '../systems/technologies';
import { awayFindsShare, awayTurnsMultiplier } from '../systems/etherium';
import { etherDeserved } from '../systems/prestige';
import { gameRandom } from './random';
import { recordOnce } from './history';
import type { GameState } from './state';

/** Une absence d'au moins tant (en secondes), pages qui tournent seules : le livre de la fin la raconte. */
const TOLD_ABSENCE = 15 * 60;
/** Une absence d'au moins tant (en secondes) : au retour, le chercheur croit sortir d'un rêve (ui/awayNotice.ts). */
const NOTICED_ABSENCE = 10 * 60;
/** Une absence d'au moins tant (en secondes) : une nuit entière, un sceau. */
const FULL_NIGHT = 8 * 3600;

/** Le livre en main a avancé sans être à l'écran : il doit se redessiner (ui/book3d/handReading3d.ts). */
export const BOOK_MOVED_EVENT = 'idle-babel:book-moved';

/** Ce qu'une absence a rapporté, raconté au retour. */
export interface AwayReport {
  seconds: number;
  pages: number;
  books: number;
  finds: number;
  rareBooks: number;
  seals: number;
  /** Éther mérité en plus (à recueillir au prochain prestige) ; rien avant le premier prestige, qui le fait connaître. */
  ether: number;
  /** L'absence a duré plus que ce qui est compté (Sommeil profond). */
  capped: boolean;
}

/**
 * Le jeu continue sans le chercheur : `away`, jeu fermé ou onglet caché (rien n'a tourné, on compte la part
 * part awayShare de tout, Cartographie du Retour) ; `pause`, une modale ouverte (les pages sont déjà comptées par la boucle, le livre
 * à l'écran était figé). Pages au rythme de la production, livres, trouvailles, livres rares et sceaux.
 */
export const passTime = (state: GameState, seconds: number, mode: 'away' | 'pause'): AwayReport => {
  const share = mode === 'away' ? awayShare(state) : 1;
  const counted = maxAwaySeconds(state);
  const before = { pages: state.totalPagesRead, ether: etherDeserved(state), rareBooks: Object.keys(state.rareBooks).length, seals: Object.keys(state.seals).length };
  const book = { index: state.booksFinished, page: state.bookPage };
  if (mode === 'away') {
    gainPages(state, pagesPerSecond(state) * Math.min(seconds, counted) * share);
    creditMethods(state, Math.min(seconds, counted) * share);
  }
  let books = 0;
  let finds = 0;
  // Le livre en main ne s'ouvre qu'une fois son récit lu (lore firstBook) : avant, rien ne tourne.
  if (state.loreSeen.includes('firstBook')) {
    // Tiré de la graine de la partie, et de là où en est la lecture.
    const random = gameRandom(`away:${state.totalPagesRead}:${state.lifetimeKnowledge}`);
    books = readWhileAway(state, pagesTurnedAway(state, seconds) * share, random);
    // La Lune de l'Etherium : trouvailles comptées en entier (pointe haute), plus de feuilles (étoile près de la lune).
    finds =
      mode === 'away'
        ? findWhileAway(state, seconds, random, awayFindsShare(state, share), awayTurnsMultiplier(state))
        : findWhileAway(state, seconds, random);
  }
  // Les récits des livres refermés sans être vus : le premier gardé, le Grand Livre arrivé en main.
  if (state.booksFinished > 0) tellLore(state, 'firstBookKept');
  meetStrangeBook(state);
  if (mode === 'away' && seconds >= FULL_NIGHT) sealEvent(state, 'fullNight');
  checkSeals(state);
  if (state.settings.autoTurn && seconds >= TOLD_ABSENCE) recordOnce(state, 'firstAbsence');
  if (state.booksFinished !== book.index || state.bookPage !== book.page) window.dispatchEvent(new Event(BOOK_MOVED_EVENT));
  return {
    seconds,
    pages: state.totalPagesRead - before.pages,
    books,
    finds,
    rareBooks: Object.keys(state.rareBooks).length - before.rareBooks,
    seals: Object.keys(state.seals).length - before.seals,
    ether: state.etherReceived > 0 ? etherDeserved(state) - before.ether : 0,
    capped: seconds > counted,
  };
};

type AwayListener = (report: AwayReport) => void;
let listener: AwayListener | null = null;
/** Absence pas encore racontée (personne n'écoutait encore : le jeu se charge). */
let untold: AwayReport | null = null;

/** Prévient au retour d'une longue absence ; celle du chargement, si elle a eu lieu, tout de suite. */
export const onLongAbsence = (listen: AwayListener): void => {
  listener = listen;
  if (untold) listen(untold);
  untold = null;
};

/** Fin de la dernière absence comptée : deux absences qui se chevauchent (onglet caché sous une modale) ne comptent qu'une fois. */
let countedUntil = 0;

/** Absence de `from` à maintenant (en ms, horloge Date). */
const awaySince = (state: GameState, from: number, mode: 'away' | 'pause'): void => {
  const now = Date.now();
  const start = Math.max(from, countedUntil);
  if (now <= start) return;
  countedUntil = now;
  const report = passTime(state, (now - start) / 1000, mode);
  if (mode !== 'away' || report.seconds < NOTICED_ABSENCE) return;
  if (listener) listener(report);
  else untold = report;
};

/**
 * Le jeu fermé (depuis la dernière sauvegarde) ou l'onglet caché, quand rien ne tourne à l'écran : la
 * boucle ne produit plus et laisse `lastTick` à l'heure où l'onglet a été caché (core/loop.ts), tout est
 * compté ici au retour (même chargé dans un onglet déjà caché : depuis le chargement).
 */
export const watchAbsence = (state: GameState): void => {
  awaySince(state, state.lastTick, 'away');
  state.lastTick = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    awaySince(state, state.lastTick, 'away');
    state.lastTick = Date.now();
  });
};

/** Une modale vient de se fermer après `seconds` : les pages n'ont pas tourné à l'écran, le jeu a continué. */
export const pauseEnded = (state: GameState, seconds: number): void => awaySince(state, Date.now() - seconds * 1000, 'pause');
