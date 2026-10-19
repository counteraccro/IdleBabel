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
import { ETHER_READING } from '../src/data/etherium';
import { PLAYER } from './config';
import { etherCounted as weighed } from '../src/systems/etherium';
import { sealCount } from './sceaux';
import { BIT, DIGITAL_AGE, keptMethods, methodSequence, SECRET, type Method } from './methodes';
import { EFFECT, S } from '../src/data/etheriumStars';
import { SENTENCES } from '../src/data/sentences';
import { lit, product, relicBonus, sum, type Life } from './vie';
import { letterAverage } from './lettre';
import { MIMIC_BONUS, MIMIC_EVERY, MIMIC_SLOW_CAP } from '../src/data/mimic';
import { LOTTERY_BOONS, LOTTERY_CURSES, LOTTERY_STARS, RELIC_TOKEN_ODDS } from '../src/data/lottery';
import { countLast, drawn, tickTasks } from './taches';

/** Une partie, du réveil au prestige. */
export interface Run {
  life: Life;
  methods: Method[];
  /** Secondes de jeu depuis le réveil, absences comprises. */
  t: number;
  /** Secondes de jeu à l'écran depuis le réveil (sans les absences). */
  played: number;
  pages: number;
  /** Pages lues dans cette partie (elles s'ajoutent aux pages à vie au prestige). */
  read: number;
  knowledge: number;
  /** Connaissance gagnée dans cette partie (la Porte en rend 10 % au réveil suivant). */
  knowledgeGained: number;
  owned: Record<string, number>;
  unlocked: Set<string>;
  /** Morceaux trouvés de chaque phrase de méthode. */
  pieces: Record<string, number>;
  levels: Record<string, number>;
  turned: number;
  /** Pages lues par chaque méthode dans cette partie (leurs sceaux). */
  methodPages: Record<string, number>;
  /** Quand chaque méthode a été achetée la première fois (secondes depuis le réveil). */
  firstBought: Record<string, number>;
  /** Pages tournées depuis le dernier clic (la tâche « 41 livres sans tourner à la main »). */
  turnedNoHand: number;
  /** Connaissance trouvée par seconde, la dernière fois (ce que rend « 1 jour de Connaissance »). */
  knowledgeRate: number;
}

export const newRun = (life: Life): Run => {
  const run: Run = {
    life,
    methods: methodSequence(life),
    t: 0,
    played: 0,
    pages: 0,
    read: 0,
    knowledge: 0,
    knowledgeGained: 0,
    owned: {},
    unlocked: new Set(keptMethods(life)),
    pieces: {},
    levels: {},
    turned: 0,
    methodPages: {},
    firstBought: {},
    turnedNoHand: 0,
    knowledgeRate: 0,
  };
  if (life.secretFound) run.unlocked.add(SECRET.id);
  if (life.bitFound) run.unlocked.add(BIT.id);
  // La Porte : des méthodes au réveil (et leur phrase, sans quoi elles ne serviraient à rien).
  const give = (id: string, count: number): void => {
    if (count < 1) return;
    run.owned[id] = (run.owned[id] ?? 0) + count;
    run.unlocked.add(id);
  };
  give('diagonal', sum(life, EFFECT.diagonals));
  if (lit(life, S.fingers)) give('finger', 10);
  if (lit(life, S.arch)) for (const [id, count] of Object.entries(life.previous.owned)) give(id, Math.floor(count / 100));
  run.pages =
    Math.max(
      0,
      ...Object.entries(EFFECT.previousPages)
        .filter(([id]) => lit(life, id))
        .map(([, share]) => share),
    ) * life.previous.read;
  if (lit(life, S.previousKnowledge)) run.knowledge = life.previous.knowledge / 10;
  // La Chouette : le 1er niveau de chaque intuition reste ; la Loupe : un niveau de Filtre sémantique offert.
  if (lit(life, S.crestLeft)) for (const [id, n] of Object.entries(life.previous.levels)) if (n > 0) run.levels[id] = 1;
  if (lit(life, S.filter)) run.levels.semanticFilter = (run.levels.semanticFilter ?? 0) + 1;
  return run;
};

const level = (run: Run, id: string): number => run.levels[id] ?? 0;

/** Le Bit se cherche une fois son étoile allumée (la 1re de l'alvéole Numérique de la Ruche). */
const BIT_STAR = SENTENCES.find((sentence) => sentence.id === 'bit')?.secret ?? '';
const bitSought = (life: Life): boolean => PLAYER.bit && lit(life, BIT_STAR);

export const allMethods = (run: Run): Method[] => [...run.methods, SECRET, ...(bitSought(run.life) ? [BIT] : [])];

/** L'Éther reçu depuis toujours : +1 % de lecture chacun (méthodes et feuille tournée à la main). */
const etherReading = (run: Run): number => (PLAYER.etherReading ? 1 + ETHER_READING * etherCounted(run.life) : 1);

/** L'Éther reçu tel que la lecture le compte : sous le poids de la Bibliothèque (celui du jeu), ou tout (--sans-poids). */
const etherCounted = (life: Life): number => (PLAYER.weight ? weighed(life.etherReceived, sum(life, EFFECT.weight)) : life.etherReceived);

/**
 * Ce que lit une méthode ; `away` : sans la Transe de la lettre ni la Mimic (ni l'une ni l'autre ne vient pendant
 * l'absence, et le bot attrape la Mimic avant de fermer le jeu). Tant qu'elle est là, la Mimic ralentit la lecture.
 */
export const rate = (run: Run, method: Method, away = false): number =>
  method.pagesPerSecond *
  (method.gesture ? GESTURE_BONUS ** level(run, method.gesture) : 1) *
  product(run.life, EFFECT.readingRate) *
  (method.age === DIGITAL_AGE ? product(run.life, EFFECT.digitalReading) : 1) *
  (method.age === undefined ? 1 + sum(run.life, EFFECT.firstAgeReading) : 1) *
  etherReading(run) *
  (1 + run.life.tasks.readingBonus) *
  (away ? 1 : letterAverage(run).reading * mimicSlow(run.life));

export const pagesPerSecond = (run: Run, away = false): number =>
  allMethods(run).reduce((total, method) => total + (run.owned[method.id] ?? 0) * rate(run, method, away), 0);

const findChance = (run: Run, away = false): number =>
  BASE_FIND_CHANCE *
  FILTER_BONUS ** level(run, 'semanticFilter') *
  (1 + SEAL_FIND_BONUS * sealCount(run)) *
  product(run.life, EFFECT.findChance) *
  (away ? 1 : letterAverage(run).finds);

const turnsCap = (run: Run): number =>
  SPEED_LEVELS[Math.min(level(run, 'speedReading'), SPEED_LEVELS.length - 1)] + sum(run.life, EFFECT.turns);

/** La phrase de méthode qui se trouve en ce moment : la première pas trouvée, si la précédente a assez d'exemplaires. */
const target = (run: Run): Method | undefined => {
  const index = run.methods.findIndex((method) => !run.unlocked.has(method.id));
  if (index < 0) return undefined;
  if (index === 0) return run.methods[0];
  const previous = run.methods[index - 1];
  const firstOfAge = run.methods[index].age !== previous.age;
  if (firstOfAge && PLAYER.automaticGate === 'âge') return run.methods[index];
  return (run.owned[previous.id] ?? 0) >= METHOD_GATE ? run.methods[index] : undefined;
};

/** Des morceaux trouvés : la phrase se complète, ou se devine pour 10 de Connaissance quand il n'en manque qu'un. */
const progress = (run: Run, method: Method, found: number): void => {
  run.pieces[method.id] = (run.pieces[method.id] ?? 0) + found;
  const pieces = run.pieces[method.id];
  if (pieces >= method.pieces) run.unlocked.add(method.id);
  else if (pieces >= method.pieces - (lit(run.life, S.beak) ? 2 : 1) && run.knowledge >= GUESS_PRICE) {
    run.knowledge -= GUESS_PRICE;
    run.unlocked.add(method.id);
  }
  if (method === SECRET && run.unlocked.has(SECRET.id)) run.life.secretFound = true;
  if (method === BIT && run.unlocked.has(BIT.id)) run.life.bitFound = true;
};

/**
 * La Mimic (11/10) : une par heure de jeu à l'écran en moyenne (les dents du haut la font venir plus souvent) ; le bot la
 * laisse manger PLAYER.mimicMinutes puis l'attrape, et toujours avant de fermer le jeu. Elle rend tout avec le bonus
 * (10 %, et les dents du bas) : en moyenne, une Connaissance ×(1 + bonus × part du temps où elle est là), un peu en
 * retard (négligé).
 */
const mimicEvery = (life: Life): number =>
  MIMIC_EVERY / Math.max(1, ...Object.entries(EFFECT.mimicComes).map(([id, v]) => (lit(life, id) ? v : 0)));
const mimicStay = (): number => PLAYER.mimicMinutes * 60;
/** Part du temps à l'écran où une Mimic est là. */
const mimicPresence = (life: Life): number => (lit(life, S.mimic) ? mimicStay() / (mimicEvery(life) + mimicStay()) : 0);
/** Ce qu'elle rend en plus de ce qu'elle a avalé. */
const mimicGives = (life: Life): number =>
  MIMIC_BONUS + Math.max(0, ...Object.entries(EFFECT.mimicGives).map(([id, v]) => (lit(life, id) ? v : 0)));
/** La lecture des méthodes, en moyenne : −(ce qu'elle rendra en plus, 50 % au plus) pendant qu'elle est là. */
const mimicSlow = (life: Life): number => 1 - mimicPresence(life) * Math.min(MIMIC_SLOW_CAP, mimicGives(life));

/** Pages tournées pendant `seconds` : les trouvailles qu'elles cachent, la Connaissance et les phrases des méthodes. */
const find = (run: Run, turned: number, away = false): void => {
  const chance = findChance(run, away);
  const finds = turned * chance;
  // La Loupe : des connaissances garanties en plus, à chaque trouvaille.
  const found =
    finds * (product(run.life, EFFECT.knowledge) * (away ? 1 : letterAverage(run).knowledge) + relicBonus(run.life, 'loupe', 0));
  const mimicBonus = away ? 0 : found * mimicGives(run.life) * mimicPresence(run.life);
  run.life.mimic.bonus += mimicBonus;
  const knowledge = (found + mimicBonus) * (1 + run.life.tasks.knowledgeBonus);
  countLast(run.life, 'knowledge', knowledge);
  run.knowledge += knowledge;
  run.knowledgeGained += knowledge;
  run.life.finds += finds;
  run.life.knowledge += knowledge;
  run.life.turned += turned;
  // Toute première trouvaille : la phrase entière de la Lecture Diagonale, entre la 15e et la 30e page.
  const before = run.turned;
  run.turned += turned;
  const lucky = (LUCK_PAGES.from + LUCK_PAGES.to) / 2;
  if (before < lucky && run.turned >= lucky) run.unlocked.add('diagonal');
  const duplicates = Math.max(0, DUPLICATE_SHARE - MEMORY_STEP * level(run, 'sentenceMemory') - sum(run.life, EFFECT.duplicates));
  const share = Math.min(1, TARGET_SHARE + ARIADNE_STEP * level(run, 'ariadne') + sum(run.life, EFFECT.aim));
  const towardTarget = turned * (Math.min(1, chance) * (1 - duplicates) * share + Math.max(0, chance - 1) * EXTRA_FIND_SHARES.method);
  const current = target(run);
  // Comme dans le jeu : la phrase de la Page Cornée (souvenir flou) partage à parts égales les trouvailles de la
  // méthode en cours ; seule, chacune prend tout. Le Bit pareil (proposé), à parts égales avec elles.
  const secrets = [
    ...(lit(run.life, S.cornee) && !run.unlocked.has(SECRET.id) ? [SECRET] : []),
    ...(bitSought(run.life) && !run.unlocked.has(BIT.id) ? [BIT] : []),
  ];
  const part = towardTarget / ((current ? 1 : 0) + secrets.length || 1);
  if (current) progress(run, current, part);
  for (const secret of secrets) progress(run, secret, part);
};

const gain = (run: Run, pages: number): void => {
  run.pages += pages;
  run.read += pages;
  countLast(run.life, 'pages', pages);
};

/** Des jetons de plus (la Mimic, les tâches), joués dès qu'il y en a un entier : ce que rapportent les tirages, en moyenne. */
const addTokens = (run: Run, tokens: number, pps: number): void => {
  const lottery = run.life.lottery;
  const before = lottery.draws;
  lottery.tokens += tokens;
  lottery.draws = Math.floor(lottery.tokens);
  if (lottery.draws > 0) lottery.openedAt ??= run.life.clock;
  // Le Jeton : une chance sur 50 par tirage, compté trouvé au 50e (le bot le pose à son prochain réveil, takeRelics).
  if (lottery.draws >= 1 / RELIC_TOKEN_ODDS && !run.life.relics.has('token')) {
    run.life.relics.add('token');
    lottery.tokenAt = run.life.clock;
  }
  for (let i = before; i < lottery.draws; i++) drawn(run.life);
  // Autant de secondes de la production du moment.
  gain(run, pps * lotteryAverage(run.life) * (lottery.draws - before));
};

/**
 * Les jetons du jour du Jeton (18/10), s'il agit : sa part de la journée ; une absence de plus d'un jour n'en donne
 * qu'un (ceux d'un jour pas joué sont perdus à minuit).
 */
const dailyTokens = (run: Run, seconds: number, pps: number): void => {
  if (run.life.relic !== 'token') return;
  const tokens = (relicBonus(run.life, 'token', 0) * Math.min(seconds, DAY_SECONDS)) / DAY_SECONDS;
  run.life.lottery.daily += tokens;
  addTokens(run, tokens, pps);
};
const DAY_SECONDS = 86_400;

/** Ce que les tâches rendent : des jetons, des heures de lecture, des heures de Connaissance (au rythme du moment). */
const tasksFor = (run: Run, seconds: number, onScreen: boolean): void => {
  const pps = pagesPerSecond(run, !onScreen);
  tickTasks(run, seconds, onScreen, {
    tokens: (n) => addTokens(run, n, pps),
    pages: (s) => gain(run, pps * s),
    knowledge: (s) => {
      run.knowledge += run.knowledgeRate * s;
      run.knowledgeGained += run.knowledgeRate * s;
      run.life.knowledge += run.knowledgeRate * s;
    },
  });
};

/** Ce que chaque méthode a lu pendant `seconds` (part `share` de sa lecture) : les sceaux de ses pages. */
const credit = (run: Run, seconds: number, share = 1, away = false): void => {
  for (const method of allMethods(run)) {
    const read = (run.owned[method.id] ?? 0) * rate(run, method, away) * seconds * share;
    if (read <= 0) continue;
    run.methodPages[method.id] = (run.methodPages[method.id] ?? 0) + read;
    run.life.methodPages += read;
  }
};

/** Une seconde de jeu, ou `seconds` d'un coup (au-delà de la première heure, la partie change lentement). */
export const play = (run: Run, seconds: number): void => {
  const pps = pagesPerSecond(run);
  const letter = letterAverage(run);
  const clicking = run.t < PLAYER.clickMinutes * 60 ? PLAYER.clicksPerSecond : 0;
  const perClick =
    (2 * etherReading(run) * letter.fourTen + pps * (MUSCLE_STEP * level(run, 'muscleMemory') + sum(run.life, EFFECT.clickShare))) *
    product(run.life, EFFECT.click) *
    letter.clicks;
  // La lettre : l'Éclair (des secondes de lecture d'un coup) et le mot BABEL (une part des pages en réserve).
  gain(run, (pps * (1 + letter.flash) + clicking * perClick) * seconds + run.pages * letter.word * seconds);
  credit(run, seconds);
  run.life.clicks += clicking * seconds;
  run.life.handPages += clicking * perClick * seconds;
  run.life.bestSpeed = Math.max(run.life.bestSpeed, pps);
  // L'Annulaire : ×2 chance de trouvaille sur les pages tournées à la main (comme deux fois plus de pages).
  const knownBefore = run.knowledgeGained;
  const sheets = (Math.min(pps, turnsCap(run) * 2) + clicking * 2 * (lit(run.life, S.ring) ? 2 : 1)) * seconds;
  find(run, sheets);
  run.knowledgeRate = (run.knowledgeGained - knownBefore) / seconds;
  run.turnedNoHand = clicking > 0 ? 0 : run.turnedNoHand + sheets;
  run.life.tasks.untouched = clicking > 0 ? 0 : run.life.tasks.untouched + seconds;
  if (lit(run.life, S.mimic)) {
    const caught = seconds / (mimicEvery(run.life) + mimicStay());
    run.life.mimic.caught += caught;
    run.life.mimic.seconds += seconds * mimicPresence(run.life);
    // Ses jetons (le levier de la Loterie : plus souvent), joués dès qu'il y en a un entier.
    const level = Math.max(0, ...Object.entries(EFFECT.lotteryToken).map(([id, v]) => (lit(run.life, id) ? v : 0)));
    addTokens(run, caught * LOTTERY_STARS.token[level], pps);
  }
  dailyTokens(run, seconds, pps);
  run.t += seconds;
  run.played += seconds;
  run.life.clock += seconds;
  tasksFor(run, seconds, true);
};

/** Part de la production que lit la méthode visée par « une méthode ×10 » (au hasard) ou arrêtée (la meilleure). */
const ONE_METHOD = 0.2;
const BEST_METHOD = 0.5;

/**
 * Un jeton joué (17/10), en moyenne : les secondes de production qu'il rapporte, ou coûte. Le gain (lecture d'absence),
 * ce que les bonus ajoutent pendant leur durée, ce que les malus ôtent (÷2, la meilleure méthode arrêtée, la Mimic dorée
 * qui mange tout), avec les étoiles de la page « La Loterie ». Approché : les bonus en cours qui ne se retirent pas, et
 * la Connaissance du gain, n'y sont pas.
 */
const lotteryAverage = (life: Life): number => {
  const level = (effect: Record<string, number>): number =>
    Math.max(0, ...Object.entries(effect).map(([id, v]) => (lit(life, id) ? v : 0)));
  const time = level(EFFECT.lotteryTime);
  const value = level(EFFECT.lotteryValue);
  const luck = level(EFFECT.lotteryLuck);
  const odds = Object.fromEntries(Object.entries(LOTTERY_STARS.luck).map(([id, by]) => [id, by[luck] / 100]));
  const weights = (list: readonly { weight: number }[]) => list.reduce((total, one) => total + one.weight, 0);
  const boost = LOTTERY_STARS.value.boost[value];
  const boons =
    LOTTERY_BOONS.reduce((total, one) => total + one.weight * (one.factor - 1) * boost * (one.id === 'method10' ? ONE_METHOD : 1), 0) /
    weights(LOTTERY_BOONS);
  const half = 1 - 1 / LOTTERY_STARS.value.half[value];
  const { gain: gainSeconds, boon, curse, golden } = LOTTERY_STARS.time;
  const curses =
    LOTTERY_CURSES.reduce(
      (total, one) => total + one.weight * (one.id === 'golden' ? golden[time] : curse[time] * (one.id === 'half' ? half : BEST_METHOD)),
      0,
    ) / weights(LOTTERY_CURSES);
  return odds.gain * gainSeconds[time] + odds.boon * boon[time] * boons - odds.curse * curses;
};

/** Le jeu fermé pendant `seconds` : la lecture comptée en partie, sur 8 h au plus (et le Sommeil profond). */
export const away = (run: Run, seconds: number): void => {
  const counted = Math.min(seconds, MAX_AWAY_SECONDS + SLEEP_STEP * level(run, 'deepSleep') + 3600 * sum(run.life, EFFECT.awayHours));
  const share = Math.min(1, AWAY_SHARE + RETURN_STEP * level(run, 'returnMap') + sum(run.life, EFFECT.awayShare));
  const pps = pagesPerSecond(run, true);
  gain(run, pps * share * counted);
  credit(run, counted, share, true);
  // La Lune : les trouvailles de l'absence en entier (Pointe haute), deux fois plus de feuilles comptées (l'étoile voisine).
  const sheets = Math.min(pps, turnsCap(run) * 2 * (lit(run.life, S.awayTurns) ? 2 : 1));
  find(run, sheets * (lit(run.life, S.awayFinds) ? 1 : share) * counted, true);
  dailyTokens(run, seconds, pps);
  run.t += seconds;
  run.life.clock += seconds;
  run.life.tasks.longestAway = Math.max(run.life.tasks.longestAway, seconds);
  tasksFor(run, seconds, false);
};

export const price = (run: Run, method: Method): number =>
  method.baseCost * COST_GROWTH ** (run.owned[method.id] ?? 0) * BARGAIN_FACTOR ** level(run, 'bargain') * letterAverage(run).price;

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
    run.life.tasks.bought[best.id] = (run.life.tasks.bought[best.id] ?? 0) + 1;
    run.firstBought[best.id] ??= run.t;
  }
};
