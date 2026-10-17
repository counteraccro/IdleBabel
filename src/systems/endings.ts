import { storyBribes } from './etherium';
import { SAGA_TOMES } from '../data/sagaTomes';
import type { GameState } from '../core/state';

/**
 * Le meuble des fins (idée de l'auteur, 16/10, .ai/plan-fausses-fins.md) : onze places pour onze fausses fins, les tomes
 * de « L'histoire de Babel ». Le tome 1, « Qui j'étais », paraît au Rideau ; les dix autres existent, vides, et ne se
 * trouvent encore que par le débogage (l'auteur, 17/10 : leur contenu viendra avec leur déblocage).
 */
export const ENDING_TOMES = SAGA_TOMES.length;

/** Le tome `index` (0 : le tome 1) est trouvé : rangé dans le meuble des fins. */
export const tomeFound = (state: GameState, index: number): boolean =>
  index === 0 ? storyBribes(state) > 0 : state.sagaTomes.includes(index + 1);

/** Les fausses fins trouvées (rangées en bas, lues jusqu'au bout ou pas), sur ENDING_TOMES. */
export const fakeEndingsFound = (state: GameState): number => SAGA_TOMES.filter((_, index) => tomeFound(state, index)).length;
