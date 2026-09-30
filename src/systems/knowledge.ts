import { SENTENCES } from '../data/sentences';
import {
  BASE_FIND_CHANCE,
  DUPLICATE_SHARE,
  FIND_WEIGHTS,
  LUCK_PAGES,
  MAX_AWAY_SECONDS,
  MAX_TURNS_PER_SECOND,
  TARGET_SHARE,
  type Find,
  type FindKind,
} from '../data/knowledge';
import { PAGES_PER_BOOK } from './books';
import { pagesPerSecond } from './production';
import { currentTarget, isComplete, missing, segmentKind, segments, write, written } from './sentences';
import { tellLore } from './lore';
import type { GameState } from '../core/state';

/** Mode débogage : chaque page tournée cache une trouvaille. */
let forced = false;
export const forceFinds = (on: boolean): void => {
  forced = on;
};

/** Débogage : plafond des pages qui tournent seules, à la place de MAX_TURNS_PER_SECOND. */
let turnCap = MAX_TURNS_PER_SECOND;
export const setTurnCap = (value: number): void => {
  turnCap = value > 0 ? value : MAX_TURNS_PER_SECOND;
};
/** Pages tournées seules au plus par seconde, à l'écran comme hors-ligne. */
export const maxTurnsPerSecond = (): number => turnCap;

/** Chance qu'une page tournée cache une trouvaille (les bonus s'ajouteront ici). */
export const findChance = (_state: GameState): number => (forced ? 1 : BASE_FIND_CHANCE);

/** Pages tournées dans le livre en main depuis le début de la partie. */
const pagesTurned = (state: GameState): number => state.booksFinished * PAGES_PER_BOOK + state.bookPage;

/**
 * Coup de chance : tant que rien n'a été trouvé, la chance grandit à partir de la 15e page tournée
 * pour qu'une trouvaille tombe à coup sûr avant la 30e (au hasard entre les deux).
 */
const chanceNow = (state: GameState): number => {
  const chance = findChance(state);
  if (state.lifetimeKnowledge > 0) return chance;
  const turned = pagesTurned(state);
  if (turned < LUCK_PAGES.from) return chance;
  return Math.max(chance, 1 / Math.max(1, LUCK_PAGES.to - turned + 1));
};

const pick = <T>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)];

const drawKind = (random: () => number): FindKind => {
  const kinds = Object.keys(FIND_WEIGHTS) as FindKind[];
  let roll = random() * kinds.reduce((sum, kind) => sum + FIND_WEIGHTS[kind], 0);
  return kinds.find((kind) => (roll -= FIND_WEIGHTS[kind]) < 0) ?? 'word';
};

/** Un morceau manquant de la phrase, de la sorte voulue si possible. */
const missingSegment = (state: GameState, id: string, kind: FindKind, random: () => number): Find => {
  const texts = segments(id);
  const open = missing(state, id);
  const preferred = open.filter((index) => segmentKind(texts[index]) === kind);
  const segment = pick(preferred.length > 0 ? preferred : open, random);
  return { kind: segmentKind(texts[segment]), sentence: id, segment };
};

/**
 * Ce que cache la page : surtout des morceaux de la phrase de méthode en cours, parfois d'une autre
 * phrase (jamais d'une méthode suivante : elles se découvrent dans l'ordre), parfois un morceau déjà
 * écrit ; rarement une phrase entière. `lucky` : la toute première
 * trouvaille, la phrase entière de la première méthode (la Lecture Diagonale), qui se découvre d'un coup.
 */
export const drawFind = (state: GameState, random: () => number, lucky = false): Find => {
  const target = currentTarget(state);
  if (lucky && target) return { kind: 'sentence', sentence: target };
  const kind = drawKind(random);
  // Seule la méthode en cours se trouve : les suivantes attendent leur tour.
  const open = SENTENCES.filter(
    (sentence) => !isComplete(state, sentence.id) && (sentence.kind !== 'method' || sentence.id === target),
  ).map((sentence) => sentence.id);
  const started = SENTENCES.filter((sentence) => written(state, sentence.id).length > 0).map((sentence) => sentence.id);
  if (open.length === 0 || (kind !== 'sentence' && started.length > 0 && random() < DUPLICATE_SHARE)) {
    const sentence = pick(started.length > 0 ? started : SENTENCES.map((s) => s.id), random);
    const segment = pick(written(state, sentence), random) ?? 0;
    return { kind: segmentKind(segments(sentence)[segment]), sentence, segment, duplicate: true };
  }
  const sentence = target && random() < TARGET_SHARE ? target : pick(open, random);
  if (kind === 'sentence') return { kind, sentence };
  return missingSegment(state, sentence, kind, random);
};

/** La page tournée cache-t-elle une trouvaille ? Rien n'est gagné tant qu'elle n'est pas lue (gainFind). */
export const rollFind = (state: GameState, random: () => number = Math.random): Find | undefined =>
  random() < chanceNow(state) ? drawFind(state, random, state.lifetimeKnowledge === 0) : undefined;

/** Texte surligné dans la page : le morceau (sans sa ponctuation finale), ou la phrase entière. */
export const findText = (find: Find): string => {
  const texts = segments(find.sentence);
  if (find.segment === undefined) return texts.join(' ');
  return texts[find.segment]?.replace(/[\s,;:.]+$/, '') ?? '';
};

/** Une trouvaille lue : 1 point de Connaissance, et elle s'écrit dans le livre blanc. */
export const gainFind = (state: GameState, find: Find): void => {
  state.knowledge += 1;
  state.cycleKnowledge += 1;
  state.lifetimeKnowledge += 1;
  state.stats.fragments += 1;
  state.finds.push(find);
  // La toute première : le joueur comprend une phrase, pour la première fois.
  if (state.lifetimeKnowledge === 1) tellLore(state, 'firstKnowledge');
  if (find.duplicate) return;
  write(state, find.sentence, find.segment === undefined ? segments(find.sentence).map((_, index) => index) : [find.segment]);
};

/**
 * Absence (onglet fermé ou caché) : les pages qui auraient tourné seules au rythme de la production,
 * plafonné comme à l'écran, cachent leurs trouvailles comme les autres. Renvoie le nombre trouvé.
 */
export const findWhileAway = (state: GameState, seconds: number, random: () => number = Math.random): number => {
  if (!state.settings.autoTurn || seconds <= 0) return 0;
  const turned = Math.min(pagesPerSecond(state), maxTurnsPerSecond()) * Math.min(seconds, MAX_AWAY_SECONDS);
  // Nombre attendu, arrondi au hasard : la moyenne est juste, et une courte absence peut rapporter.
  const count = Math.floor(turned * findChance(state) + random());
  for (let i = 0; i < count; i++) gainFind(state, drawFind(state, random));
  return count;
};

/** Débogage : de la Connaissance sans rien trouver. */
export const addKnowledge = (state: GameState, amount: number): void => {
  state.knowledge += amount;
  state.cycleKnowledge += amount;
  state.lifetimeKnowledge += amount;
};
