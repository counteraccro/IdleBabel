import { EFFECT, KEEPS, NEEDS_AGE, S, SIMPLE, starById } from '../data/etheriumStars';
import { ETHER_READING } from '../data/etherium';
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

/** L'Éther reçu depuis toujours, dépensé ou non : 1 % de lecture en plus chacun (méthodes et clics). */
export const etherReading = (state: GameState): number => 1 + state.etherReceived * ETHER_READING;

// Ce que font les étoiles.

/** Le Livre ouvert (dos, page de gauche) : les pages/s de toutes les méthodes. */
export const readingMultiplier = (state: GameState): number => product(state, EFFECT.readingRate);
/** La Main (poignet, paume, index) : les pages d'un clic. */
export const handsMultiplier = (state: GameState): number => product(state, EFFECT.click);
/** La Chouette (pattes, corps, aile droite) : ce que rapporte une trouvaille. */
export const knowledgePerFind = (state: GameState): number => product(state, EFFECT.knowledge);
/** La Loupe (manche, verre) : la chance de trouvaille. */
export const findsMultiplier = (state: GameState): number => product(state, EFFECT.findChance);
/** La Main (pouce, majeur) : part de la production d'une seconde en plus à chaque clic. */
export const clickShareBonus = (state: GameState): number => sum(state, EFFECT.clickShare);
/** L'Annulaire : la chance de trouvaille d'une page tournée à la main (×1 sans lui). */
export const handFindsMultiplier = (state: GameState): number => (starLit(state, S.ring) ? SIMPLE.ringFinds : 1);
/** La Chouette (aile et œil gauches, l'Auriculaire pour la Mémoire musculaire) : le prix d'une intuition. */
export const intuitionPriceFactor = (state: GameState, id: string): number =>
  product(state, EFFECT.intuitions) * (id === 'muscleMemory' && starLit(state, S.pinky) ? SIMPLE.pinkyPrice : 1);
/** Le Bec : une phrase se devine dès qu'il lui manque au plus tant de morceaux. */
export const guessableMissing = (state: GameState): number => (starLit(state, S.beak) ? SIMPLE.beakMissing : 1);
/** Le Livre ouvert (page de droite) : feuilles tournées seules en plus, par seconde. */
export const turnsBonus = (state: GameState): number => sum(state, EFFECT.turns);
/** La Loupe (droite 1) : part en plus des trouvailles tirées dans la phrase de méthode en cours. */
export const aimBonus = (state: GameState): number => sum(state, EFFECT.aim);
/** La Loupe (droite 2) : part en moins des morceaux en double. */
export const duplicatesBonus = (state: GameState): number => sum(state, EFFECT.duplicates);
/** La Loupe (gauche, haut du verre) : la chance qu'un livre soit rare. */
export const rareMultiplier = (state: GameState): number => product(state, EFFECT.rareChance);
/** La Poignée : la chance d'être rare du livre n° `index`, s'il est le premier pris au réveil (×1 sinon). */
export const handleMultiplier = (state: GameState, index: number): number =>
  index === state.wake.book && starLit(state, S.handle) ? SIMPLE.handleRare : 1;
/** La Lune (pointe basse, creux) : part de lecture en plus, comptée pendant l'absence. */
export const awayShareBonus = (state: GameState): number => sum(state, EFFECT.awayShare);
/** La Lune (dos) : heures d'absence comptées en plus, en secondes. */
export const awaySecondsBonus = (state: GameState): number => sum(state, EFFECT.awayHours) * 3600;
/** La pointe haute de la Lune : les trouvailles de l'absence comptent en entier, pas seulement leur part `share`. */
export const awayFindsShare = (state: GameState, share: number): number => (starLit(state, S.awayFinds) ? 1 : share);
/** L'étoile près de la lune : feuilles comptées pour les trouvailles de l'absence, au-delà du plafond (×1 sans elle). */
export const awayTurnsMultiplier = (state: GameState): number => (starLit(state, S.awayTurns) ? SIMPLE.awayTurns : 1);

/** La partie qui s'achève au prestige : ce dont la Porte se souvient. */
export interface PreviousRun {
  tools: GameState['tools'];
  /** Pages lues depuis le réveil d'avant. */
  pages: number;
  /** Connaissance trouvée pendant la partie. */
  knowledge: number;
}

/**
 * La Porte, au réveil : Lectures Diagonales (seuil, montant gauche), au Doigt (gauche 3), une part des exemplaires
 * de chaque méthode (l'arche) ; une part des pages lues (droite 1-2) et de la Connaissance trouvée (droite 3) dans
 * la partie d'avant. `state` vient d'être remis à zéro.
 */
export const openDoor = (state: GameState, previous: PreviousRun): void => {
  state.tools.diagonal += sum(state, EFFECT.diagonals);
  if (starLit(state, S.fingers)) state.tools.finger += SIMPLE.fingers;
  if (starLit(state, S.arch))
    for (const id of Object.keys(previous.tools) as (keyof GameState['tools'])[])
      state.tools[id] += Math.floor(previous.tools[id] * SIMPLE.archShare);
  const share = Math.max(0, ...Object.entries(EFFECT.previousPages).map(([id, value]) => (starLit(state, id) ? value : 0)));
  state.pages += previous.pages * share;
  if (starLit(state, S.previousKnowledge)) state.knowledge += previous.knowledge * SIMPLE.previousKnowledge;
};

/** L'Aigrette gauche : le premier niveau de chaque intuition reste au prestige. */
export const keepsFirstLevels = (state: GameState): boolean => starLit(state, S.crestLeft);
/** Le Reflet : un niveau de Filtre sémantique offert à chaque réveil. */
export const giftsFilter = (state: GameState): boolean => starLit(state, S.filter);

/** La Ruche : les phrases de méthode que le prestige laisse écrites (celles dont l'étoile est allumée). */
export const keptMethodSentences = (state: GameState): string[] =>
  SENTENCES.filter((sentence) => sentence.kind === 'method' && KEEPS[sentence.id] && starLit(state, KEEPS[sentence.id])).map(
    (sentence) => sentence.id,
  );
