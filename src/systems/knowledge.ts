import { SENTENCES } from '../data/sentences';
import { BASE_FIND_CHANCE, EXTRA_FIND_SHARES, FIND_WEIGHTS, LUCK_PAGES, type Find, type FindKind } from '../data/knowledge';
import { PAGES_PER_BOOK, PAGES_PER_LEAF } from './books';
import { pagesPerSecond } from './production';
import { isComplete, missing, segmentKind, segments, write, written } from './sentences';
import { findableTarget, hintFindable } from './findable';
import { tellLore } from './lore';
import { duplicateShare, filterMultiplier, maxAwaySeconds, targetShare, turnsPerSecond } from './technologies';
import { sealFindMultiplier } from './seals';
import { findsMultiplier, knowledgePerFind } from './prestige';
import type { GameState } from '../core/state';

/** Mode débogage : chaque page tournée cache une trouvaille. */
let forced = false;
export const forceFinds = (on: boolean): void => {
  forced = on;
};
export const isForcingFinds = (): boolean => forced;

/** Débogage : plafond des feuilles qui tournent seules, à la place de celui de la Lecture rapide. */
let turnCap: number | undefined;
export const setTurnCap = (value: number): void => {
  turnCap = value > 0 ? value : undefined;
};
/** Feuilles tournées seules au plus par seconde (Lecture rapide), à l'écran comme hors-ligne. */
export const maxTurnsPerSecond = (state: GameState): number => turnCap ?? turnsPerSecond(state);

/**
 * Chance qu'une page tournée cache une trouvaille : la base, × le filtre sémantique, × les sceaux obtenus
 * (+1 % chacun), × les Trouvailles de l'Etherium. Détail : dans le chapitre « Révélations » du Grand Livre.
 */
export const findChance = (state: GameState): number =>
  forced ? 1 : BASE_FIND_CHANCE * filterMultiplier(state) * sealFindMultiplier(state) * findsMultiplier(state);

/** Pages tournées dans le livre en main depuis le début de la partie. */
const pagesTurned = (state: GameState): number => state.booksFinished * PAGES_PER_BOOK + state.bookPage;

/**
 * La phrase de la première méthode (la Lecture Diagonale) n'est pas écrite : rien trouvé encore, ou le prestige
 * l'a fait oublier. Elle revient d'un coup, par chance (chanceNow).
 */
const firstMethodLost = (state: GameState): boolean => !isComplete(state, SENTENCES[0].id);

/**
 * Coup de chance : tant que la première phrase n'est pas écrite, la chance grandit à partir de la 15e page
 * tournée pour qu'une trouvaille tombe à coup sûr avant la 30e (au hasard entre les deux) ; après un prestige,
 * dès la première page (les pages tournées se comptent depuis toujours).
 */
const chanceNow = (state: GameState): number => {
  const chance = findChance(state);
  if (!firstMethodLost(state)) return chance;
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

/** Un morceau déjà écrit (Loi de Redondance) : il rapporte sa Connaissance, mais n'écrit rien de neuf. */
const repeatFind = (state: GameState, started: string[], random: () => number): Find => {
  const sentence = pick(started.length > 0 ? started : SENTENCES.map((s) => s.id), random);
  const segment = pick(written(state, sentence), random) ?? 0;
  return { kind: segmentKind(segments(sentence)[segment]), sentence, segment, duplicate: true };
};

const startedSentences = (state: GameState): string[] =>
  SENTENCES.filter((sentence) => written(state, sentence.id).length > 0).map((sentence) => sentence.id);

/**
 * Ce que cache la page : surtout des morceaux de la phrase de méthode en cours, parfois d'une autre
 * phrase (jamais d'une méthode suivante : elles se découvrent dans l'ordre, et chacune attend la méthode
 * d'avant à METHOD_GATE exemplaires ; jamais d'un indice dont le livre rare n'est pas trouvé), parfois un
 * morceau déjà écrit ; rarement une phrase entière. `lucky` : la toute première
 * trouvaille, la phrase entière de la première méthode (la Lecture Diagonale), qui se découvre d'un coup.
 */
export const drawFind = (state: GameState, random: () => number, lucky = false): Find => {
  const target = findableTarget(state);
  if (lucky && target) return { kind: 'sentence', sentence: target };
  const kind = drawKind(random);
  // Seule la méthode en cours se trouve : les suivantes attendent leur tour.
  const open = SENTENCES.filter(
    (sentence) =>
      !isComplete(state, sentence.id) && (sentence.kind !== 'method' || sentence.id === target) && hintFindable(state, sentence.id),
  ).map((sentence) => sentence.id);
  const started = startedSentences(state);
  if (open.length === 0 || (kind !== 'sentence' && started.length > 0 && random() < duplicateShare(state)))
    return repeatFind(state, started, random);
  const sentence = target && random() < targetShare(state) ? target : pick(open, random);
  if (kind === 'sentence') return { kind, sentence };
  return missingSegment(state, sentence, kind, random);
};

/**
 * Une trouvaille en plus, au-delà de 100 % (EXTRA_FIND_SHARES) : un morceau de la méthode en cours, d'un
 * indice ou d'un souvenir, chacun à sa part ; sinon (ou s'il n'y a rien à y trouver), un morceau déjà écrit.
 */
export const drawExtraFind = (state: GameState, random: () => number): Find => {
  const roll = random();
  const { method, hint, memory } = EXTRA_FIND_SHARES;
  const target = findableTarget(state);
  const pool =
    roll < method
      ? target
        ? [target]
        : []
      : roll < method + hint
        ? SENTENCES.filter((sentence) => sentence.family === 'hints' && hintFindable(state, sentence.id)).map((s) => s.id)
        : roll < method + hint + memory
          ? SENTENCES.filter((sentence) => sentence.kind === 'memory').map((s) => s.id)
          : [];
  const open = pool.filter((id) => !isComplete(state, id));
  if (open.length > 0) return missingSegment(state, pick(open, random), drawKind(random), random);
  return repeatFind(state, startedSentences(state), random);
};

/** La page tournée cache-t-elle une trouvaille ? Rien n'est gagné tant qu'elle n'est pas lue (gainFind). */
export const rollFind = (state: GameState, random: () => number = Math.random): Find | undefined => rollFinds(state, random)[0];

/**
 * Les trouvailles d'une page. Au-delà de 100 %, la chance en garantit : 554 %, c'est 5 trouvailles, et
 * 54 % de chances d'une sixième (idée de l'auteur). En dessous, une au plus, comme avant (mêmes tirages).
 */
export const rollFinds = (state: GameState, random: () => number = Math.random): Find[] => {
  const chance = chanceNow(state);
  const count = Math.floor(chance) + (random() < chance % 1 ? 1 : 0);
  // Chacune est tirée comme si les précédentes étaient déjà écrites (rien n'est gagné avant la lecture) :
  // pas deux fois le même morceau sur une page, comme hors-ligne (findWhileAway).
  const draft: GameState = { ...state, written: { ...state.written } };
  return Array.from({ length: count }, (_, index) => {
    // La première suit la règle d'avant ; celles d'au-delà de 100 %, leur table (drawExtraFind).
    const find = index === 0 ? drawFind(draft, random, firstMethodLost(state)) : drawExtraFind(draft, random);
    if (!find.duplicate)
      write(draft, find.sentence, find.segment === undefined ? segments(find.sentence).map((_, i) => i) : [find.segment]);
    return find;
  });
};

/** Texte surligné dans la page : le morceau (sans sa ponctuation finale), ou la phrase entière. */
export const findText = (find: Find): string => {
  const texts = segments(find.sentence);
  if (find.segment === undefined) return texts.join(' ');
  return texts[find.segment]?.replace(/[\s,;:.]+$/, '') ?? '';
};

/** Une trouvaille lue : 1 point de Connaissance (plus, avec l'Etherium), et elle s'écrit dans le livre blanc. */
export const gainFind = (state: GameState, find: Find): void => {
  const gained = knowledgePerFind(state);
  state.knowledge += gained;
  state.cycleKnowledge += gained;
  state.lifetimeKnowledge += gained;
  state.stats.fragments += 1;
  state.finds.push(find);
  // La toute première : le joueur comprend une phrase, pour la première fois.
  if (state.lifetimeKnowledge === gained) tellLore(state, 'firstKnowledge');
  if (find.duplicate) return;
  write(state, find.sentence, find.segment === undefined ? segments(find.sentence).map((_, index) => index) : [find.segment]);
};

/**
 * Pages tournées seules pendant `seconds` d'absence (ou de modale) : au rythme de la production, plafonné
 * comme à l'écran (en feuilles), sur 8 h au plus (et le Sommeil profond). Rien si les pages ne tournent pas seules.
 */
export const pagesTurnedAway = (state: GameState, seconds: number): number => {
  if (!state.settings.autoTurn || seconds <= 0) return 0;
  return Math.min(pagesPerSecond(state), maxTurnsPerSecond(state) * PAGES_PER_LEAF) * Math.min(seconds, maxAwaySeconds(state));
};

/**
 * Absence (onglet fermé ou caché) : les pages tournées seules (pagesTurnedAway), dont on compte la part
 * `share`, cachent leurs trouvailles comme les autres. Renvoie le nombre trouvé.
 */
export const findWhileAway = (state: GameState, seconds: number, random: () => number = Math.random, share = 1): number => {
  const turned = pagesTurnedAway(state, seconds) * share;
  if (turned <= 0) return 0;
  // Nombre attendu, arrondi au hasard : la moyenne est juste, et une courte absence peut rapporter.
  // Une par page au plus suit la règle d'avant ; au-delà de 100 %, les autres suivent leur table.
  const chance = findChance(state);
  const count = Math.floor(turned * Math.min(1, chance) + random());
  const extra = chance > 1 ? Math.floor(turned * (chance - 1) + random()) : 0;
  for (let i = 0; i < count; i++) gainFind(state, drawFind(state, random));
  for (let i = 0; i < extra; i++) gainFind(state, drawExtraFind(state, random));
  return count + extra;
};

/** Débogage : de la Connaissance sans rien trouver. */
export const addKnowledge = (state: GameState, amount: number): void => {
  state.knowledge += amount;
  state.cycleKnowledge += amount;
  state.lifetimeKnowledge += amount;
};
