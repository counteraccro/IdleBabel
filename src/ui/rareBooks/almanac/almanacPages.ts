import '@fontsource/caveat/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/600.css';
import '@fontsource/oswald/400.css';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { HAND } from '../draw';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { CONDENSED, HEAVY, hexagon, loadAlmanacFonts, text } from './almanacDraw';
import { FIRST_YEAR, LAST_YEAR, season, type CupGame, type Day, type Fact, type Season } from './almanacSeasons';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages de l'Almanach (maquette .ai/maquette-almanach-pages.html, piste A « le kiosque ») : papier blanc,
 * encre bleu nuit, filets rouge et orange de la couverture. Page de titre, mentions, sommaire, mode d'emploi,
 * puis sept pages par saison de 1950 à 2000, et des pages de notes jusqu'à la fin. Mesures de la maquette
 * (page 640 × 800, celle de la texture).
 */

const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;
const C = W / 2;
const LEFT = 62;
const RIGHT = W - 62;
const INTER = "'Inter', 'Helvetica Neue', Arial, sans-serif";

const INK = '#141a44';
const SOFT = '#5a6286';
const RED = '#e8322a';
const ORANGE = '#ffb21a';
const ZEBRA = 'rgba(20,26,68,0.06)';
const PAPER = '#f8f6f0';

const YEAR_PAGES = 7;
const FIRST_SEASON_PAGE = 5;
/** La page d'ouverture de la saison `year` (après 2000 : la première page de notes). */
export const seasonPage = (year: number): number => FIRST_SEASON_PAGE + (year - FIRST_YEAR) * YEAR_PAGES;
export const CONTENTS_PAGE = 3;
/** La page de notes où quelqu'un a écrit, à la main : la trouver est un secret (almanac.ts). */
export const NOTE_PAGE = 385;

export const loadAlmanacPageFonts = (): Promise<unknown> =>
  Promise.all([
    loadAlmanacFonts(),
    ...['400 20px Inter', '600 20px Inter', 'italic 400 20px Inter', '400 40px Oswald', '400 40px Caveat'].map((font) => document.fonts.load(font)),
  ]);

const texts = () => messages().rareBooks.almanac.pages;
/** Remplit les trous `{clé}` d'un texte. */
const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
const dateOf = ({ year, month, day }: Day): string => {
  const { days, months } = texts();
  return `${days[new Date(Date.UTC(year, month, day)).getUTCDay()]} ${day} ${months[month]}`;
};

type Context = CanvasRenderingContext2D;

const wrap = (context: Context, label: string, font: string, width: number): string[] => {
  context.font = font;
  const lines: string[] = [];
  let line = '';
  for (const word of label.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  return line ? [...lines, line] : lines;
};
/** La police `weight size family`, rétrécie pour que `label` tienne dans `width`. */
const fitFont = (context: Context, label: string, size: number, family: string, width: number): string => {
  context.font = ` ${size}px ${family}`;
  const measured = context.measureText(label).width;
  return ` ${Math.min(size, (size * width) / measured)}px ${family}`;
};
const measure = (context: Context, label: string, font: string): number => {
  context.font = font;
  return context.measureText(label).width;
};

const folio = (context: Context, page: number): void => text(context, String(page), C, H - 44, `500 15px ${CONDENSED}`, SOFT, 'center', 1);
const stripes = (context: Context, y: number): void => {
  context.fillStyle = RED;
  context.fillRect(LEFT, y, RIGHT - LEFT, 6);
  context.fillStyle = ORANGE;
  context.fillRect(LEFT, y + 9, RIGHT - LEFT, 3);
};
/** L'en-tête d'une page de tableaux : la rubrique à gauche, l'année à droite, les filets. */
const header = (context: Context, title: string, year: number): void => {
  text(context, title, LEFT, 78, `700 23px ${CONDENSED}`, INK, 'left', 1);
  text(context, String(year), RIGHT, 80, `30px ${HEAVY}`, RED, 'right', 1);
  stripes(context, 92);
};
const sub = (context: Context, label: string, y: number): void => {
  text(context, label, LEFT, y, `700 15px ${CONDENSED}`, RED, 'left', 1.5);
  context.fillStyle = RED;
  context.globalAlpha = 0.35;
  context.fillRect(LEFT, y + 6, RIGHT - LEFT, 1);
  context.globalAlpha = 1;
};
const cell = (context: Context, label: string, x: number, y: number, align: CanvasTextAlign = 'left', bold = false, size = 14, color = INK): void =>
  text(context, label, x, y, `${bold ? 600 : 400} ${size}px ${INTER}`, color, align);

const titlePage = (context: Context): void => {
  const { title, years, edition } = messages().rareBooks.almanac;
  const page = texts();
  stripes(context, 70);
  text(context, edition, C, 140, `500 18px ${CONDENSED}`, SOFT, 'center', 6);
  text(context, title[0], C, 260, fitFont(context, title[0], 96, HEAVY, RIGHT - LEFT), INK, 'center', 3);
  text(context, title[1], C, 340, fitFont(context, title[1], 72, HEAVY, RIGHT - LEFT), INK, 'center', 3);
  text(context, years, C, 410, `700 42px ${CONDENSED}`, RED, 'center', 8);
  text(context, page.subtitle, C, 470, `italic 400 19px ${INTER}`, INK, 'center');
  wrap(context, page.allSports, `400 14px ${INTER}`, 380).forEach((line, i) => text(context, line, C, 530 + i * 22, `400 14px ${INTER}`, SOFT, 'center'));
  hexagon(context, C, 640, 20, 4, INK, INK);
  hexagon(context, C, 640, 8, 3, PAPER);
  text(context, page.publisher, C, 700, `500 16px ${CONDENSED}`, INK, 'center', 5);
};

const legalPage = (context: Context): void =>
  texts().legal.forEach((line, i) => text(context, line, C, 520 + i * 22, `400 13px ${INTER}`, SOFT, 'center'));

/** Le sommaire : trois colonnes de 17 années, puis les notes. */
const CONTENTS_COLUMNS = [LEFT, LEFT + 180, LEFT + 360];
const CONTENTS_WIDTH = 150;
const CONTENTS_TOP = 178;
const CONTENTS_STEP = 29;
const contentsSpot = (index: number): [number, number] => [CONTENTS_COLUMNS[Math.floor(index / 17)], CONTENTS_TOP + (index % 17) * CONTENTS_STEP];
const NOTES_Y = CONTENTS_TOP + 17 * CONTENTS_STEP + 12;

const contentsPage = (context: Context): void => {
  const page = texts();
  text(context, page.contents, C, 110, `700 30px ${CONDENSED}`, INK, 'center', 6);
  stripes(context, 128);
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
    const [x, y] = contentsSpot(year - FIRST_YEAR);
    text(context, String(year), x, y, `500 17px ${CONDENSED}`, INK, 'left', 1);
    text(context, String(seasonPage(year)), x + CONTENTS_WIDTH, y, `400 14px ${INTER}`, INK, 'right');
    context.fillStyle = SOFT;
    for (let dot = x + 48; dot < x + CONTENTS_WIDTH - 30; dot += 6) context.fillRect(dot, y - 3, 1.5, 1.5);
  }
  text(context, page.notesLine, CONTENTS_COLUMNS[0], NOTES_Y, `500 17px ${CONDENSED}`, INK, 'left', 1);
  text(context, String(seasonPage(LAST_YEAR + 1)), CONTENTS_COLUMNS[0] + CONTENTS_WIDTH, NOTES_Y, `400 14px ${INTER}`, INK, 'right');
};

/** Un clic sur une année du sommaire (ou sur les notes) mène à sa page. */
export const almanacLinks = (page: number): PageLink[] => {
  if (page !== CONTENTS_PAGE) return [];
  const link = ([x, y]: [number, number], target: number): PageLink => ({ x: x - 4, width: CONTENTS_WIDTH + 8, y: y - 20, height: CONTENTS_STEP, target });
  const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, k) => link(contentsSpot(k), seasonPage(FIRST_YEAR + k)));
  return [...years, link([CONTENTS_COLUMNS[0], NOTES_Y], Math.min(seasonPage(LAST_YEAR + 1), PAGES_PER_BOOK))];
};

const howToPage = (context: Context): void => {
  const page = texts();
  text(context, page.howTo, C, 110, `700 26px ${CONDENSED}`, INK, 'center', 4);
  stripes(context, 128);
  let y = 190;
  page.howToText.forEach((paragraph, i) => {
    const last = i === page.howToText.length - 1;
    const font = `${last ? 600 : 400} 17px ${INTER}`;
    for (const line of wrap(context, paragraph, font, RIGHT - LEFT)) {
      text(context, line, LEFT, y, font, last ? RED : INK, 'left');
      y += 27;
    }
    y += 16;
  });
};

const factText = (fact: Fact): string => {
  const { fact: templates, races, events } = texts();
  switch (fact.kind) {
    case 'league':
      return fill(templates.league, {
        club: fact.club,
        n: fact.titles,
        nth: fact.titles === 1 ? templates.first : fill(templates.nth, { n: fact.titles }),
      });
    case 'cup':
      return fill(templates.cup, { club: fact.club, other: fact.other });
    case 'box':
      return fill(fact.keep ? templates.boxKeep : templates.boxNew, { name: fact.name });
    case 'race':
      return fill(templates.race, { horse: fact.horse, race: races[fact.race], odds: fact.odds });
    case 'ball':
      return fill(templates.ball, { club: fact.club });
    case 'record':
      return fill(templates.record, { event: events[fact.event], value: fact.value });
  }
};

const openingPage = (context: Context, s: Season): void => {
  const page = texts();
  stripes(context, 56);
  text(context, page.season, C, 118, `500 20px ${CONDENSED}`, SOFT, 'center', 10);
  const year = String(s.year);
  // L'année, doublée d'un trait rouge décalé.
  text(context, year, C, 270, `150px ${HEAVY}`, INK, 'center', 6);
  context.save();
  context.strokeStyle = RED;
  context.lineWidth = 2;
  context.font = `150px ${HEAVY}`;
  context.letterSpacing = '6px';
  context.textAlign = 'center';
  context.strokeText(year, C + 3 + 4, 270 + 4);
  context.restore();
  text(context, year, C, 270, `150px ${HEAVY}`, INK, 'center', 6);
  sub(context, page.facts, 330);
  let y = 362;
  for (const fact of s.facts) {
    const font = `400 15px ${INTER}`;
    context.fillStyle = RED;
    context.fillRect(LEFT, y - 9, 7, 7);
    for (const line of wrap(context, factText(fact), font, RIGHT - LEFT - 20)) {
      text(context, line, LEFT + 18, y, font, INK, 'left');
      y += 21;
    }
    y += 5;
  }
  // Les champions : un cadre plein, au-dessus du folio.
  const height = 6 * 24 + 46;
  const top = Math.min(Math.max(y + 14, 500), 712 - height);
  context.fillStyle = INK;
  context.fillRect(LEFT, top, RIGHT - LEFT, height);
  text(context, page.champions, C, top + 30, `700 16px ${CONDENSED}`, ORANGE, 'center', 4);
  page.championLabels.forEach((label, i) => {
    const row = top + 60 + i * 24;
    text(context, label, LEFT + 20, row, `400 14px ${INTER}`, '#ffffff', 'left');
    text(context, s.champions[i], RIGHT - 20, row, `600 14px ${INTER}`, '#ffffff', 'right');
  });
};

const LEAGUE_COLUMNS = [4, 34, 290, 330, 362, 394, 426, 470, 512].map((x) => LEFT + x);
const leaguePage = (context: Context, s: Season): void => {
  const page = texts();
  header(context, page.league, s.year);
  const top = 132;
  page.leagueHead.forEach((label, i) => cell(context, label, LEAGUE_COLUMNS[i], top, i < 2 ? 'left' : 'right', true, 12, SOFT));
  s.league.rows.forEach((row, i) => {
    const y = top + 30 + i * 27;
    if (i % 2 === 0) {
      context.fillStyle = ZEBRA;
      context.fillRect(LEFT, y - 18, RIGHT - LEFT, 27);
    }
    // Le trait des relégués, au-dessus des trois derniers.
    if (i === 15) {
      context.fillStyle = RED;
      context.fillRect(LEFT, y - 19, RIGHT - LEFT, 1.5);
    }
    const values = [i + 1, row.club, row.pts, row.p, row.w, row.d, row.l, row.f, row.a].map(String);
    values.forEach((value, k) =>
      cell(context, value, LEAGUE_COLUMNS[k], y, k < 2 ? 'left' : 'right', (k === 1 && i === 0) || k === 2, 14, i === 0 && k < 3 ? RED : INK),
    );
  });
  const y = top + 30 + 18 * 27 + 14;
  cell(context, fill(page.relegated, { clubs: s.league.rows.slice(15).map((row) => row.club).join(', ') }), LEFT, y, 'left', false, 13, SOFT);
  cell(context, fill(page.winPoints, { n: s.league.win }), LEFT, y + 22, 'left', false, 13, SOFT);
};

const extra = (game: CupGame): string => {
  const page = texts();
  if (game.penalties) return fill(page.penalties, { a: game.penalties[0], b: game.penalties[1] });
  return game.extraTime ? page.extraTime : '';
};

const cupPage = (context: Context, s: Season): void => {
  const page = texts();
  header(context, page.cup, s.year);
  let y = 140;
  s.cup.rounds.forEach((games, k) => {
    sub(context, page.rounds[k], y);
    y += 34;
    const size = k === 2 ? 17 : 14;
    for (const game of games) {
      cell(context, game.a, C - 34, y, 'right', game.winner === game.a, size);
      cell(context, `${game.x} - ${game.y}`, C, y, 'center', true, size, RED);
      cell(context, game.b, C + 34, y, 'left', game.winner === game.b, size);
      const note = extra(game);
      if (note) {
        y += 18;
        cell(context, `(${note})`, C, y, 'center', false, 12, SOFT);
      }
      y += k === 2 ? 30 : 27;
    }
    y += 14;
  });
  cell(context, fill(page.finalAt, { date: dateOf(s.cup.date) }), C, y, 'center', false, 13, SOFT);
  y += 22;
  if (s.cup.scorers.length) {
    const list = s.cup.scorers.map(([name, n]) => fill(page.minute, { name, n })).join(', ');
    for (const line of wrap(context, fill(page.scorers, { list }), `400 13px ${INTER}`, RIGHT - LEFT - 40)) {
      cell(context, line, C, y, 'center', false, 13, SOFT);
      y += 19;
    }
  }
};

const boxingPage = (context: Context, s: Season): void => {
  const page = texts();
  header(context, page.boxing, s.year);
  let y = 140;
  for (const bout of s.boxing) {
    text(context, page.weights[bout.weight].toUpperCase(), LEFT, y, `700 14px ${CONDENSED}`, RED, 'left', 1.5);
    cell(context, dateOf(bout.date), RIGHT, y, 'right', false, 12, SOFT);
    cell(context, bout.winner, LEFT, y + 21, 'left', true, 15);
    const method = fill(page.methods[bout.method], { n: bout.round });
    cell(context, ` ${page.beats} ${bout.loser}, ${method}`, LEFT + measure(context, bout.winner, `600 15px ${INTER}`), y + 21, 'left', false, 15);
    cell(context, `${bout.keep ? page.retains : page.newChampion} · ${bout.arena}`, LEFT, y + 40, 'left', false, 12, SOFT);
    y += 70;
  }
};

const racingPage = (context: Context, s: Season): void => {
  const page = texts();
  header(context, page.racing, s.year);
  let y = 140;
  for (const race of s.races) {
    text(context, page.races[race.race].toUpperCase(), LEFT, y, `700 15px ${CONDENSED}`, INK, 'left', 1);
    cell(context, dateOf(race.date), RIGHT, y, 'right', false, 12, SOFT);
    cell(context, page.winner, LEFT, y + 22, 'left', false, 14, SOFT);
    const label = LEFT + measure(context, `${page.winner} `, `400 14px ${INTER}`);
    cell(context, race.horse, label, y + 22, 'left', true, 15);
    cell(context, ` (${race.jockey})`, label + measure(context, race.horse, `600 15px ${INTER}`), y + 22, 'left', false, 14);
    cell(context, fill(page.odds, { n: race.odds }), RIGHT, y + 22, 'right', true, 15, RED);
    cell(context, fill(page.finish, { list: race.finish.join(' - ') }), LEFT, y + 42, 'left', false, 13);
    cell(context, fill(page.payout, { x: race.payout.toFixed(2).replace('.', page.decimal) }), RIGHT, y + 42, 'right', false, 13, SOFT);
    y += 86;
  }
};

const BALL_COLUMNS = [LEFT + 4, LEFT + 380, LEFT + 430, RIGHT - 4];
const baseballPage = (context: Context, s: Season): void => {
  const page = texts();
  header(context, page.baseball, s.year);
  let y = 136;
  s.ball.tables.forEach((table, k) => {
    sub(context, page.leagues[k], y);
    y += 26;
    page.ballHead.forEach((label, i) => cell(context, label, BALL_COLUMNS[i], y, i ? 'right' : 'left', true, 12, SOFT));
    y += 20;
    table.forEach((row, i) => {
      if (i % 2 === 0) {
        context.fillStyle = ZEBRA;
        context.fillRect(LEFT, y - 15, RIGHT - LEFT, 21);
      }
      cell(context, row.club, BALL_COLUMNS[0], y, 'left', i === 0, 13, i === 0 ? RED : INK);
      cell(context, String(row.w), BALL_COLUMNS[1], y, 'right', false, 13);
      cell(context, String(row.l), BALL_COLUMNS[2], y, 'right', false, 13);
      cell(context, (row.w / 154).toFixed(3).replace(/^0/, ''), BALL_COLUMNS[3], y, 'right', false, 13);
      y += 21;
    });
    y += 14;
  });
  sub(context, page.series, y);
  y += 28;
  const short = (club: string): string => club.split(' ').pop() ?? club;
  s.ball.games.forEach((game, i) => {
    const x = LEFT + (i % 4) * 129;
    const row = y + Math.floor(i / 4) * 40;
    cell(context, fill(page.game, { n: i + 1 }), x, row, 'left', false, 12, SOFT);
    cell(context, `${short(s.ball.east)} ${game.x} - ${game.y} ${short(s.ball.west)}`, x, row + 18, 'left', true, 12);
  });
  y += Math.ceil(s.ball.games.length / 4) * 40 + 8;
  cell(context, fill(page.seriesWon, { club: s.ball.winner, a: s.ball.a, b: s.ball.b }), LEFT, y, 'left', true, 14, RED);
};

const miscPage = (context: Context, s: Season): void => {
  const page = texts();
  header(context, page.misc, s.year);
  let y = 140;
  sub(context, page.tour, y);
  y += 30;
  s.podium.forEach((rider, i) => {
    cell(context, page.podium[i], LEFT + 4, y, 'left', false, 14, SOFT);
    cell(context, rider, LEFT + 50, y, 'left', i === 0, 14);
    cell(context, s.gaps[i], RIGHT - 4, y, 'right', false, 14);
    y += 23;
  });
  y += 14;
  sub(context, page.tennis, y);
  y += 30;
  for (const match of s.tennis) {
    cell(context, page.tournaments[match.tournament], LEFT + 4, y, 'left', false, 13, SOFT);
    y += 19;
    cell(context, `${match.winner} ${page.beats} ${match.finalist}`, LEFT + 4, y, 'left', true, 14);
    cell(context, match.score, RIGHT - 4, y, 'right', false, 14);
    y += 27;
  }
  y += 8;
  sub(context, page.records, y);
  y += 30;
  for (const record of s.records) {
    cell(context, page.events[record.event], LEFT + 4, y, 'left', true, 14);
    cell(context, record.value, LEFT + 150, y, 'left', true, 14, RED);
    cell(context, record.holder, LEFT + 270, y, 'left', false, 14);
    if (record.fresh) text(context, page.newRecord, RIGHT - 4, y, `700 12px ${CONDENSED}`, '#d88a00', 'right', 1.5);
    y += 25;
  }
};

const NOTES_TOP = 160;
const NOTES_STEP = 32;
const notesPage = (context: Context): void => {
  text(context, texts().notes, LEFT, 90, `700 22px ${CONDENSED}`, INK, 'left', 5);
  stripes(context, 104);
  context.fillStyle = SOFT;
  context.globalAlpha = 0.45;
  for (let y = NOTES_TOP; y < H - 90; y += NOTES_STEP) context.fillRect(LEFT, y, RIGHT - LEFT, 1);
  context.globalAlpha = 1;
};

/** Le juron d'un lecteur d'avant, au stylo bille, un peu de travers sur la septième ligne, souligné deux fois. */
const BALLPOINT = 'rgba(32, 52, 140, 0.88)';
const handNote = (context: Context): void => {
  const note = texts().note;
  context.save();
  context.translate(LEFT + 40, NOTES_TOP + 6 * NOTES_STEP - 6);
  context.rotate(-0.06);
  context.font = `44px ${HAND}`;
  context.fillStyle = BALLPOINT;
  context.textBaseline = 'alphabetic';
  context.fillText(note, 0, 0);
  const width = context.measureText(note).width;
  context.strokeStyle = BALLPOINT;
  context.lineWidth = 2.5;
  context.lineCap = 'round';
  for (const [y, bend, from] of [[10, 4, 2], [17, -3, 14]]) {
    context.beginPath();
    context.moveTo(from, y);
    context.quadraticCurveTo(width / 2, y + bend, width + 6, y - 2);
    context.stroke();
  }
  context.restore();
};

const SEASON_PAGES = [openingPage, leaguePage, cupPage, boxingPage, racingPage, baseballPage, miscPage];

/** Dessine la page `page` sur le papier déjà posé. */
export const paintAlmanacPage = (context: Context, page: number): void => {
  context.textBaseline = 'alphabetic';
  if (page === 1) return titlePage(context);
  if (page === 2) return legalPage(context);
  if (page === CONTENTS_PAGE) contentsPage(context);
  else if (page === 4) howToPage(context);
  else if (page >= seasonPage(LAST_YEAR + 1)) {
    notesPage(context);
    if (page === NOTE_PAGE) handNote(context);
  }
  else {
    const offset = page - FIRST_SEASON_PAGE;
    SEASON_PAGES[offset % YEAR_PAGES](context, season(FIRST_YEAR + Math.floor(offset / YEAR_PAGES)));
  }
  folio(context, page);
};
