import { messages } from '../i18n';
import { BASE_FIND_CHANCE, FIND_LISTS, FIND_WEIGHTS, MAX_AWAY_SECONDS, MAX_TURNS_PER_SECOND, type Find, type FindKind } from '../data/knowledge';
import { pagesPerSecond } from './production';
import type { GameState } from '../core/state';

/** Mode débogage : chaque page tournée cache une trouvaille. */
let forced = false;
export const forceFinds = (on: boolean): void => {
  forced = on;
};

/** Chance qu'une page tournée cache une trouvaille (les bonus s'ajouteront ici). */
export const findChance = (_state: GameState): number => (forced ? 1 : BASE_FIND_CHANCE);

const KINDS = Object.keys(FIND_WEIGHTS) as FindKind[];
const TOTAL_WEIGHT = KINDS.reduce((sum, kind) => sum + FIND_WEIGHTS[kind], 0);

const drawFind = (random: () => number): Find => {
  let roll = random() * TOTAL_WEIGHT;
  const kind = KINDS.find((candidate) => (roll -= FIND_WEIGHTS[candidate]) < 0) ?? 'word';
  const list = messages().fragments[FIND_LISTS[kind]];
  return { kind, index: Math.floor(random() * list.length) };
};

/** La page tournée cache-t-elle une trouvaille ? Rien n'est gagné tant qu'elle n'est pas lue (gainFind). */
export const rollFind = (state: GameState, random: () => number = Math.random): Find | undefined =>
  random() < findChance(state) ? drawFind(random) : undefined;

/** Texte d'une trouvaille, dans la langue courante. */
export const findText = (find: Find): string => messages().fragments[FIND_LISTS[find.kind]][find.index] ?? '';

/** Une trouvaille lue : 1 point de Connaissance. */
export const gainFind = (state: GameState, find: Find): void => {
  state.knowledge += 1;
  state.cycleKnowledge += 1;
  state.lifetimeKnowledge += 1;
  state.stats.fragments += 1;
  state.finds.push(find);
};

/**
 * Absence (onglet fermé ou caché) : les pages qui auraient tourné seules au rythme de la production,
 * plafonné comme à l'écran, cachent leurs trouvailles comme les autres. Renvoie le nombre trouvé.
 */
export const findWhileAway = (state: GameState, seconds: number, random: () => number = Math.random): number => {
  if (!state.settings.autoTurn || seconds <= 0) return 0;
  const turned = Math.min(pagesPerSecond(state), MAX_TURNS_PER_SECOND) * Math.min(seconds, MAX_AWAY_SECONDS);
  // Nombre attendu, arrondi au hasard : la moyenne est juste, et une courte absence peut rapporter.
  const expected = turned * findChance(state);
  const count = Math.floor(expected + random());
  for (let i = 0; i < count; i++) gainFind(state, drawFind(random));
  return count;
};

/** Débogage : de la Connaissance sans rien trouver. */
export const addKnowledge = (state: GameState, amount: number): void => {
  state.knowledge += amount;
  state.cycleKnowledge += amount;
  state.lifetimeKnowledge += amount;
};
