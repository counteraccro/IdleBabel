import {
  ARIADNE_STEP,
  FILTER_BONUS,
  FLAIR_LEVELS,
  GESTURE_BONUS,
  MEMORY_STEP,
  MUSCLE_STEP,
  RETURN_STEP,
  SLEEP_STEP,
  SPEED_LEVELS,
  TECHNOLOGIES,
  type TechnologyDef,
  type TechnologyId,
} from '../data/technologies';
import { AWAY_SHARE, DUPLICATE_SHARE, MAX_AWAY_SECONDS, TARGET_SHARE } from '../data/knowledge';
import { RARE_BOOKS } from '../data/rareBooks';
import { toolUnlocked } from './sentences';
import type { ToolId } from '../data/tools';
import type { GameState } from '../core/state';

export const technology = (id: TechnologyId): TechnologyDef => TECHNOLOGIES.find((tech) => tech.id === id)!;

/** Niveaux compris d'une intuition (0 : pas encore). */
export const levelOf = (state: GameState, id: TechnologyId): number => state.technologies[id] ?? 0;

/** Nombre de niveaux d'une intuition (Infinity : sans fin). */
export const maxLevel = (id: TechnologyId): number => {
  const tech = technology(id);
  return tech.growth ? Infinity : tech.prices.length;
};

/** Prix du niveau `level` + 1 (le suivant, par défaut), s'il en reste. */
export const priceAt = (id: TechnologyId, level: number): number | undefined => {
  const { prices, growth } = technology(id);
  if (level < prices.length) return prices[level];
  return growth ? prices[prices.length - 1] * growth ** (level - prices.length + 1) : undefined;
};

/**
 * Ce qui empêche de comprendre la suite, en plus du prix : la méthode pas encore retrouvée (son intuition
 * reste cachée), plus aucun livre rare à trouver (le Flair ne sert plus).
 */
export type Locked = 'unknownGesture' | 'nothingLeft';
export const lockOf = (state: GameState, id: TechnologyId): Locked | undefined => {
  const tool = technology(id).tool;
  if (tool && !toolUnlocked(state, tool)) return 'unknownGesture';
  if (id === 'flair' && Object.keys(state.rareBooks).length >= RARE_BOOKS.length) return 'nothingLeft';
  return undefined;
};

/** Prix du niveau suivant, s'il en reste et qu'il peut se comprendre. */
export const nextPrice = (state: GameState, id: TechnologyId): number | undefined =>
  lockOf(state, id) ? undefined : priceAt(id, levelOf(state, id));

/** Comprendre le niveau suivant, s'il y a assez de Connaissance. Renvoie true s'il est compris. */
export const understand = (state: GameState, id: TechnologyId): boolean => {
  const price = nextPrice(state, id);
  if (price === undefined || state.knowledge < price) return false;
  state.knowledge -= price;
  state.technologies[id] = levelOf(state, id) + 1;
  return true;
};

// Ce que fait chaque intuition, au niveau `level` (le sien par défaut).

/** Filtre sémantique : ce qu'il fait à la chance de trouvaille. */
export const filterMultiplier = (state: GameState, level = levelOf(state, 'semanticFilter')): number => FILTER_BONUS ** level;

/** Fil d'Ariane : part des trouvailles tirées dans la phrase de méthode en cours. */
export const targetShare = (state: GameState, level = levelOf(state, 'ariadne')): number =>
  Math.min(1, TARGET_SHARE + ARIADNE_STEP * level);

/** Mémoire des phrases : part des trouvailles qui répètent un morceau déjà écrit. */
export const duplicateShare = (state: GameState, level = levelOf(state, 'sentenceMemory')): number =>
  Math.max(0, DUPLICATE_SHARE - MEMORY_STEP * level);

/** Lecture rapide : feuilles tournées seules au plus par seconde. */
export const turnsPerSecond = (state: GameState, level = levelOf(state, 'speedReading')): number =>
  SPEED_LEVELS[Math.min(level, SPEED_LEVELS.length - 1)];

/** Mémoire musculaire : part de la production d'une seconde que rapporte en plus chaque clic. */
export const clickShare = (state: GameState, level = levelOf(state, 'muscleMemory')): number => MUSCLE_STEP * level;

/** Cartographie du Retour : part de la lecture comptée pendant une absence. */
export const awayShare = (state: GameState, level = levelOf(state, 'returnMap')): number => Math.min(1, AWAY_SHARE + RETURN_STEP * level);

/** Sommeil profond : absence comptée au plus (en secondes). */
export const maxAwaySeconds = (state: GameState, level = levelOf(state, 'deepSleep')): number => MAX_AWAY_SECONDS + SLEEP_STEP * level;

/** Flair : chance qu'un livre soit rare. */
export const rareChance = (state: GameState, level = levelOf(state, 'flair')): number =>
  1 / FLAIR_LEVELS[Math.min(level, FLAIR_LEVELS.length - 1)];

/** L'intuition d'une méthode. */
export const gestureOf = (tool: ToolId): TechnologyId => TECHNOLOGIES.find((tech) => 'tool' in tech && tech.tool === tool)!.id;

/** Intuition d'une méthode : ce qu'elle fait à sa production. */
export const gestureMultiplier = (state: GameState, tool: ToolId, level = levelOf(state, gestureOf(tool))): number =>
  GESTURE_BONUS ** level;

/** Part des niveaux compris, des intuitions qui ont une fin (page de titre de la partie). */
export const technologiesCompletion = (state: GameState): number => {
  const bounded = TECHNOLOGIES.filter((tech) => maxLevel(tech.id) !== Infinity);
  const total = bounded.reduce((sum, tech) => sum + tech.prices.length, 0);
  return bounded.reduce((sum, tech) => sum + levelOf(state, tech.id), 0) / total;
};
