import { EFFECT, KEEPS, NEEDS_AGE, S, starById } from '../data/etheriumStars';
import { SENTENCES } from '../data/sentences';
import type { GameState } from '../core/state';

/**
 * L'Etherium (conception §4.2) : les étoiles s'allument une à une avec l'Éther, chacune après son étoile d'avant,
 * et donnent leur effet pour toujours (data/etheriumStars.ts).
 */

export const starLit = (state: GameState, id: string): boolean => state.etherium.includes(id);

/** L'étoile peut s'allumer : pas encore allumée, son étoile d'avant l'est (et l'Âge Automatique, pour son alvéole). */
export const starOpen = (state: GameState, id: string): boolean => {
  const star = starById(id);
  if (!star || starLit(state, id)) return false;
  return (!star.after || starLit(state, star.after)) && (!NEEDS_AGE.has(id) || starLit(state, S.age));
};

/** Allume une étoile ouverte, s'il y a assez d'Éther. Renvoie true si elle s'allume. */
export const lightStar = (state: GameState, id: string): boolean => {
  const star = starById(id);
  if (!star || !starOpen(state, id) || state.ether < star.cost) return false;
  state.ether -= star.cost;
  state.etherium.push(id);
  return true;
};

/** Les facteurs des étoiles allumées, multipliés (1 sans aucune). */
const product = (state: GameState, effect: Record<string, number>): number =>
  Object.entries(effect).reduce((total, [id, factor]) => (starLit(state, id) ? total * factor : total), 1);

/** Les valeurs des étoiles allumées, ajoutées (0 sans aucune). */
const sum = (state: GameState, effect: Record<string, number>): number =>
  Object.entries(effect).reduce((total, [id, value]) => (starLit(state, id) ? total + value : total), 0);

// Ce que font les étoiles.

/** Le Livre ouvert (dos, page de gauche) : les pages/s de toutes les méthodes. */
export const readingMultiplier = (state: GameState): number => product(state, EFFECT.readingRate);
/** La Main (poignet, paume, index) : les pages d'un clic. */
export const handsMultiplier = (state: GameState): number => product(state, EFFECT.click);
/** La Chouette (pattes, corps, aile droite) : ce que rapporte une trouvaille. */
export const knowledgePerFind = (state: GameState): number => product(state, EFFECT.knowledge);
/** La Loupe (manche, verre) : la chance de trouvaille. */
export const findsMultiplier = (state: GameState): number => product(state, EFFECT.findChance);
/** La Porte (seuil, montant gauche) : Lectures Diagonales déjà là au réveil. */
export const startingDiagonals = (state: GameState): number => sum(state, EFFECT.diagonals);

/** La Ruche : les phrases de méthode que le prestige laisse écrites (celles dont l'étoile est allumée). */
export const keptMethodSentences = (state: GameState): string[] =>
  SENTENCES.filter((sentence) => sentence.kind === 'method' && KEEPS[sentence.id] && starLit(state, KEEPS[sentence.id])).map(
    (sentence) => sentence.id,
  );
