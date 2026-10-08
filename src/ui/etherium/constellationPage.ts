import { CLOSED, KEEPS, NEEDS_AGE, S, STARS, type PageId } from '../../data/etheriumStars';
import { lightStar, starLit, starOpen } from '../../systems/etherium';
import { formatNumber, writeDigits } from '../../core/format';
import { getLocale, t } from '../../i18n';
import { FIGURES, type Figure } from './constellations';
import { C, HAND, TITLE, line, litStar, nightFolio, starPath, write, heading, type Ctx, type Point } from './nightInk';
import { nightLeaf, type Spot } from './nightLeaf';
import type { LeafPage } from '../strangeBook/pages';
import type { GameState } from '../../core/state';

/**
 * Une page de constellation de l'Etherium, comme dans la maquette validée (.ai/maquette-etherium-constellations.html) :
 * les étoiles de la figure, chacune reliée à son étoile d'avant ; en haut, l'étoile survolée (ou la prochaine), son effet,
 * son prix. Cliquer une étoile qui peut s'allumer l'allume.
 */

/**
 * allumée ; à prendre ; plus loin ; l'alvéole Automatique avant l'Âge ; une marche pas encore connue de l'Escalier, ou
 * une étoile fermée (CLOSED).
 */
export type StarStatus = 'done' | 'next' | 'far' | 'hidden' | 'unknown';

export interface StarView extends Point {
  /** Nom court (sans la page). */
  id: string;
  cost: number;
  status: StarStatus;
  affordable: boolean;
  /** L'étoile de départ de la figure : un anneau. */
  start: boolean;
  /** Offerte (l'Âge Manuel). */
  given: boolean;
  /** L'étoile d'avant (nom court), pour le trait. */
  after?: string;
}

const statusOf = (state: GameState, page: PageId, id: string): StarStatus => {
  const full = `${page}.${id}`;
  if (NEEDS_AGE.has(full) && !starLit(state, S.age)) return 'hidden';
  if (starLit(state, full)) return 'done';
  // Fermée : elle ne dit pas son nom (la Goutte, les Âges d'après l'Automatique).
  if (CLOSED.has(full)) return 'unknown';
  if (starOpen(state, full)) return 'next';
  // L'Escalier : seule la prochaine marche dit son nom.
  return page === 'ages' ? 'unknown' : 'far';
};

/** Les étoiles d'une page, dans l'ordre de la figure (l'étoile offerte d'abord). */
export const starViews = (state: GameState, page: PageId): StarView[] => {
  const figure = FIGURES[page];
  const given: StarView[] = figure.given
    ? [
        {
          id: figure.given.id,
          x: figure.spots[figure.given.id][0],
          y: figure.spots[figure.given.id][1],
          cost: 0,
          status: 'done',
          affordable: false,
          start: true,
          given: true,
        },
      ]
    : [];
  const stars = STARS.filter((star) => star.page === page).map((star): StarView => {
    const id = star.id.slice(page.length + 1);
    const [x, y] = figure.spots[id];
    const status = statusOf(state, page, id);
    return {
      id,
      x,
      y,
      cost: star.cost,
      status,
      affordable: status === 'next' && state.ether >= star.cost,
      start: !figure.given && !star.after,
      given: false,
      after: star.after?.slice(page.length + 1) ?? (figure.given?.opens === id ? figure.given.id : undefined),
    };
  });
  return [...given, ...stars];
};

const plain = (value: number): string => formatNumber(value, getLocale());

/** Plus une étoile coûte cher, plus elle est grosse. */
const radiusOf = (star: StarView): number => 9 + Math.min(12, Math.log2(1 + (star.cost || 4)) * 1.9);

/** Le nom d'une étoile : celles de la Ruche qui gardent une méthode du jeu portent son nom. */
export const starName = (page: PageId, id: string): string => {
  if (page === 'ages' && id === FIGURES.ages.given?.id) return t('etherium.manual.name');
  const tool = page === 'memory' ? Object.keys(KEEPS).find((method) => KEEPS[method] === `memory.${id}`) : undefined;
  const own = t(`etherium.stars.${page}.${id}.name`);
  return tool && own === `etherium.stars.${page}.${id}.name` ? t(`tools.${tool}.name`) : own;
};

/** Ce que dit l'en-tête d'une étoile : sa valeur et son effet (« ×1,25 » « pages par seconde »). */
const starText = (page: PageId, star: StarView): string => {
  if (star.given) return `${t('etherium.manual.value')} ${t('etherium.manual.effect')}`;
  if (page === 'memory') {
    const own = t(`etherium.stars.memory.${star.id}.effect`);
    return `${starName(page, star.id)} ${own === `etherium.stars.memory.${star.id}.effect` ? t('etherium.keep') : own}`;
  }
  return writeDigits(`${t(`etherium.stars.${page}.${star.id}.value`)} ${t(`etherium.stars.${page}.${star.id}.effect`)}`.trim());
};

const noteOf = (star: StarView): string => {
  if (star.given) return t('etherium.given');
  if (star.status === 'done') return t('etherium.lit');
  if (star.status === 'hidden') return t('etherium.afterAge');
  return writeDigits(t(star.affordable ? 'etherium.light' : 'etherium.cost').replace('{n}', plain(star.cost)));
};

/** Le cercle sur lequel posent les deux étoiles, s'il y en a un (la lune). */
const circleOf = (figure: Figure, a: Point, b: Point) =>
  figure.circles?.find(([cx, cy, r]) => [a, b].every((p) => Math.abs(Math.hypot(p.x - cx, p.y - cy) - r) < 3));

/** L'Escalier : le pilier et les marches qui tournent autour, à peine tracés, sous les étoiles. */
const stairs = (ctx: Ctx, stars: StarView[]): void => {
  ctx.save();
  ctx.strokeStyle = C.deco;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.moveTo(320, 700);
  ctx.lineTo(320, 250);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const star of stars) {
    const w = 30 + (star.y - 300) * 0.12;
    ctx.strokeStyle = star.status === 'done' ? 'rgba(232,199,118,0.35)' : C.deco;
    ctx.beginPath();
    ctx.moveTo(320, star.y + 6);
    ctx.lineTo(star.x + Math.sign(star.x - 320 || 1) * w * 0.4, star.y + 6);
    ctx.stroke();
  }
  // Plus haut, l'escalier se perd dans la nuit.
  ctx.strokeStyle = 'rgba(200,185,230,0.15)';
  ctx.setLineDash([1, 5]);
  ctx.beginPath();
  ctx.moveTo(280, 325);
  ctx.quadraticCurveTo(410, 280, 345, 230);
  ctx.stroke();
  ctx.restore();
};

const drawConstellation = (ctx: Ctx, state: GameState, page: PageId, number: number, hovered: string | null): void => {
  const figure = FIGURES[page];
  const stars = starViews(state, page);
  const byId = Object.fromEntries(stars.map((star) => [star.id, star]));
  heading(ctx, t(`etherium.pages.${page}.name`));
  write(ctx, t(`etherium.pages.${page}.description`), 320, 168, { size: 20, italic: true, color: C.faded, align: 'center', fit: 560 });
  if (page === 'ages') stairs(ctx, stars);
  // Les traits de la figure qui n'ouvrent rien.
  for (const [a, b] of figure.deco) {
    const A = byId[a];
    const B = byId[b];
    if (A && B)
      line(ctx, A, B, { lit: A.status === 'done' && B.status === 'done', dash: [1.5, 4], color: C.deco, circle: circleOf(figure, A, B) });
  }
  // L'ordre : chaque étoile vers son étoile d'avant (la Ruche : d'une alvéole à l'autre aussi).
  for (const star of stars) {
    const before = star.after ? byId[star.after] : undefined;
    if (!before) continue;
    const hidden = star.status === 'hidden';
    line(ctx, before, star, {
      lit: before.status === 'done' && star.status === 'done',
      dash: hidden ? [1.5, 4] : [3, 6],
      width: hidden ? 1.6 : 1.2,
      color: hidden ? C.hidden : C.link,
      circle: circleOf(figure, before, star),
    });
  }
  for (const star of stars) {
    const r = radiusOf(star);
    ctx.save();
    if (star.status === 'hidden') {
      ctx.strokeStyle = C.hidden;
      ctx.setLineDash([1, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    } else if (star.status === 'done') litStar(ctx, star.x, star.y, r);
    else if (star.status === 'unknown') {
      starPath(ctx, star.x, star.y, 8);
      ctx.fillStyle = C.far;
      ctx.fill();
    } else {
      starPath(ctx, star.x, star.y, star.status === 'far' ? r * 0.7 : r);
      ctx.fillStyle = star.status === 'far' ? C.far : C.star;
      ctx.fill();
    }
    ctx.restore();
    if (star.start) {
      ctx.strokeStyle = C.ring;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(star.x, star.y, r + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (star.affordable || star.id === hovered) {
      ctx.save();
      ctx.strokeStyle = star.affordable ? C.gold : C.faded;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.arc(star.x, star.y, r + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Sur l'Escalier, chaque marche connue porte son nom.
    if (page === 'ages' && star.status !== 'unknown') {
      const right = star.x >= 320;
      write(ctx, starName(page, star.id), star.x + (right ? 30 : -30), star.y - 12, {
        size: 17,
        face: TITLE,
        color: star.status === 'done' ? C.gold : C.faded,
        align: right ? 'left' : 'right',
        spacing: 2,
      });
    }
  }
  // Le nom de la figure, en bas, comme sur les planches.
  write(ctx, t(`etherium.pages.${page}.figure`).toLocaleUpperCase(), 320, 708, {
    size: 15,
    face: TITLE,
    color: C.faded,
    align: 'center',
    spacing: 5,
  });
  // En haut : l'étoile survolée, ou la prochaine ; sinon une étoile fermée (la figure n'est pas encore entière).
  const shown =
    (hovered ? byId[hovered] : undefined) ??
    stars.find((star) => star.affordable) ??
    stars.find((star) => star.status === 'next') ??
    stars.find((star) => star.status === 'unknown');
  if (shown?.status === 'unknown') {
    write(ctx, '?', 320, 206, { size: 24, align: 'center', color: C.faded });
    // L'Escalier : une marche, plus haut ; ailleurs (la Goutte) : pas encore.
    write(ctx, t(page === 'ages' ? 'etherium.unknown' : 'etherium.closed'), 320, 240, {
      size: 26,
      face: HAND,
      align: 'center',
      color: C.faded,
    });
  } else if (shown) {
    const text = starText(page, shown);
    write(ctx, text, 320, 210, {
      size: text.length > 53 ? 18 : 21,
      align: 'center',
      color: shown.status === 'far' || shown.status === 'hidden' ? C.faded : C.ink,
      fit: 580,
    });
    write(ctx, noteOf(shown), 320, 240, { size: 26, face: HAND, align: 'center', color: shown.affordable ? C.gold : C.faded });
  } else write(ctx, t('etherium.complete'), 320, 226, { size: 26, face: HAND, align: 'center', color: C.faded });
  nightFolio(ctx, number);
};

export const constellationPage = (state: GameState, page: PageId, number: number): LeafPage =>
  nightLeaf({
    draw: (ctx, hovered) => drawConstellation(ctx, state, page, number, hovered),
    spots: () =>
      starViews(state, page).map((star): Spot => ({ id: star.id, x: star.x - 26, y: star.y - 26, w: 52, h: 52, pointer: star.affordable })),
    press: (id) => {
      if (FIGURES[page].given?.id !== id) lightStar(state, `${page}.${id}`);
    },
  });
