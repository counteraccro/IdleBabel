import { BOON, type BoonId } from '../data/letter';
import { tranceFactor } from './etherium';
import type { GameState } from '../core/state';

/**
 * Les bonus de la lettre en cours (systems/letter.ts) : l'heure où chacun finit. Ils ne sont pas sauvegardés (un bonus
 * en cours est perdu au rechargement, il ne dure jamais longtemps) et le prestige les efface. La production, les clics,
 * les trouvailles et le prix des méthodes les lisent ici.
 */
interface Running {
  /** Heure de fin (Date.now()). */
  end: number;
  /** Sa durée entière, en millisecondes (le cercle du médaillon). */
  total: number;
}

const running: Partial<Record<BoonId, Running>> = {};

/**
 * Un bonus commence, ou repart à sa durée entière s'il était déjà en cours ; `stack` (une lettre de la même volée,
 * systems/letter.ts) : sa durée s'ajoute à ce qui restait.
 */
export const startBoon = (id: BoonId, seconds: number, now = Date.now(), stack = false): void => {
  const left = stack ? Math.max(0, (running[id]?.end ?? 0) - now) : 0;
  running[id] = { end: now + left + seconds * 1000, total: left + seconds * 1000 };
};

/** Le bonus est en cours. */
export const boonOn = (id: BoonId, now = Date.now()): boolean => (running[id]?.end ?? 0) > now;

export interface ActiveBoon {
  id: BoonId;
  /** Millisecondes qui restent. */
  left: number;
  /** Sa durée entière, en millisecondes. */
  total: number;
}

/** Les bonus en cours, dans l'ordre où ils ont commencé. */
export const activeBoons = (now = Date.now()): ActiveBoon[] =>
  (Object.entries(running) as [BoonId, Running][])
    .filter(([, boon]) => boon.end > now)
    .map(([id, boon]) => ({ id, left: boon.end - now, total: boon.total }));

/** Le prestige (et le débogage) : plus aucun bonus en cours. */
export const forgetBoons = (): void => {
  for (const id of Object.keys(running) as BoonId[]) delete running[id];
};

// Ce que font les bonus en cours (×1 sans eux).

/**
 * Quatre cent dix : les pages lues (méthodes et clics) et la chance de trouvaille ×410, en plus des autres bonus. Sur un
 * clic, seulement la feuille tournée : la part de la production qu'il lit en plus l'a déjà (readingBoon).
 */
export const fourTen = (): number => (boonOn('fourTen') ? BOON.fourTen : 1);

/** Transe : la lecture des méthodes (×2 ; ×3, ×4 avec la pointe de la Plume) ; Quatre cent dix. */
export const readingBoon = (state: GameState): number => (boonOn('trance') ? tranceFactor(state, BOON.trance) : 1) * fourTen();
/** Œil vif : la chance de trouvaille ; Quatre cent dix. */
export const findsBoon = (): number => (boonOn('eye') ? BOON.eye : 1) * fourTen();
/** Main légère : les pages d'un clic. */
export const clickBoon = (): number => (boonOn('hand') ? BOON.hand : 1);
/** Mémoire vive : la Connaissance d'une trouvaille. */
export const knowledgeBoon = (): number => (boonOn('mind') ? BOON.mind : 1);
/** Aubaine : le prix des méthodes. */
export const priceBoon = (): number => (boonOn('deal') ? BOON.deal : 1);
