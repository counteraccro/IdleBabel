import { COST_GROWTH } from '../src/data/tools';
import {
  ARIADNE_STEP,
  BARGAIN_FACTOR,
  FILTER_BONUS,
  GESTURE_BONUS,
  MEMORY_STEP,
  MUSCLE_STEP,
  RETURN_STEP,
  SLEEP_STEP,
  SPEED_LEVELS,
} from '../src/data/technologies';
import {
  AWAY_SHARE,
  BASE_FIND_CHANCE,
  DUPLICATE_SHARE,
  EXTRA_FIND_SHARES,
  GUESS_PRICE,
  LUCK_PAGES,
  MAX_AWAY_SECONDS,
  METHOD_GATE,
  SEAL_FIND_BONUS,
  TARGET_SHARE,
} from '../src/data/knowledge';
import { PLAYER } from './config';
import { keptMethods, methodSequence, SECRET, type Method } from './methodes';
import { treeValue, type Life } from './vie';

/** Une partie, du réveil au prestige. */
export interface Run {
  life: Life;
  methods: Method[];
  /** Secondes de jeu depuis le réveil, absences comprises. */
  t: number;
  pages: number;
  /** Pages lues dans cette partie (elles s'ajoutent aux pages à vie au prestige). */
  read: number;
  knowledge: number;
  owned: Record<string, number>;
  unlocked: Set<string>;
  /** Morceaux trouvés de chaque phrase de méthode. */
  pieces: Record<string, number>;
  levels: Record<string, number>;
  turned: number;
  /** Quand chaque méthode a été achetée la première fois (secondes depuis le réveil). */
  firstBought: Record<string, number>;
}

export const newRun = (life: Life): Run => {
  const run: Run = {
    life,
    methods: methodSequence(life),
    t: 0,
    pages: 0,
    read: 0,
    knowledge: 0,
    owned: {},
    unlocked: new Set(keptMethods(life)),
    pieces: {},
    levels: {},
    turned: 0,
    firstBought: {},
  };
  if (life.secretFound) run.unlocked.add(SECRET.id);
  // Départ : des Lectures Diagonales au réveil (et sa phrase, sans quoi elles ne serviraient à rien).
  const start = treeValue(life, 'start', 0);
  if (start > 0) {
    run.owned.diagonal = start;
    run.unlocked.add('diagonal');
  }
  return run;
};

const level = (run: Run, id: string): number => run.levels[id] ?? 0;

const allMethods = (run: Run): Method[] => [...run.methods, SECRET];

const rate = (run: Run, method: Method): number =>
  method.pagesPerSecond * (method.gesture ? GESTURE_BONUS ** level(run, method.gesture) : 1) * treeValue(run.life, 'reading', 1);

export const pagesPerSecond = (run: Run): number =>
  allMethods(run).reduce((total, method) => total + (run.owned[method.id] ?? 0) * rate(run, method), 0);

const findChance = (run: Run): number =>
  BASE_FIND_CHANCE * FILTER_BONUS ** level(run, 'semanticFilter') * (1 + SEAL_FIND_BONUS * PLAYER.seals) * treeValue(run.life, 'finds', 1);

const turnsCap = (run: Run): number => SPEED_LEVELS[Math.min(level(run, 'speedReading'), SPEED_LEVELS.length - 1)];

/** La phrase de méthode qui se trouve en ce moment : la première pas trouvée, si la précédente a assez d'exemplaires. */
const target = (run: Run): Method | undefined => {
  const index = run.methods.findIndex((method) => !run.unlocked.has(method.id));
  if (index < 0) return undefined;
  if (index === 0) return run.methods[0];
  const previous = run.methods[index - 1];
  const firstAutomatic = !run.methods[index].manual && previous.manual;
  if (firstAutomatic && PLAYER.automaticGate === 'âge') return run.methods[index];
  return (run.owned[previous.id] ?? 0) >= METHOD_GATE ? run.methods[index] : undefined;
};

/** Des morceaux trouvés : la phrase se complète, ou se devine pour 10 de Connaissance quand il n'en manque qu'un. */
const progress = (run: Run, method: Method, found: number): void => {
  run.pieces[method.id] = (run.pieces[method.id] ?? 0) + found;
  const pieces = run.pieces[method.id];
  if (pieces >= method.pieces) run.unlocked.add(method.id);
  else if (pieces >= method.pieces - 1 && run.knowledge >= GUESS_PRICE) {
    run.knowledge -= GUESS_PRICE;
    run.unlocked.add(method.id);
  }
  if (method === SECRET && run.unlocked.has(SECRET.id)) run.life.secretFound = true;
};

/** Pages tournées pendant `seconds` : les trouvailles qu'elles cachent, la Connaissance et les phrases des méthodes. */
const find = (run: Run, turned: number): void => {
  const chance = findChance(run);
  const finds = turned * chance;
  run.knowledge += finds * treeValue(run.life, 'knowledge', 1);
  // Toute première trouvaille : la phrase entière de la Lecture Diagonale, entre la 15e et la 30e page.
  const before = run.turned;
  run.turned += turned;
  const lucky = (LUCK_PAGES.from + LUCK_PAGES.to) / 2;
  if (before < lucky && run.turned >= lucky) run.unlocked.add('diagonal');
  const duplicates = Math.max(0, DUPLICATE_SHARE - MEMORY_STEP * level(run, 'sentenceMemory'));
  const share = Math.min(1, TARGET_SHARE + ARIADNE_STEP * level(run, 'ariadne'));
  const towardTarget = turned * (Math.min(1, chance) * (1 - duplicates) * share + Math.max(0, chance - 1) * EXTRA_FIND_SHARES.method);
  const current = target(run);
  if (current) progress(run, current, towardTarget);
  // Hypothèse : la phrase de la Page Cornée (souvenir flou) se trouve aussi vite que celle de la méthode en cours.
  if (run.life.nodes.secretManual > 0 && !run.unlocked.has(SECRET.id)) progress(run, SECRET, towardTarget);
};

const gain = (run: Run, pages: number): void => {
  run.pages += pages;
  run.read += pages;
};

/** Une seconde de jeu, ou `seconds` d'un coup (au-delà de la première heure, la partie change lentement). */
export const play = (run: Run, seconds: number): void => {
  const pps = pagesPerSecond(run);
  const clicking = run.t < PLAYER.clickMinutes * 60 ? PLAYER.clicksPerSecond : 0;
  const perClick = (2 + pps * MUSCLE_STEP * level(run, 'muscleMemory')) * treeValue(run.life, 'hands', 1);
  gain(run, (pps + clicking * perClick) * seconds);
  find(run, (Math.min(pps, turnsCap(run) * 2) + clicking * 2) * seconds);
  run.t += seconds;
  run.life.clock += seconds;
};

/** Le jeu fermé pendant `seconds` : la lecture comptée en partie, sur 8 h au plus (et le Sommeil profond). */
export const away = (run: Run, seconds: number): void => {
  const counted = Math.min(seconds, MAX_AWAY_SECONDS + SLEEP_STEP * level(run, 'deepSleep'));
  const share = Math.min(1, AWAY_SHARE + RETURN_STEP * level(run, 'returnMap'));
  const pps = pagesPerSecond(run);
  gain(run, pps * share * counted);
  find(run, Math.min(pps, turnsCap(run) * 2) * share * counted);
  run.t += seconds;
  run.life.clock += seconds;
};

const price = (run: Run, method: Method): number =>
  method.baseCost * COST_GROWTH ** (run.owned[method.id] ?? 0) * BARGAIN_FACTOR ** level(run, 'bargain');

/** Le bot achète la méthode qui se rembourse le plus vite (en comptant l'attente pour se l'offrir), tant qu'il peut. */
export const buyMethods = (run: Run): void => {
  for (;;) {
    const income = Math.max(pagesPerSecond(run), 1);
    let best: Method | undefined;
    let bestScore = Infinity;
    for (const method of allMethods(run)) {
      if (!run.unlocked.has(method.id)) continue;
      const cost = price(run, method);
      const score = cost / rate(run, method) + Math.max(0, cost - run.pages) / income;
      if (score < bestScore) [best, bestScore] = [method, score];
    }
    if (!best || price(run, best) > run.pages) return;
    run.pages -= price(run, best);
    run.owned[best.id] = (run.owned[best.id] ?? 0) + 1;
    run.firstBought[best.id] ??= run.t;
  }
};
