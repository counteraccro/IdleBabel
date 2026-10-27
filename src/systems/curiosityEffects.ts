import {
  FAMILY_VALUES,
  MALUS,
  RANK_A,
  RANK_S,
  SECOND_BONUS_RANK,
  SETS,
  STATE_FACTOR,
  S_BONUS,
  S_SECOND_RANK,
  type FamilyId,
} from '../data/curiosities';
import { atelierOpen, bookState } from './curiosities';
import { pulpPercent } from './curiosityPulp';
import type { Curiosity, GameState } from '../core/state';

/**
 * Ce que donnent les curiosités du lutrin (data/curiosities.ts) : chacune son bonus (deux dès A), réduit ou grandi par son
 * état (médiocre ×0,4 … neuf ×1,3), et dès B un malus d'une autre famille (jamais l'Éther), qui ne dépend pas de l'état. Les
 * valeurs sont en pour cent (la Mimic, en points de ce qu'elle rend en plus). Chaque grandeur du jeu en demande ici sa part.
 */

export interface CuriosityBonus {
  family: FamilyId;
  /** La valeur du rang (avant l'état), et la part qu'en fait agir l'état. */
  value: number;
  factor: number;
}
export interface CuriosityMalus {
  family: FamilyId;
  value: number;
}

/** Les bonus et le malus d'une curiosité (qu'elle soit au lutrin ou non). */
export const curiosityEffects = (book: Curiosity): { bonus: CuriosityBonus[]; malus: CuriosityMalus[] } => {
  const factor = STATE_FACTOR[bookState(book)];
  if (book.rank === RANK_S && book.set !== undefined) {
    const set = SETS[book.set];
    return {
      bonus: [
        { family: set.bonus, value: Math.round(FAMILY_VALUES[set.bonus][RANK_S] * S_BONUS), factor },
        { family: set.second, value: Math.round(FAMILY_VALUES[set.second][S_SECOND_RANK] * S_BONUS), factor },
      ],
      malus: [{ family: set.malus, value: MALUS[RANK_S] }],
    };
  }
  const bonus: CuriosityBonus[] = [{ family: book.family, value: FAMILY_VALUES[book.family][book.rank], factor }];
  if (book.rank >= RANK_A && book.second) bonus.push({ family: book.second, value: FAMILY_VALUES[book.second][SECOND_BONUS_RANK], factor });
  return { bonus, malus: book.malus && MALUS[book.rank] ? [{ family: book.malus, value: MALUS[book.rank] }] : [] };
};

/** Les curiosités qui agissent : celles du lutrin (l'atelier ouvert). */
export const lecternBooks = (state: GameState): Curiosity[] =>
  atelierOpen(state) ? state.atelier.books.filter((book) => book.where === 'lectern') : [];

/** Ce que fait le lutrin à une famille : les bonus (état compris), moins les malus ; en pour cent (ou en points). */
export const lecternNet = (state: GameState, family: FamilyId): number => {
  let net = 0;
  for (const book of lecternBooks(state)) {
    const { bonus, malus } = curiosityEffects(book);
    for (const effect of bonus) if (effect.family === family) net += effect.value * effect.factor;
    for (const effect of malus) if (effect.family === family) net -= effect.value;
  }
  return net;
};

/** Le facteur qu'il fait à une grandeur (+13 % : ×1,13 ; jamais en dessous de zéro). */
const factorOf = (state: GameState, family: FamilyId): number => Math.max(0, 1 + lecternNet(state, family) / 100);

/** × pages/s des méthodes. */
export const curiosityReading = (state: GameState): number => factorOf(state, 'pages');
/** × pages d'une feuille tournée à la main. */
export const curiosityClick = (state: GameState): number => factorOf(state, 'click');
/** × chance de trouvaille. */
export const curiosityFinds = (state: GameState): number => factorOf(state, 'finds');
/** × Connaissance par trouvaille. */
export const curiosityKnowledge = (state: GameState): number => factorOf(state, 'knowledge');
/** × prix des méthodes (le bonus le baisse, le malus le monte). */
export const curiosityPrice = (state: GameState): number => Math.max(0, 1 - lecternNet(state, 'price') / 100);
/** × attente entre deux lettres (+18 % de venues : l'attente ÷ 1,18). */
export const curiosityLetterWait = (state: GameState): number => 1 / Math.max(0.05, 1 + lecternNet(state, 'letter') / 100);
/** × durée des bonus de la lettre. */
export const curiosityBoonLength = (state: GameState): number => factorOf(state, 'boons');
/** + part que rend la Mimic en plus (des points : 10 points = 0,1). */
export const curiosityMimicGives = (state: GameState): number => lecternNet(state, 'mimic') / 100;
/** × lecture comptée pendant l'absence (la part, qui reste d'au plus 100 %). */
export const curiosityAway = (state: GameState): number => factorOf(state, 'away');
/** + part d'Éther au prochain prestige : celle du lutrin et celle du pilon. */
export const curiosityEther = (state: GameState): number =>
  Math.max(0, lecternNet(state, 'ether')) / 100 + (atelierOpen(state) ? pulpPercent(state) / 100 : 0);
