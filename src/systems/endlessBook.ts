import { sealEvent } from './seals';
import type { GameState } from '../core/state';

/**
 * « Le Livre sans fin… sauf une ? » (livre rare, décidé avec l'auteur le 10/10/2026) : un livre-jeu de cent
 * paragraphes, « rendez-vous au 47 », où presque tous les chemins ramènent au 1. Lu dans la bibliothèque, il cache
 * deux sceaux secrets :
 * - « Sauf une. » : la seule fin, le 100, atteinte par le lien du 72. Le 72, aucun lien n'y mène : on l'ouvre en
 *   tournant les pages depuis le palier (le 90), avec la somme des trois nombres appris en montant (17 + 23 + 32) ;
 * - « J'ai feuilleté. J'avoue. » : le 66, où aucun choix n'envoie, trouvé en tournant les pages.
 * Le chemin n'est pas sauvegardé : c'est celui de la lecture en cours.
 */

export const ENDLESS_BOOK_ID = 'endlessBook';
/** Le palier, la serrure, la seule fin, le paragraphe du tricheur. */
export const LANDING = 90;
export const LOCK = 72;
export const ENDING = 100;
export const CHEAT = 66;

interface Trail {
  /** Le dernier lien suivi menait au palier (ce qui a suivi : des pages tournées à la main). */
  landing: boolean;
  /** Depuis le palier, la serrure a été ouverte (sa page vue). */
  lockOpen: boolean;
  /** La double page où le dernier lien a mené, tant qu'on y reste : y arriver n'est pas feuilleter. */
  linked: number | null;
}

const trail: Trail = { landing: false, lockOpen: false, linked: null };

/** Une nouvelle lecture : rien n'est encore suivi (et les tests repartent de zéro). */
export const resetEndlessTrail = (): void => {
  Object.assign(trail, { landing: false, lockOpen: false, linked: null });
};

/** Le lien du paragraphe `from` vers le paragraphe `to` a été suivi ; il mène à la double page `spread`. */
export const followParagraph = (state: GameState, from: number, to: number, spread: number): void => {
  if (from === LOCK && to === ENDING && trail.lockOpen) sealEvent(state, 'endlessEnding');
  Object.assign(trail, { landing: to === LANDING, lockOpen: false, linked: spread });
};

/** La double page `spread` est sous les yeux, livre posé ; `starts` : les paragraphes qui y commencent. */
export const seeParagraphs = (state: GameState, starts: readonly number[], spread: number): void => {
  if (starts.includes(LOCK) && trail.landing) trail.lockOpen = true;
  if (starts.includes(CHEAT) && trail.linked !== spread) sealEvent(state, 'endlessCheat');
  if (trail.linked !== spread) trail.linked = null;
};
