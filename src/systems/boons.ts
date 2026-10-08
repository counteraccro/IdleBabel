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

/** Un bonus commence, ou repart à sa durée entière s'il était déjà en cours. */
export const startBoon = (id: BoonId, seconds: number, now = Date.now()): void => {
  running[id] = { end: now + seconds * 1000, total: seconds * 1000 };
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

/** Transe : la lecture des méthodes (×2 ; ×3, ×4 avec la pointe de la Plume). */
export const readingBoon = (state: GameState): number => (boonOn('trance') ? tranceFactor(state, BOON.trance) : 1);
/** Œil vif : la chance de trouvaille. */
export const findsBoon = (): number => (boonOn('eye') ? BOON.eye : 1);
/** Main légère : les pages d'un clic. */
export const clickBoon = (): number => (boonOn('hand') ? BOON.hand : 1);
/** Mémoire vive : la Connaissance d'une trouvaille. */
export const knowledgeBoon = (): number => (boonOn('mind') ? BOON.mind : 1);
/** Aubaine : le prix des méthodes. */
export const priceBoon = (): number => (boonOn('deal') ? BOON.deal : 1);
