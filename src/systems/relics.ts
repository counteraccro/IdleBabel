import { RELICS, RELIC_LOCK_HOURS, RELIC_PATIENT_HOURS, relicById, type RelicId } from '../data/relics';
import { sceneSeen } from '../scene/scenes';
import { patienceLit, relicStarLevel, relicsUnlocked } from './etherium';
import { isComplete } from './sentences';
import { tellLore } from './lore';
import { runHooks } from '../mods/hooks';
import { modded } from '../mods/quantities';
import type { GameState } from '../core/state';

/**
 * Les reliques (data/relics.ts) : quand elles apparaissent, ce qu'elles donnent, en changer. Trouvées, elles restent
 * pour toujours (prestige compris), comme le délai avant d'en changer, qui compte en temps réel.
 */

const HOUR_MS = 3_600_000;

/** Une relique trouvée (rangée dans la vitrine). */
export const relicFound = (state: GameState, id: RelicId): boolean => state.relics.found[id] !== undefined;

/** La phrase-indice d'une relique peut se lire : l'Ouest de l'Exploration allumé, et sa salle déjà vue. */
export const relicHintFindable = (state: GameState, hint: string): boolean => {
  const relic = RELICS.find((candidate) => candidate.hint === hint);
  return !relic?.room || (relicsUnlocked(state) && sceneSeen(state, relic.room));
};

/** Débogage : les reliques posées dans leur salle quoi qu'il arrive (sans l'Ouest ni leur phrase). */
const called = new Set<RelicId>();
export const callRelic = (id: RelicId): void => {
  called.add(id);
};

/** La relique est posée dans sa salle : sa phrase lue (l'Ouest allumé), pas encore trouvée. */
export const relicWaiting = (state: GameState, id: RelicId): boolean => {
  if (relicFound(state, id)) return false;
  if (called.has(id)) return true;
  const relic = relicById(id)!;
  // Le Crayon ne se pose dans aucune salle : il se gagne.
  return relic.hint !== undefined && relicsUnlocked(state) && isComplete(state, relic.hint);
};

/**
 * Le joueur l'a trouvée (un clic dans la salle) : rangée dans la vitrine, son récit (une fois). La toute première se pose
 * d'elle-même et agit tout de suite. Renvoie false si elle n'attendait pas.
 */
export const findRelic = (state: GameState, id: RelicId, now = Date.now()): boolean => {
  if (relicFound(state, id)) return false;
  called.delete(id);
  state.relics.found[id] = now;
  if (!state.relics.active) state.relics.active = id;
  tellLore(state, relicById(id)!.lore);
  runHooks('relic', { id });
  return true;
};

/** Le délai, en heures, avant de pouvoir changer encore de relique (« La patience » le raccourcit). */
export const relicLockHours = (state: GameState): number =>
  (patienceLit(state) ? RELIC_PATIENT_HOURS : RELIC_LOCK_HOURS) * modded('relicLock');

/** Le temps qui reste avant de pouvoir changer de relique (ms) ; 0 : on peut. */
export const relicWait = (state: GameState, now = Date.now()): number => Math.max(0, state.relics.lockedUntil - now);

/**
 * La relique `id` agit à la place de l'autre, tout de suite ; ensuite, plus de changement pendant relicLockHours
 * (choix de l'auteur, 12/10 : piste B). Renvoie false si ce n'est pas possible (pas trouvée, déjà celle-là, délai).
 */
export const setRelic = (state: GameState, id: RelicId, now = Date.now()): boolean => {
  if (!relicFound(state, id) || state.relics.active === id || relicWait(state, now) > 0) return false;
  state.relics.active = id;
  state.relics.lockedUntil = now + relicLockHours(state) * HOUR_MS;
  state.relics.changes += 1;
  return true;
};

/** Le double crochet (le guichet) : 24 h pendant lesquelles une seconde relique se porte avec la première. */
export const DOUBLE_HOOK_HOURS = 24;

/** Le double crochet est en cours. */
export const doubleHookOn = (state: GameState, now = Date.now()): boolean => (state.relics.hook?.until ?? 0) > now;

/** Le double crochet commence (ou recommence) : 24 h, la seconde relique encore à choisir. */
export const startDoubleHook = (state: GameState, now = Date.now()): void => {
  state.relics.hook = { until: now + DOUBLE_HOOK_HOURS * HOUR_MS, second: null };
};

/** La seconde relique portée, pendant le double crochet ; null : pas de double crochet, ou pas encore choisie. */
export const secondRelic = (state: GameState, now = Date.now()): RelicId | null =>
  doubleHookOn(state, now) ? (state.relics.hook!.second ?? null) : null;

/** La relique `id` agit : celle qui agit, ou la seconde du double crochet. */
export const relicWorn = (state: GameState, id: RelicId, now = Date.now()): boolean =>
  state.relics.active === id || secondRelic(state, now) === id;

/**
 * Pendant le double crochet, la relique `id` se porte en seconde, sans délai, à la place d'une seconde déjà choisie (choix
 * de l'auteur, 31/10). Renvoie false si ce n'est pas possible (pas de double crochet, pas trouvée, déjà portée).
 */
export const setSecondRelic = (state: GameState, id: RelicId, now = Date.now()): boolean => {
  if (!doubleHookOn(state, now) || !relicFound(state, id) || relicWorn(state, id, now)) return false;
  state.relics.hook!.second = id;
  return true;
};

/** La relique `id` peut se poser maintenant : pas déjà portée, et le délai passé, ou le double crochet en cours. */
export const relicCanBePut = (state: GameState, id: RelicId, now = Date.now()): boolean =>
  relicFound(state, id) && !relicWorn(state, id, now) && (doubleHookOn(state, now) || relicWait(state, now) === 0);

/** Ce que donne une relique, au niveau de ses étoiles (qu'elle agisse ou non). */
export const relicBonus = (state: GameState, id: RelicId): number => relicById(id)!.bonus[relicStarLevel(state, id)];

/** Ce que donne la relique `id` si elle agit (en seconde aussi, pendant le double crochet) ; sinon `none`. */
const activeBonus = (state: GameState, id: RelicId, none: number): number => (relicWorn(state, id) ? relicBonus(state, id) : none);

/** La Loupe : ×Connaissance de chaque trouvaille (×1 sans elle). */
export const relicKnowledge = (state: GameState): number => activeBonus(state, 'loupe', 1);
/** L'Astrolabe : ce qu'il fait à l'attente entre deux lettres (+40 % d'apparitions : l'attente ÷ 1,4). */
export const relicLetterWait = (state: GameState): number => 1 / (1 + activeBonus(state, 'astrolabe', 0));
/** Le Sablier : ×pages lues, des méthodes et des clics. */
export const relicReading = (state: GameState): number => 1 + activeBonus(state, 'hourglass', 0);
/** Le Crayon : ×ce que demande une nouvelle tâche du jour (−25 % : ×0,75). */
export const relicTaskLength = (state: GameState): number => 1 - activeBonus(state, 'pencil', 0);
/** La Boussole : ×apparitions de la Mimic (+50 % : l'attente ÷ 1,5) ; elle ne touche pas à ce qu'elle rend. */
export const relicMimicComes = (state: GameState): number => 1 + activeBonus(state, 'compass', 0);

/** Débogage : remettre le délai à zéro. */
export const unlockRelicChange = (state: GameState): void => {
  state.relics.lockedUntil = 0;
};
