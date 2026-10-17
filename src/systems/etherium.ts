import {
  afterLit,
  CLOSED,
  EFFECT,
  KEEPS,
  PAGE_NEEDS,
  PAGE_NEEDS_DRAW,
  PAGE_NEEDS_ETHER,
  RELIC_BRANCH,
  S,
  SIMPLE,
  neededFor,
  starById,
  STARS,
  type PageId,
} from '../data/etheriumStars';
import { ETHER_READING, ETHER_WEIGHT } from '../data/etherium';
import { SENTENCES } from '../data/sentences';
import { runHooks } from '../mods/hooks';
import type { GameState } from '../core/state';

/**
 * L'Etherium (conception §4.2) : les étoiles s'allument une à une avec l'Éther, chacune après son étoile d'avant,
 * et donnent leur effet pour toujours (data/etheriumStars.ts).
 */

export const starLit = (state: GameState, id: string): boolean => state.etherium.includes(id);

/**
 * L'étoile peut s'allumer : pas encore allumée ni fermée (CLOSED), son étoile d'avant l'est (et l'Âge de son alvéole,
 * dans la Ruche ; l'Est de l'Exploration, pour la page de la Mimic ; un jeton joué, pour celle de la Loterie).
 */
export const starOpen = (state: GameState, id: string): boolean => {
  const star = starById(id);
  if (!star || starLit(state, id) || CLOSED.has(id)) return false;
  const needed = neededFor(id);
  return (
    afterLit(star, (before) => starLit(state, before)) &&
    (!needed || starLit(state, needed)) &&
    state.etherReceived >= etherNeeded(star.page) &&
    drawnFor(state, star.page)
  );
};

/** La page n'attend pas de jeton joué, ou un jeton l'a été (la Loterie). */
const drawnFor = (state: GameState, page: PageId): boolean => !PAGE_NEEDS_DRAW.has(page) || state.lottery.draws > 0;

/** L'Éther reçu qu'attend une page pour s'ouvrir (le Poids : 5 000), 0 sinon. */
export const etherNeeded = (page: PageId): number => PAGE_NEEDS_ETHER[page] ?? 0;

/**
 * La page est ouverte : rien ne la débloque (sinon, son étoile est allumée), l'Éther reçu suffit (le Poids), et un jeton a
 * été joué (la Loterie).
 */
export const pageOpen = (state: GameState, page: PageId): boolean => {
  const needed = PAGE_NEEDS[page];
  return (!needed || starLit(state, needed)) && state.etherReceived >= etherNeeded(page) && drawnFor(state, page);
};

/** Allume une étoile ouverte, s'il y a assez d'Éther. Renvoie true si elle s'allume. */
export const lightStar = (state: GameState, id: string): boolean => {
  const star = starById(id);
  if (!star || !starOpen(state, id) || state.ether < star.cost) return false;
  state.ether -= star.cost;
  state.etherium.push(id);
  runHooks('star', { id, cost: star.cost });
  return true;
};

/** Une étoile au moins peut s'allumer avec l'Éther en réserve (sa page ouverte). */
export const starAffordable = (state: GameState): boolean =>
  STARS.some((star) => state.ether >= star.cost && pageOpen(state, star.page) && starOpen(state, star.id));

/** Les facteurs des étoiles allumées, multipliés (1 sans aucune). */
const product = (state: GameState, effect: Record<string, number>): number =>
  Object.entries(effect).reduce((total, [id, factor]) => (starLit(state, id) ? total * factor : total), 1);

/** Les valeurs des étoiles allumées, ajoutées (0 sans aucune). */
const sum = (state: GameState, effect: Record<string, number>): number =>
  Object.entries(effect).reduce((total, [id, value]) => (starLit(state, id) ? total + value : total), 0);

/**
 * L'Éther reçu tel que la lecture le compte (le poids de la Bibliothèque) : tout jusqu'à 5 000, puis
 * 5 000 × (reçu / 5 000)^exposant ; l'exposant part de 0,3, et chaque étoile de l'Atlas l'élève, jusqu'à 1.
 */
export const etherCounted = (received: number, lifted: number): number => {
  const { from, power } = ETHER_WEIGHT;
  return received <= from ? received : from * (received / from) ** weightPower(lifted);
};

/** L'exposant du poids, `lifted` ce qu'ont ajouté les étoiles de l'Atlas allumées (1 : le poids levé). */
export const weightPower = (lifted: number): number => Math.min(1, Number((ETHER_WEIGHT.power + lifted).toFixed(6)));

/** Ce que les étoiles de l'Atlas allumées ont ôté au poids. */
export const weightLifted = (state: GameState): number => sum(state, EFFECT.weight);

/** Le poids de la Bibliothèque se montre : l'Éther reçu a atteint 5 000 (la page de l'Atlas s'ouvre, data/etheriumStars.ts). */
export const weightShown = (state: GameState): boolean => state.etherReceived >= ETHER_WEIGHT.from;

/** Le poids pèse encore : il se montre, et les étoiles de l'Atlas ne l'ont pas levé. */
export const weightPresses = (state: GameState): boolean => weightShown(state) && weightPower(weightLifted(state)) < 1;

/** La lecture en plus, en points de pour cent, que donneraient `gain` Éther de plus (sous le poids : moins d'un par Éther). */
export const readingGain = (state: GameState, gain: number): number => {
  const lifted = weightLifted(state);
  return (etherCounted(state.etherReceived + gain, lifted) - etherCounted(state.etherReceived, lifted)) * ETHER_READING * 100;
};

/** L'Éther reçu depuis toujours, dépensé ou non : 1 % de lecture en plus chacun (méthodes et clics), sous le poids. */
export const etherReading = (state: GameState): number => 1 + etherCounted(state.etherReceived, weightLifted(state)) * ETHER_READING;

// Ce que font les étoiles.

/** Le Livre ouvert (dos, page de gauche) : les pages/s de toutes les méthodes. */
export const readingMultiplier = (state: GameState): number => product(state, EFFECT.readingRate);
/** Les tomes de « L'histoire de Babel » finis (le Rideau entier : le tome 1) : +15 % de pages/s chacun, à part. */
export const storyMultiplier = (state: GameState): number => 1 + sum(state, EFFECT.storyReading);
/** Les bribes de « Qui j'étais » remontées : une par étoile du Rideau allumée. */
export const storyBribes = (state: GameState): number => state.etherium.filter((id) => id.startsWith('curtain.')).length;
/** Le Minitel (la prise, l'écran) : les pages/s des méthodes de l'Âge Numérique. */
export const digitalMultiplier = (state: GameState): number => product(state, EFFECT.digitalReading);
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

/** La Plume (bec, tige) : ce qu'elle fait à l'attente entre deux lettres. */
export const letterWaitFactor = (state: GameState): number => product(state, EFFECT.letterWait);
/** La Plume (barbes de gauche) : ce qu'elle fait à la durée des bonus de la lettre. */
export const boonLengthFactor = (state: GameState): number => product(state, EFFECT.boonLength);
/** La Plume (haut des barbes de gauche) : secondes en plus où la lettre reste à l'écran. */
export const letterStaysBonus = (state: GameState): number => (starLit(state, S.letterStays) ? SIMPLE.letterStays : 0);
/** La Plume (la pointe) : la lecture de la Transe, la plus haute allumée ; `base` sans elle. */
export const tranceFactor = (state: GameState, base: number): number =>
  Math.max(base, ...Object.entries(EFFECT.trance).map(([id, value]) => (starLit(state, id) ? value : 0)));

/** L'Est de l'Exploration : la Mimic vient dans les salles. */
export const mimicUnlocked = (state: GameState): boolean => starLit(state, S.mimic);
/** L'œil de la Mimic : on voit combien elle a englouti. */
export const mimicEyeLit = (state: GameState): boolean => starLit(state, S.mimicEye);
/** Les dents du haut : ce qu'elles font à la fréquence de la Mimic (la plus haute allumée ; ×1 sans elles). */
export const mimicComesFactor = (state: GameState): number =>
  Math.max(1, ...Object.entries(EFFECT.mimicComes).map(([id, value]) => (starLit(state, id) ? value : 0)));
/** Les dents du bas : part rendue en plus des 10 % (la plus haute allumée ; 0 sans elles). */
export const mimicGivesBonus = (state: GameState): number =>
  Math.max(0, ...Object.entries(EFFECT.mimicGives).map(([id, value]) => (starLit(state, id) ? value : 0)));

/** L'Ouest de l'Exploration : les reliques peuvent apparaître (leurs phrases, dans le livre blanc). */
export const relicsUnlocked = (state: GameState): boolean => starLit(state, S.relics);
/** « La patience » : le délai pour changer de relique est raccourci. */
export const patienceLit = (state: GameState): boolean => starLit(state, S.patience);
/** Le niveau du bonus d'une relique (0 à 2) : ses étoiles allumées sur la page « Les reliques », la plus haute. */
export const relicStarLevel = (state: GameState, relic: string): number =>
  Math.max(
    0,
    ...Object.entries(EFFECT.relicLevel).map(([id, level]) =>
      id.startsWith(`relics.${RELIC_BRANCH[relic]}`) && starLit(state, id) ? level : 0,
    ),
  );

/** Le niveau d'une branche (0 sans étoile) : la plus haute allumée. */
const levelOf = (state: GameState, effect: Record<string, number>): number =>
  Math.max(0, ...Object.entries(effect).map(([id, level]) => (starLit(state, id) ? level : 0)));
/** La Loterie, le levier : la chance qu'une Mimic attrapée lâche un jeton (data/lottery.ts, LOTTERY_STARS.token). */
export const lotteryTokenLevel = (state: GameState): number => levelOf(state, EFFECT.lotteryToken);
/** Le rouleau du temps : la durée du gain, des bonus, des malus et de la Mimic dorée. */
export const lotteryTimeLevel = (state: GameState): number => levelOf(state, EFFECT.lotteryTime);
/** Le rouleau de la valeur : ce que les bonus ajoutent, et la production divisée pendant le malus. */
export const lotteryValueLevel = (state: GameState): number => levelOf(state, EFFECT.lotteryValue);
/** Le rouleau de la chance : la part de chaque résultat. */
export const lotteryLuckLevel = (state: GameState): number => levelOf(state, EFFECT.lotteryLuck);

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
  if (starLit(state, S.previousKnowledge)) state.knowledge += Math.ceil(previous.knowledge * SIMPLE.previousKnowledge);
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
