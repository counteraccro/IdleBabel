import type { Book } from './book';
// Au-delà, les pages ne tournent pas plus vite : le livre se feuillette en continu.
import { maxTurnsPerSecond } from '../../systems/knowledge';

/** Durée d'une page tournée lentement, la même qu'au clic. */
const SLOW_TURN_MS = 850;

/**
 * Fait tourner les pages du livre au rythme de la production (pages par seconde).
 * Purement visuel : ces pages sont déjà comptées par la production. Le lecteur garde la main :
 * pendant qu'il tourne ou tient une page, le livre refuse, et le retard n'est pas rattrapé.
 * Désactivé dans les options : le livre ne bouge qu'au clic.
 */
export const startAutoTurn = (book: Book, pagesPerSecond: () => number, enabled: () => boolean): void => {
  let due = 0;
  let last = performance.now();

  const frame = (now: number): void => {
    if (!book.root.isConnected) return; // livre remplacé (changement de langue)
    const rate = enabled() ? Math.min(pagesPerSecond(), maxTurnsPerSecond()) : 0;
    // Au plus une page en attente : onglet caché ou lecteur actif, on ne rattrape pas.
    due = Math.min(1, due + (rate * (now - last)) / 1000);
    last = now;
    if (due >= 1 && book.autoTurn(Math.min(SLOW_TURN_MS, 1000 / rate))) due -= 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};
