import { FILTER_BONUS, TECHNOLOGIES, type TechnologyDef, type TechnologyId } from '../data/technologies';
import type { GameState } from '../core/state';

export const technology = (id: TechnologyId): TechnologyDef => TECHNOLOGIES.find((tech) => tech.id === id)!;

/** Niveaux compris d'une intuition (0 : pas encore). */
export const levelOf = (state: GameState, id: TechnologyId): number => state.technologies[id] ?? 0;

/** Prix du niveau suivant, s'il en reste. */
export const nextPrice = (state: GameState, id: TechnologyId): number | undefined => technology(id).prices[levelOf(state, id)];

/** Comprendre le niveau suivant, s'il y a assez de Connaissance. Renvoie true s'il est compris. */
export const understand = (state: GameState, id: TechnologyId): boolean => {
  const price = nextPrice(state, id);
  if (price === undefined || state.knowledge < price) return false;
  state.knowledge -= price;
  state.technologies[id] = levelOf(state, id) + 1;
  return true;
};

/** Ce que le filtre sémantique fait à la chance de trouvaille, au niveau `level` (le sien par défaut). */
export const filterMultiplier = (state: GameState, level = levelOf(state, 'semanticFilter')): number => FILTER_BONUS ** level;

/** Part des niveaux compris, toutes intuitions confondues (page de titre de la partie). */
export const technologiesCompletion = (state: GameState): number => {
  const total = TECHNOLOGIES.reduce((sum, tech) => sum + tech.prices.length, 0);
  return TECHNOLOGIES.reduce((sum, tech) => sum + levelOf(state, tech.id), 0) / total;
};
