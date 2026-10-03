import { ARENAS, BALL_CLUBS, CLUBS, FIRST_NAMES, HORSES, JOCKEYS, LAST_NAMES } from './almanacNames';

/**
 * Les saisons de l'Almanach, de 1950 à 2000 : tout est inventé, mais tiré d'un hasard fixe (une clé
 * « rubrique:année » → une suite), les mêmes pour tout le monde, indépendant de la graine de la partie. Les
 * résultats se tiennent : le classement vient des 306 matchs joués, la victoire passe de 2 à 3 points en
 * 1995, les tenants de la boxe gardent ou perdent leur titre d'une année sur l'autre, les records ne font
 * que tomber. Les tirages suivent exactement l'ordre de la maquette (.ai/maquette-almanach-pages.html) :
 * mêmes résultats. Rien ici ne dépend de la langue (les textes viennent à la mise en page).
 */

export const FIRST_YEAR = 1950;
export const LAST_YEAR = 2000;

type Random = () => number;

/** Le hasard de la maquette : FNV de la clé, puis Park-Miller. */
const random = (key: string): Random => {
  let h = 2166136261;
  for (const char of key) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  let seed = ((h >>> 0) % 2147483646) + 1;
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
};
const pick = <T>(r: Random, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const shuffle = <T>(r: Random, list: readonly T[]): T[] => {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
/** Les buts d'une équipe de force `force` (loi de Poisson). */
const goals = (r: Random, force: number): number => {
  const limit = Math.exp(-force);
  let k = 0;
  let p = r();
  while (p > limit && k < 9) {
    p *= r();
    k++;
  }
  return k;
};
const person = (r: Random): string => `${pick(r, FIRST_NAMES)} ${pick(r, LAST_NAMES)}`;

/** Une date de l'année (mois de 0 à 11). */
export interface Day {
  year: number;
  month: number;
  day: number;
}

export interface LeagueRow {
  club: string;
  pts: number;
  p: number;
  w: number;
  d: number;
  l: number;
  f: number;
  a: number;
}

/** Un match de coupe ; `extra` : prolongation, ou tirs au but (`penalties`, score du premier nommé d'abord). */
export interface CupGame {
  a: string;
  b: string;
  x: number;
  y: number;
  extraTime: boolean;
  penalties?: [number, number];
  winner: string;
}

export interface Bout {
  weight: number;
  winner: string;
  loser: string;
  method: number;
  round: number;
  keep: boolean;
  arena: string;
  date: Day;
}

export interface Race {
  race: number;
  horse: string;
  jockey: string;
  odds: number;
  finish: number[];
  payout: number;
  date: Day;
}

export interface BallRow {
  club: string;
  w: number;
  l: number;
}

export interface WorldRecord {
  event: number;
  value: string;
  holder: string;
  fresh: boolean;
}

export interface Tennis {
  tournament: number;
  winner: string;
  finalist: string;
  score: string;
}

/** Un fait de la saison, à écrire dans la langue du jeu. */
export type Fact =
  | { kind: 'league'; club: string; titles: number }
  | { kind: 'cup'; club: string; other: string }
  | { kind: 'box'; name: string; keep: boolean }
  | { kind: 'race'; horse: string; race: number; odds: number }
  | { kind: 'ball'; club: string }
  | { kind: 'record'; event: number; value: string };

export interface Season {
  year: number;
  league: { rows: LeagueRow[]; win: number };
  cup: { rounds: CupGame[][]; final: CupGame; date: Day; scorers: [string, number][] };
  boxing: Bout[];
  races: Race[];
  ball: { tables: BallRow[][]; east: string; west: string; games: { x: number; y: number }[]; winner: string; a: number; b: number };
  podium: string[];
  gaps: string[];
  tennis: Tennis[];
  records: WorldRecord[];
  facts: Fact[];
  champions: string[];
}

const leagues = new Map<number, Season['league']>();
const league = (year: number): Season['league'] => {
  const known = leagues.get(year);
  if (known) return known;
  const r = random(`league:${year}`);
  const force = CLUBS.map((_, i) => 0.9 + r() * 1.1 + (i === 17 ? -0.2 : 0));
  const rows = CLUBS.map((club) => ({ club, pts: 0, p: 0, w: 0, d: 0, l: 0, f: 0, a: 0 }));
  const win = year >= 1995 ? 3 : 2;
  for (let home = 0; home < 18; home++)
    for (let away = 0; away < 18; away++) {
      if (home === away) continue;
      const scored = goals(r, (force[home] * 1.15) / (0.6 + force[away] * 0.4));
      const conceded = goals(r, (force[away] * 0.85) / (0.6 + force[home] * 0.4));
      const [h, v] = [rows[home], rows[away]];
      h.p++;
      v.p++;
      h.f += scored;
      h.a += conceded;
      v.f += conceded;
      v.a += scored;
      if (scored > conceded) {
        h.w++;
        v.l++;
        h.pts += win;
      } else if (scored < conceded) {
        v.w++;
        h.l++;
        v.pts += win;
      } else {
        h.d++;
        v.d++;
        h.pts++;
        v.pts++;
      }
    }
  rows.sort((x, y) => y.pts - x.pts || y.f - y.a - (x.f - x.a) || y.f - x.f);
  const result = { rows, win };
  leagues.set(year, result);
  return result;
};

/** Combien de titres le champion de `year` a gagnés depuis 1950, celui-ci compris. */
const titles = (year: number): number => {
  const champion = league(year).rows[0].club;
  let count = 0;
  for (let y = FIRST_YEAR; y <= year; y++) if (league(y).rows[0].club === champion) count++;
  return count;
};

const match = (r: Random, a: string, b: string): CupGame => {
  let x = goals(r, 1.3);
  let y = goals(r, 1.2);
  let extraTime = false;
  if (x === y) {
    if (r() < 0.5) {
      if (r() < 0.5) x++;
      else y++;
      extraTime = true;
    } else {
      const p = 3 + Math.floor(r() * 3);
      const q = p - 1 - Math.floor(r() * 2);
      const aWins = r() < 0.5;
      return { a, b, x, y, extraTime, penalties: aWins ? [p, q] : [q, p], winner: aWins ? a : b };
    }
  }
  return { a, b, x, y, extraTime, winner: x > y ? a : b };
};

const cup = (year: number): Season['cup'] => {
  const r = random(`cup:${year}`);
  let teams = shuffle(r, CLUBS).slice(0, 8);
  const rounds: CupGame[][] = [];
  while (teams.length > 1) {
    const games: CupGame[] = [];
    for (let i = 0; i < teams.length; i += 2) games.push(match(r, teams[i], teams[i + 1]));
    rounds.push(games);
    teams = games.map((game) => game.winner);
  }
  const final = rounds[2][0];
  const scorers: [string, number][] = [];
  for (let k = 0; k < final.x + final.y; k++) scorers.push([pick(r, LAST_NAMES), 10 + Math.floor(r() * 80)]);
  return { rounds, final, date: { year, month: 4, day: 1 + Math.floor(r() * 28) }, scorers };
};

/** 120 boxeurs, tous différents : 15 par catégorie. */
const BOXERS = (() => {
  const r = random('boxers');
  const names = new Set<string>();
  while (names.size < 120) names.add(person(r));
  return [...names];
})();

/** Les huit catégories, suivies depuis 1950 : chaque année, le tenant défend son titre. */
const boxingByYear: Bout[][] = [];
const boxing = (year: number): Bout[] => {
  if (!boxingByYear.length) {
    const champions = Array.from({ length: 8 }, (_, w) => BOXERS[w * 15]);
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++)
      boxingByYear.push(
        champions.map((champion, weight) => {
          const r = random(`box:${y}:${weight}`);
          const challenger = BOXERS[weight * 15 + Math.floor(r() * 15)];
          const keep = r() < 0.55 || challenger === champion;
          const method = Math.floor(r() * 4);
          const round = 3 + Math.floor(r() * 12);
          const winner = keep ? champion : challenger;
          // Le tenant tiré contre lui-même : il défend son titre contre le dernier de sa catégorie (ou l'avant-dernier).
          const stranger = BOXERS[weight * 15 + 14] === champion ? BOXERS[weight * 15 + 13] : BOXERS[weight * 15 + 14];
          const loser = keep ? (challenger === champion ? stranger : challenger) : champion;
          const arena = ARENAS[Math.floor(r() * ARENAS.length)];
          const date = { year: y, month: 1 + Math.floor(r() * 10), day: 1 + Math.floor(r() * 27) };
          champions[weight] = winner;
          return { weight, winner, loser, method, round, keep, arena, date };
        }),
      );
  }
  return boxingByYear[year - FIRST_YEAR];
};

const RACES = 6;
const racing = (year: number): Race[] => {
  const r = random(`race:${year}`);
  return Array.from({ length: RACES }, (_, race) => {
    const horse = pick(r, HORSES);
    const odds = pick(r, [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 33]);
    const finish = shuffle(r, Array.from({ length: 18 }, (_, k) => k + 1)).slice(0, 5);
    const jockey = pick(r, JOCKEYS);
    const payout = odds * 10 + Math.floor(r() * 9) + r();
    return { race, horse, jockey, odds, finish, payout, date: { year, month: 3 + race, day: 1 + Math.floor(r() * 27) } };
  });
};

const baseball = (year: number): Season['ball'] => {
  const r = random(`ball:${year}`);
  const tables = BALL_CLUBS.map((clubs) =>
    clubs
      .map((club) => {
        const w = 60 + Math.floor(r() * 45);
        return { club, w, l: 154 - w };
      })
      .sort((a, b) => b.w - a.w),
  );
  const [east, west] = [tables[0][0].club, tables[1][0].club];
  const games: { x: number; y: number }[] = [];
  let [a, b] = [0, 0];
  while (a < 4 && b < 4) {
    let x = goals(r, 4.2);
    const y = goals(r, 4);
    if (x === y) x++;
    games.push({ x, y });
    if (x > y) a++;
    else b++;
  }
  return { tables, east, west, games, winner: a === 4 ? east : west, a: Math.max(a, b), b: Math.min(a, b) };
};

/** Les records de 1950 (100 m, 1 500 m, hauteur, marathon), et de combien ils tombent. */
const RECORD_START = [10.3, 3 * 60 + 43.0, 2.12, 2 * 3600 + 20 * 60 + 42];
const RECORD_STEP = [0.03, 0.5, 0.012, 40];
const showRecord = (event: number, v: number): string =>
  event === 0
    ? v.toFixed(2).replace('.', '"')
    : event === 1
      ? `${Math.floor(v / 60)}'${(v % 60).toFixed(1).padStart(4, '0').replace('.', '"')}`
      : event === 2
        ? `${v.toFixed(2)} m`
        : `${Math.floor(v / 3600)} h ${String(Math.floor(v / 60) % 60).padStart(2, '0')}'${String(Math.floor(v % 60)).padStart(2, '0')}"`;

const recordsByYear: WorldRecord[][] = [];
const records = (year: number): WorldRecord[] => {
  if (!recordsByYear.length) {
    const values = [...RECORD_START];
    const holders = ['', '', '', ''];
    for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
      const r = random(`records:${y}`);
      const fresh = [false, false, false, false];
      for (let event = 0; event < 4; event++) {
        const broken = r() < 0.3;
        const who = person(r);
        if (y === FIRST_YEAR || broken) {
          if (y > FIRST_YEAR) values[event] += (event === 2 ? 1 : -1) * RECORD_STEP[event] * (0.5 + r());
          holders[event] = who;
        }
        fresh[event] = broken && y > FIRST_YEAR;
      }
      recordsByYear.push(values.map((v, event) => ({ event, value: showRecord(event, v), holder: holders[event], fresh: fresh[event] })));
    }
  }
  return recordsByYear[year - FIRST_YEAR];
};

/** La Grande Boucle et le tennis. */
const misc = (year: number): Pick<Season, 'podium' | 'gaps' | 'tennis'> => {
  const r = random(`misc:${year}`);
  const podium = [person(r), person(r), person(r)];
  const gap = (minutes: number): string => `+ ${minutes}' ${String(Math.floor(r() * 60)).padStart(2, '0')}"`;
  const second = Math.floor(r() * 9);
  const gapSecond = gap(second);
  const third = 9 + Math.floor(r() * 12);
  const gaps = ['', gapSecond, gap(third)];
  // Au meilleur des trois manches : le vainqueur en gagne deux, perd parfois la première ou la deuxième.
  const set = (won: boolean): string => {
    const games = Math.floor(r() * 5);
    return won ? `6-${games}` : `${games}-6`;
  };
  const score = (): string => {
    const lost = r() < 0.4 ? Math.floor(r() * 2) : -1;
    return (lost < 0 ? [true, true] : lost === 0 ? [false, true, true] : [true, false, true]).map(set).join(' ');
  };
  const tennis = [0, 1, 2, 3].map((tournament) => ({ tournament, winner: person(r), finalist: person(r), score: score() }));
  return { podium, gaps, tennis };
};

const seasons = new Map<number, Season>();
/** La saison `year`, tirée une fois. */
export const season = (year: number): Season => {
  const known = seasons.get(year);
  if (known) return known;
  const l = league(year);
  const c = cup(year);
  const b = boxing(year);
  const races = racing(year);
  const ball = baseball(year);
  const m = misc(year);
  const recs = records(year);
  const heavy = b[7];
  const r = random(`facts:${year}`);
  const fresh = recs.find((record) => record.fresh);
  const race = races[Math.floor(r() * races.length)];
  const facts: Fact[] = [
    { kind: 'league', club: l.rows[0].club, titles: titles(year) },
    { kind: 'cup', club: c.final.winner, other: c.final.winner === c.final.a ? c.final.b : c.final.a },
    { kind: 'box', name: heavy.winner, keep: heavy.keep },
    { kind: 'race', horse: race.horse, race: race.race, odds: race.odds },
    { kind: 'ball', club: ball.winner },
  ];
  if (fresh) facts.push({ kind: 'record', event: fresh.event, value: fresh.value });
  const result: Season = {
    year,
    league: l,
    cup: c,
    boxing: b,
    races,
    ball,
    ...m,
    records: recs,
    facts,
    champions: [l.rows[0].club, c.final.winner, heavy.winner, races[0].horse, ball.winner, m.podium[0]],
  };
  seasons.set(year, result);
  return result;
};
