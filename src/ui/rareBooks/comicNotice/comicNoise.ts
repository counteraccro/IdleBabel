import { messages } from '../../../i18n';
import {
  CELL,
  GUTTER,
  H,
  INK,
  LETTERING,
  LINE,
  MARGIN,
  TITLE,
  W,
  asciiArt,
  babel,
  bubble,
  caption,
  charabia,
  folio,
  panel,
  plateTitle,
  seeded,
  sound,
  type Scene,
} from './comicDraw';
import { CLOSED, box, closedBook, dot, hex, hive, limb, openBook, ring, room, seal, shelves, speed, vitrine } from './comicScenes';
import { LETTERS } from '../../../systems/babelText';

/**
 * Ce qui entoure la notice dans « Gare aux pages » : la page de titre, la page de garde (des alvéoles), et après les huit
 * planches, le reste de l'album jusqu'à la page 410 (l'auteur, 22/10 : piste 1) : de vraies planches de BD tirées au
 * hasard, cases, décors en lettres, bulles et récitatifs de charabia. On voit une BD ; on ne la comprend pas. Chaque page
 * est tirée de son numéro : rien n'est gardé, et seules les pages qu'on voit sont dessinées.
 */

type Ctx = CanvasRenderingContext2D;

/** La page de titre : le titre, la salle dans un hexagone, la mention et l'éditeur. */
export const paintTitlePage = (ctx: Ctx): void => {
  const book = messages().rareBooks.comicNotice;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = `46px ${TITLE}`;
  book.cover.forEach((line, i) => ctx.fillText(line, W / 2, 130 + i * 50));
  const [cx, cy, r] = [W / 2, 400, 150];
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++)
    ctx.lineTo(cx + Math.cos(Math.PI / 6 + (i * Math.PI) / 3) * r, cy + Math.sin(Math.PI / 6 + (i * Math.PI) / 3) * r);
  ctx.closePath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.clip();
  asciiArt(ctx, cx - r, cy - r, r * 2, r * 2, (o, w, h) => (room(o, w, h, h * 0.7), openBook(o, w * 0.5, h * 0.72, w * 0.16)));
  ctx.restore();
  ctx.font = `bold 16px ${LETTERING}`;
  ctx.fillText(book.subtitle, W / 2, 620);
  ctx.font = `bold 13px ${LETTERING}`;
  ctx.fillText(book.publisher, W / 2, 720);
  ctx.restore();
};

/** La page de garde : des alvéoles sur toute la page, comme les gardes des albums. */
export const paintEndpaper = (ctx: Ctx): void =>
  asciiArt(ctx, 30, 30, W - 60, H - 60, (o, w, h) => {
    const r = 70;
    for (let row = 0; row * r * 1.52 < h + r; row++)
      for (let col = -1; col * r * 1.76 < w + r; col++) hex(o, col * r * 1.76 + (row % 2) * r * 0.88, row * r * 1.52, r * 0.8);
  });

/** Un mot de charabia, pour une onomatopée ou un titre. */
const word = (r: () => number, min: number, max: number): string => {
  let text = '';
  const length = min + Math.floor(r() * (max - min + 1));
  for (let i = 0; i < length; i++) text += LETTERS[Math.floor(r() * LETTERS.length)];
  return text;
};

/** Les décors d'une case du reste de l'album ; `r` : le hasard de la case. */
const SCENES: ((r: () => number) => Scene)[] = [
  () => (o, w, h) => (room(o, w, h, h * 0.72), openBook(o, w * 0.5, h * 0.74, w * 0.16)),
  () => (o, w, h) => {
    for (let i = 0; i < 4; i++) {
      const k = 1 - i * 0.22;
      shelves(o, w * 0.5 - w * 0.48 * k, h * 0.04 + i * h * 0.05, w * 0.96 * k, h * 0.62 * k, 2);
    }
  },
  (r) => (o, w, h) =>
    hive(
      o,
      w * (0.4 + r() * 0.2),
      h * 0.55,
      h * 0.18,
      [...Array(8)].map(() => (r() < 0.2 ? null : r() < 0.5 ? CLOSED : '#fff')),
    ),
  (r) => (o, w, h) => {
    const n = 2 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++)
      closedBook(o, w * (0.2 + (i * 0.6) / n), h * 0.62, w * 0.1, h * (0.3 + r() * 0.25), r() < 0.3 ? '#000' : '#fff');
  },
  (r) => (o, w, h) => vitrine(o, w * 0.14, h * 0.3, w * 0.72, h * 0.62, 5, 3, Math.floor(r() * 15), Math.floor(r() * 15)),
  (r) => (o, w, h) => {
    for (let i = 0; i < 5; i++) seal(o, w * (0.14 + i * 0.18), h * (0.45 + (i % 2) * 0.2), h * 0.09, r() < 0.5);
  },
  () => (o, w, h) => (speed(o, w * 0.4, h * 0.3, w * 0.3, 4, h * 0.1), openBook(o, w * 0.66, h * 0.5, w * 0.24)),
  () => (o, w, h) => {
    ring(o, w * 0.5, h * 0.6, h * 0.22);
    limb(o, w * 0.5, h * 0.6, w * 0.5, h * 0.44, LINE() * 1.6);
    limb(o, w * 0.5, h * 0.6, w * 0.62, h * 0.66, LINE() * 1.6);
  },
  (r) => (o, w, h) => {
    room(o, w, h, h * 0.72);
    for (let i = 0; i < 8; i++) dot(o, w * (0.2 + r() * 0.6), h * (0.2 + r() * 0.5), LINE() * 0.8);
  },
  () => (o, w, h) => box(o, w * 0.06, h * 0.08, w * 0.88, h * 0.86),
];

/** Une case du reste de l'album : un décor au hasard, et peut-être un récitatif, une bulle, une onomatopée. */
const noisePanel = (ctx: Ctx, x: number, y: number, w: number, h: number, r: () => number): void => {
  const kind = Math.floor(r() * SCENES.length);
  const scene = SCENES[kind](r);
  const seed = Math.floor(r() * 1e6);
  panel(ctx, x, y, w, h, scene, (px, py, pw, ph) => {
    // La page ouverte : du charabia dedans.
    if (kind === SCENES.length - 1) charabia(ctx, px + pw * 0.1, py + ph * 0.22, pw * 0.8, Math.floor((ph * 0.66) / (CELL + 2)), seed);
    if (r() < 0.45)
      caption(ctx, px + 8, r() < 0.6 ? py + 8 : py + ph - 50, Math.min(pw - 16, 260), babel(18 + Math.floor(r() * 40), seed + 1).trim());
    else if (r() < 0.5 && pw > 200)
      bubble(
        ctx,
        px + pw * (0.3 + r() * 0.4),
        py + ph * 0.3,
        babel(10 + Math.floor(r() * 24), seed + 2).trim(),
        px + pw * 0.5,
        py + ph * 0.7,
        pw * 0.4,
      );
    if (r() < 0.3) sound(ctx, px + pw * (0.1 + r() * 0.5), py + ph * (0.4 + r() * 0.4), word(r, 3, 6), 24 + r() * 8, (r() - 0.5) * 0.3);
  });
};

/** La planche `n` (9 et plus) du reste de l'album : trois rangées de une à trois cases, parfois un titre. */
export const paintNoisePlate = (ctx: Ctx, n: number): void => {
  const r = seeded(n * 7919 + 13);
  const titled = r() < 0.2;
  if (titled) plateTitle(ctx, `${n}. ${word(r, 4, 9).toUpperCase()}`);
  const top = titled ? 66 : 30;
  const row = (H - top - 40 - 2 * GUTTER) / 3;
  for (let j = 0; j < 3; j++) {
    const roll = r();
    const count = roll < 0.2 ? 1 : roll < 0.75 ? 2 : 3;
    // Des largeurs inégales, comme une vraie planche.
    const weights = [...Array(count)].map(() => 0.7 + r() * 0.6);
    const total = weights.reduce((a, b) => a + b, 0);
    const free = W - 2 * MARGIN - (count - 1) * GUTTER;
    let x = MARGIN;
    weights.forEach((weight) => {
      const w = (free * weight) / total;
      noisePanel(ctx, x, top + j * (row + GUTTER), w, row, r);
      x += w + GUTTER;
    });
  }
  folio(ctx, n);
};
