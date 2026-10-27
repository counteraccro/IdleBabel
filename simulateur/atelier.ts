/**
 * Simulateur de l'atelier des curiosités (l'auteur, 27/10 : « on passe aux curiosités, lance la simulation »), avec les
 * règles de .ai/plan-curiosites.md et de la maquette validée (.ai/maquette-atelier-interface.html). L'atelier ne dépend
 * pas de la vitesse de lecture (une curiosité par heure de jeu au plus) : il est simulé seul, sans le reste du jeu.
 *
 *   npm run simule:atelier                       2 000 joueurs, 120 jours, 4 h de jeu par jour, une visite par heure
 *   npm run simule:atelier -- --jours=60 --jeu=8 --visite=30 --joueurs=500
 *
 * Le bot : il garde au lutrin les trois meilleures (familles différentes) et un livre « cible » qu'il mène jusqu'à A,
 * détruit tout le reste à chaque visite (les livres à pièce S compris, pour la récupérer), dépense les pages de
 * réemploi sur la cible puis sur le lutrin, monte un set complet sur la cible dès qu'elle est A, et occupe les presses :
 * pièces S du lutrin, puis celles du carnet, puis de meilleures pièces ordinaires sur le lutrin. Les presses tournent
 * aussi jeu fermé, mais rien n'y est lancé ; les curiosités n'arrivent que pendant le jeu.
 */

const option = (name: string): string | undefined => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];

const DAYS = Number(option('jours') ?? 120);
const PLAY_HOURS = Number(option('jeu') ?? 4);
const VISIT_MIN = Number(option('visite') ?? 60);
const PLAYERS = Number(option('joueurs') ?? 2000);
const STEP = 10;

// Les règles de la maquette.
const RANK_ODDS = [41, 25, 15, 10, 6, 3];
const POINTS = [1, 2, 4, 8, 16, 32, 64];
// Essai 2 (27/10) : le prix des rangs doublé (2, 4, 8, 16, 32 dans la maquette).
const NEED = [4, 8, 16, 32, 64];
/** Essai 2 : au démontage, une pièce ordinaire sur deux part en miettes ; restaurer en prend deux ; bonus S d'un tiers en moins. */
const KEEP_ORDINARY = 1 / 2;
const RESTORE_COST = 2;
const S_BONUS = 2 / 3;
/** Essai 3 : monter un set coûte des pages de réemploi, restaurer une pièce S aussi (selon son état), en plus des pièces. */
const SET_COST = 64;
const RESTORE_PAGES = [8, 16, 32];
const STATE_ODDS = [35, 35, 25, 5];
const STATE_MULT = [0.4, 0.7, 1, 1.3];
const S_STATE_ODDS = [60, 30, 10, 0];
const MOUNT_MIN = [30, 60, 120, 240];
const RESTORE_MIN = [120, 240, 480];
const SETS = 8;
const PARTS = 4;
const FAMILIES = 10;
const ETHER = 9;

/** Les réglages de la constellation « L'atelier » : sans étoile, et toutes au plus haut. */
type Rules = { sChance: number; arrivalMin: number; damage: number; better: number; restore: number; presses: number };
const BASE: Rules = { sChance: 1 / 10, arrivalMin: 60, damage: 1 / 4, better: 0, restore: 1, presses: 2 };
const MAX: Rules = { sChance: 1 / 5, arrivalMin: 30, damage: 1 / 10, better: 1 / 3, restore: 0.5, presses: 3 };

type Piece = { st: number; set?: number };
type Book = { rank: number; family: number; parts: Piece[]; set?: number; startRank: number };
type Job = { left: number; done: () => void };

const pick = (odds: number[]): number => {
  let r = Math.random() * odds.reduce((a, b) => a + b, 0);
  for (let i = 0; i < odds.length; i++) if ((r -= odds[i]) < 0) return i;
  return odds.length - 1;
};
const clamp = (n: number): number => Math.max(0, Math.min(3, n));
const bookState = (b: Book): number => Math.floor(b.parts.reduce((s, p) => s + p.st, 0) / PARTS);
const hasS = (b: Book): boolean => b.rank < 6 && b.parts.some((p) => p.set !== undefined);
/** Ce que vaut un livre au lutrin : son rang et son état (le bot ne regarde pas les familles de plus près). */
const worth = (b: Book): number => (b.rank + 1) * STATE_MULT[bookState(b)];
const mainFamily = (b: Book): number => (b.rank === 6 ? 100 + b.set! : b.family);

type Result = {
  firstA?: number;
  firstSet?: number;
  firstS?: number;
  sBooks: number;
  sFound: number;
  sCrumbled: number;
  busy: number;
  box: number[];
  boxBest: number;
  reserve: number;
  lectern: string;
};

const play = (rules: Rules): Result => {
  const books: Book[] = [];
  const lectern: Book[] = [];
  // Les livres S qui n'ont pas de place au lutrin : gardés, jamais détruits.
  const shelf: Book[] = [];
  const mounted = new Set<number>();
  let target: Book | null = null;
  const box = Array.from({ length: PARTS }, () => [0, 0, 0, 0]);
  const carnet: (Piece | undefined)[][] = Array.from({ length: SETS }, () => []);
  let jobs: Job[] = [];
  let reserve = 0;
  const result: Result = { sBooks: 0, sFound: 0, sCrumbled: 0, busy: 0, box: [], boxBest: 0, reserve: 0, lectern: '' };
  let playMinutes = 0;
  let sinceArrival = 0;

  const makeBook = (): Book => {
    const rank = pick(RANK_ODDS);
    let family = Math.floor(Math.random() * FAMILIES);
    while (family === ETHER && rank < 2) family = Math.floor(Math.random() * FAMILIES);
    const state = pick(STATE_ODDS);
    const parts = Array.from({ length: PARTS }, () => {
      let st = clamp(state + [-1, 0, 0, 1][Math.floor(Math.random() * 4)]);
      if (Math.random() < rules.better) st = clamp(st + 1);
      return { st };
    });
    if (Math.random() < rules.sChance)
      parts[Math.floor(Math.random() * PARTS)] = { st: pick(S_STATE_ODDS), set: Math.floor(Math.random() * SETS) };
    return { rank, family, parts, startRank: rank };
  };
  // Une pièce sortie d'un livre : au tiroir, ou au carnet ; elle peut s'abîmer, une médiocre abîmée tombe en miettes.
  const takeOut = (piece: Piece, part: number, risky = true): void => {
    const st = piece.st - (risky && Math.random() < rules.damage ? 1 : 0);
    if (piece.set !== undefined) {
      result.sFound++;
      if (st < 0) return void result.sCrumbled++;
      if (mounted.has(piece.set)) return;
      const have = carnet[piece.set][part];
      if (!have || have.st < st) carnet[piece.set][part] = { st, set: piece.set };
      return;
    }
    if (st >= 0 && (!risky || Math.random() < KEEP_ORDINARY)) box[part][st]++;
  };
  const destroy = (b: Book): void => {
    reserve += POINTS[b.rank];
    b.parts.forEach((p, part) => takeOut(p, part));
  };
  const busyBook = new Set<Piece>();

  const visit = (): void => {
    // Le lutrin et la cible restent ; tout le reste est démonté (les livres à pièce S d'abord pour leur pièce).
    const kept = [...lectern, ...(target ? [target] : [])];
    const candidates = [...new Set([...kept, ...shelf, ...books.filter((b) => !hasS(b))])];
    // La cible : le meilleur livre pas encore S, gardée jusqu'à ce qu'elle le devienne.
    if (!target || target.rank === 6) {
      const best = candidates.filter((b) => b.rank < 6).sort((x, y) => y.rank - x.rank || bookState(y) - bookState(x))[0];
      target = best ?? null;
    }
    // Le lutrin : les trois meilleures, familles principales différentes.
    lectern.length = 0;
    for (const b of [...candidates].sort((x, y) => worth(y) - worth(x))) {
      if (lectern.length === 3) break;
      if (!lectern.some((o) => mainFamily(o) === mainFamily(b))) lectern.push(b);
    }
    for (const b of books) if (!lectern.includes(b) && b !== target) destroy(b);
    for (const b of kept) if (!lectern.includes(b) && b !== target && b.rank < 6) destroy(b);
    books.length = 0;
    shelf.length = 0;
    shelf.push(...candidates.filter((b) => b.rank === 6 && !lectern.includes(b)));
    // Les pages de réemploi : la cible jusqu'à A, puis le lutrin (le moins haut d'abord).
    const climbers = () => [target, ...[...lectern].sort((x, y) => x.rank - y.rank)].filter((b): b is Book => !!b && b.rank < 5);
    // Un set complet attend une cible A : ses pages sont mises de côté.
    const setWaiting = (): boolean =>
      target?.rank === 5 && carnet.some((pieces, k) => !mounted.has(k) && pieces.filter(Boolean).length === PARTS);
    const hold = (): number => (setWaiting() ? SET_COST : 0);
    for (let b = climbers()[0]; b && reserve - (b === target ? 0 : hold()) >= NEED[b.rank]; b = climbers()[0]) {
      reserve -= NEED[b.rank];
      b.rank++;
    }
    if (target && target.rank >= 5 && result.firstA === undefined) result.firstA = playMinutes / 60;
    // Un set complet : monté sur la cible si elle est A (ses anciennes pièces aux tiroirs, sans risque).
    for (let k = 0; k < SETS; k++) {
      if (mounted.has(k) || carnet[k].filter(Boolean).length < PARTS) continue;
      if (result.firstSet === undefined) result.firstSet = playMinutes / 60;
      if (!target || target.rank !== 5 || reserve < SET_COST || carnet[k].some((p) => p && busyBook.has(p))) continue;
      reserve -= SET_COST;
      target.parts.forEach((p, part) => takeOut(p, part, false));
      target.parts = carnet[k] as Piece[];
      carnet[k] = [];
      target.rank = 6;
      target.set = k;
      result.sBooks++;
      mounted.add(k);
      if (result.firstS === undefined) result.firstS = playMinutes / 60;
      // Rangé à part : à la visite suivante, il prend sa place au lutrin s'il y est le meilleur.
      if (!lectern.includes(target)) shelf.push(target);
      target = null;
    }
    // Les presses.
    const restore = (piece: Piece, part: number): boolean => {
      if (piece.st >= 3 || busyBook.has(piece) || box[part].reduce((a, b) => a + b, 0) < RESTORE_COST) return false;
      // La cible passe d'abord : les pages qui lui manquent pour A sont mises de côté.
      const toA = target && target.rank < 5 ? NEED.slice(target.rank).reduce((x, y) => x + y, 0) : 0;
      if (reserve - hold() - toA < RESTORE_PAGES[piece.st]) return false;
      reserve -= RESTORE_PAGES[piece.st];
      // Les moins bonnes du tiroir d'abord.
      for (let n = 0; n < RESTORE_COST; n++) box[part][box[part].findIndex((count) => count > 0)]--;
      busyBook.add(piece);
      jobs.push({ left: RESTORE_MIN[piece.st] * rules.restore, done: () => (piece.st++, busyBook.delete(piece)) });
      return true;
    };
    const free = () => rules.presses - jobs.length;
    // Les pièces S du lutrin, puis celles du carnet (les sets les plus avancés d'abord).
    for (const b of lectern.filter((x) => x.rank === 6)) b.parts.forEach((p, part) => free() > 0 && p.st < 3 && restore(p, part));
    const order = [...carnet.keys()].sort((x, y) => carnet[y].filter(Boolean).length - carnet[x].filter(Boolean).length);
    for (const k of order) carnet[k].forEach((p, part) => p && free() > 0 && restore(p, part));
    // De meilleures pièces ordinaires sur le lutrin (pas sur les livres S).
    for (const b of lectern.filter((x) => x.rank < 6))
      b.parts.forEach((p, part) => {
        if (free() <= 0 || p.set !== undefined || busyBook.has(p)) return;
        const best = [3, 2, 1, 0].find((st) => box[part][st] > 0);
        if (best === undefined || best <= p.st) return;
        box[part][best]--;
        busyBook.add(p);
        jobs.push({
          left: MOUNT_MIN[best],
          done: () => {
            busyBook.delete(p);
            if (!b.parts.includes(p)) return void box[part][best]++;
            takeOut(p, part);
            b.parts[part] = { st: best };
          },
        });
      });
  };

  const dayMinutes = 24 * 60;
  for (let minute = 0; minute < DAYS * dayMinutes; minute += STEP) {
    const playing = minute % dayMinutes < PLAY_HOURS * 60;
    if (jobs.length) result.busy += STEP;
    for (const job of jobs) job.left -= STEP;
    const done = jobs.filter((job) => job.left <= 0);
    jobs = jobs.filter((job) => job.left > 0);
    done.forEach((job) => job.done());
    if (!playing) continue;
    playMinutes += STEP;
    sinceArrival += STEP;
    if (sinceArrival >= rules.arrivalMin) {
      sinceArrival = 0;
      books.push(makeBook());
    }
    if (playMinutes % VISIT_MIN === 0) visit();
  }
  result.busy /= DAYS * dayMinutes;
  result.box = box.map((states) => states.reduce((a, b) => a + b, 0));
  result.boxBest = box.reduce((s, states) => s + states[2] + states[3], 0);
  result.reserve = reserve;
  const R = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
  const ST = ['méd', 'usé', 'bon', 'neuf'];
  result.lectern = lectern.map((b) => `${R[b.rank]} ${ST[bookState(b)]}`).join(', ');
  return result;
};

// ---------------------------------------------------------------------------------------------
const quantile = (values: number[], q: number): number | undefined => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const hours = (h: number | undefined): string => {
  if (h === undefined) return 'jamais';
  const days = h / PLAY_HOURS;
  return `${Math.round(h)} h (j${Math.round(days)})`;
};
/** Médiane [10 % – 90 %], et la part des joueurs qui y arrivent dans la durée simulée. */
const spread = (values: (number | undefined)[]): string => {
  const reached = values.filter((v): v is number => v !== undefined);
  const share = Math.round((100 * reached.length) / values.length);
  if (reached.length < values.length / 2) return `pas pour la moitié (${share} % y arrivent)`;
  return `${hours(quantile(reached, 0.5))}  [${hours(quantile(reached, 0.1))} – ${hours(quantile(reached, 0.9))}]${share < 100 ? `, ${share} % y arrivent` : ''}`;
};
const mean = (values: number[]): string => (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1).replace('.', ',');

console.log(`Atelier : ${PLAYERS} joueurs, ${DAYS} jours, ${PLAY_HOURS} h de jeu par jour, une visite toutes les ${VISIT_MIN} min.`);
console.log('Heures de jeu (h) et jour (j) : médiane [10 % – 90 %].\n');
for (const [name, rules] of [
  ['Sans étoile de « L’atelier »', BASE],
  ['Toutes les étoiles au plus haut', MAX],
] as const) {
  const runs = Array.from({ length: PLAYERS }, () => play(rules));
  console.log(`== ${name}`);
  console.log(`  1re cible au rang A        ${spread(runs.map((r) => r.firstA))}`);
  console.log(`  1er set complet au carnet  ${spread(runs.map((r) => r.firstSet))}`);
  console.log(`  1er livre S monté          ${spread(runs.map((r) => r.firstS))}`);
  console.log(`  livres S au bout de ${DAYS} j  ${mean(runs.map((r) => r.sBooks))} sur 8 en moyenne`);
  const found = runs.reduce((s, r) => s + r.sFound, 0);
  const crumbled = runs.reduce((s, r) => s + r.sCrumbled, 0);
  console.log(
    `  pièces S sorties           ${mean(runs.map((r) => r.sFound))} par joueur, ${Math.round((100 * crumbled) / found)} % tombées en miettes`,
  );
  console.log(
    `  presses occupées           ${Math.round((100 * runs.reduce((s, r) => s + r.busy, 0)) / runs.length)} % du temps (jour et nuit)`,
  );
  console.log(
    `  tiroirs à la fin           ${mean(runs.map((r) => r.box.reduce((a, b) => a + b, 0)))} pièces ordinaires, dont ${mean(runs.map((r) => r.boxBest))} bonnes ou neuves`,
  );
  console.log(`  pages de réemploi en trop  ${mean(runs.map((r) => r.reserve))}`);
  console.log(`  un lutrin à la fin         ${runs[0].lectern}\n`);
}

// Le pire cas des bonus : trois livres S neufs au lutrin (familles principales différentes), par famille.
const SET_BONUS: [number, number][] = [
  [8, 6],
  [0, 5],
  [3, 2],
  [1, 0],
  [9, 3],
  [2, 7],
  [5, 8],
  [7, 4],
];
const NAMES = [
  'pages lues',
  'pages d’un clic',
  'trouvailles',
  'Connaissance',
  'prix des méthodes',
  'venue de la lettre',
  'durée des bonus',
  'Mimic (pts)',
  'absence',
  'Éther',
];
const V = [
  [25, 13],
  [150, 75],
  [35, 20],
  [35, 20],
  [12, 7],
  [45, 25],
  [50, 30],
  [30, 14],
  [35, 20],
  [7, 3],
];
console.log('== Pire cas : trois livres S neufs au lutrin (×1,3, bonus S d’un tiers en moins), la meilleure famille possible');
for (let f = 0; f < FAMILIES; f++) {
  const gains = SET_BONUS.map(([b1, b2]) => (b1 === f ? V[f][0] : 0) + (b2 === f ? V[f][1] : 0)).sort((a, b) => b - a);
  const best = gains.slice(0, 3).reduce((a, b) => a + b, 0) * 1.3 * S_BONUS;
  console.log(`  ${NAMES[f].padEnd(20)} ${best ? `+${Math.round(best)}` : '—'}`);
}
