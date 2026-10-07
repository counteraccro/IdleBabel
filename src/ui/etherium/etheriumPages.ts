import { ETHERIUM_PAGES } from '../../data/etheriumStars';
import { nextEtherPages } from '../../systems/prestige';
import { etherReading } from '../../systems/etherium';
import { formatCount, formatNumber, writeDigits } from '../../core/format';
import { getLocale, t } from '../../i18n';
import { constellationPage, starViews } from './constellationPage';
import { C, GOLD, TITLE, heading, litStar, nightFolio, rule, write, type Ctx } from './nightInk';
import { nightLeaf } from './nightLeaf';
import type { LeafPage } from '../strangeBook/pages';
import type { GameState } from '../../core/state';

/**
 * Les pages de l'Etherium, de nuit (conception §4.2, maquette .ai/maquette-etherium-constellations.html) : la garde,
 * avec l'Éther à dépenser et la lecture que donne l'Éther reçu, le sommaire, puis une constellation par page (constellationPage.ts).
 */

const plain = (value: number): string => writeDigits(formatNumber(value, getLocale()));

/** La garde : celle des pages de papier, passée de nuit. */
const drawTitle = (ctx: Ctx, state: GameState): void => {
  // Le nom, sa première lettre en lettrine d'or (une fois et demie plus grande).
  const name = t('etherium.name').toLocaleUpperCase();
  const [first, rest] = [name.slice(0, 1), name.slice(1)];
  ctx.save();
  ctx.letterSpacing = '6px';
  ctx.font = `600 48px ${TITLE}`;
  const head = ctx.measureText(first).width;
  const base = 230 + ctx.measureText('M').fontBoundingBoxAscent;
  ctx.font = `600 32px ${TITLE}`;
  const tail = ctx.measureText(rest).width - 6;
  const left = 320 - (head + tail) / 2;
  ctx.font = `600 48px ${TITLE}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(first, left, base);
  ctx.font = `600 32px ${TITLE}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(rest, left + head, base);
  ctx.restore();
  rule(ctx, 294, 130);
  write(ctx, plain(state.ether), 320, 380, { size: 64, face: TITLE, weight: '600', color: C.gold, align: 'center' });
  write(ctx, t('etherium.ether'), 320, 470, { size: 20, italic: true, color: C.faded, align: 'center', spacing: 3 });
  // L'Éther reçu depuis toujours, dépensé ou non : 1 % de lecture en plus chacun.
  const reading = plain(Math.round((etherReading(state) - 1) * 100));
  write(ctx, t('etherium.reading').replace('{n}', reading), 320, 535, { size: 18, italic: true, color: C.gold, align: 'center', fit: 560 });
  // Ce qu'il reste à lire : « dans 125 milliards de pages » (le « de » des toutes lettres : formatCount).
  const missing = formatCount(Math.max(0, nextEtherPages(state) - state.totalPagesRead), getLocale());
  write(ctx, t('etherium.next').replace('{n}', missing), 320, 620, { size: 18, italic: true, color: C.faded, align: 'center', fit: 560 });
};

const ENTRY_TOP = 240;
const ENTRY_STEP = 56;

/** Le sommaire : chaque page, ses étoiles allumées sur le total (l'Escalier : les marches connues), son numéro. */
const drawContents = (ctx: Ctx, state: GameState, first: number): void => {
  heading(ctx, t('etherium.contents'));
  write(ctx, t('etherium.contentsLine'), 320, 168, { size: 20, italic: true, color: C.faded, align: 'center' });
  ETHERIUM_PAGES.forEach((page, i) => {
    const stars = starViews(state, page).filter((star) => star.status !== 'hidden' && star.status !== 'unknown');
    const done = stars.filter((star) => star.status === 'done').length;
    const full = done === stars.length;
    const y = ENTRY_TOP + i * ENTRY_STEP;
    write(ctx, t(`etherium.pages.${page}.name`), 110, y, { size: 21, color: C.ink });
    write(ctx, t(`etherium.pages.${page}.figure`), 110, y + 26, { size: 15, italic: true, color: C.faded });
    ctx.save();
    ctx.strokeStyle = C.deco;
    ctx.setLineDash([1, 5]);
    ctx.beginPath();
    ctx.moveTo(330, y + 16);
    ctx.lineTo(450, y + 16);
    ctx.stroke();
    ctx.restore();
    write(ctx, writeDigits(`${done} / ${stars.length}`), 500, y, { size: 21, color: full ? C.gold : C.faded, align: 'right' });
    if (full) litStar(ctx, 528, y + 12, 9);
    write(ctx, writeDigits(String(first + i + 1)), 560, y + 2, { size: 18, color: C.faded });
  });
  nightFolio(ctx, 2);
};

/** Toutes les pages : garde, sommaire, une constellation par page. Une étoile allumée se voit aussitôt partout. */
export const createEtheriumPages = (state: GameState, goTo: (page: number) => void): LeafPage[] => {
  const first = 2;
  return [
    nightLeaf({ draw: (ctx) => drawTitle(ctx, state), spots: () => [], press: () => {} }),
    nightLeaf({
      draw: (ctx) => drawContents(ctx, state, first),
      spots: () =>
        ETHERIUM_PAGES.map((page, i) => ({
          id: page,
          x: 100,
          y: ENTRY_TOP + i * ENTRY_STEP - 6,
          w: 480,
          h: ENTRY_STEP - 4,
          pointer: true,
        })),
      press: (id) => goTo(first + ETHERIUM_PAGES.indexOf(id as (typeof ETHERIUM_PAGES)[number])),
    }),
    ...ETHERIUM_PAGES.map((page, index) => constellationPage(state, page, first + index + 1)),
    // En face de la dernière figure, une page de nuit vierge (les suivantes, du papier de nuit uni).
    nightLeaf({ draw: () => {}, spots: () => [], press: () => {} }),
  ];
};
