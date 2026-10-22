import { messages } from '../../../i18n';
import {
  CELL,
  GUTTER,
  H,
  LINE,
  MARGIN,
  W,
  babel as babelLine,
  caption,
  charabia,
  folio,
  grid,
  panel,
  plateTitle,
  sound,
  type Scene,
} from './comicDraw';
import {
  CLOSED,
  box,
  closedBook,
  dot,
  floor,
  hex,
  hive,
  hiveAt,
  limb,
  openBook,
  pointer,
  rays,
  ring,
  room,
  seal,
  shelves,
  speed,
  turningPage,
  vitrine,
} from './comicScenes';

/**
 * Les huit planches de « Gare aux pages » (maquette .ai/maquette-bd-notice.html, validée le 22/10) : un titre, une
 * grande case, puis quatre demi-cases. Pas de héros : ce qu'on voit dans le jeu. Les récitatifs et les mots des écrans
 * sont dans i18n (rareBooks.comicNotice.plates).
 */

type Ctx = CanvasRenderingContext2D;
type Over = (x: number, y: number, w: number, h: number) => void;
type Cell = [Scene, Over?];

const TOP = 66;
const ROW = (H - TOP - 40 - 2 * GUTTER) / 3;
const FULL = W - 2 * MARGIN;
const HALF = (FULL - GUTTER) / 2;
const PLACES = [
  [MARGIN, TOP, FULL],
  [MARGIN, TOP + ROW + GUTTER, HALF],
  [MARGIN + HALF + GUTTER, TOP + ROW + GUTTER, HALF],
  [MARGIN, TOP + 2 * (ROW + GUTTER), HALF],
  [MARGIN + HALF + GUTTER, TOP + 2 * (ROW + GUTTER), HALF],
];

const none: Scene = () => {};

/** Les cases de la planche `n` (de 1 à 8) : `c` ses récitatifs, `w` les mots de ses écrans. */
const CELLS: ((ctx: Ctx, c: readonly string[], w: readonly string[]) => Cell[])[] = [
  // 1. Lire.
  (ctx, c, w) => [
    [
      (o, pw, ph) => (room(o, pw, ph, ph * 0.72), openBook(o, pw * 0.5, ph * 0.74, pw * 0.16)),
      (x, y) => caption(ctx, x + 8, y + 8, 200, c[0]),
    ],
    [
      (o, pw, ph) => box(o, pw * 0.06, ph * 0.06, pw * 0.88, ph * 0.9),
      (x, y, pw, ph) => {
        charabia(ctx, x + pw * 0.1, y + ph * 0.3, pw * 0.8, 9, 7);
        caption(ctx, x + 8, y + 8, pw - 16, c[1]);
      },
    ],
    [
      (o, pw, ph) => (openBook(o, pw * 0.46, ph * 0.36, pw * 0.4), turningPage(o, pw, ph)),
      (x, y, pw, ph) => {
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
        sound(ctx, x + pw * 0.66, y + ph * 0.86, 'frrt', 28);
      },
    ],
    [
      (o, pw, ph) => limb(o, pw * 0.2, ph * 0.62, pw * 0.8, ph * 0.62, LINE()),
      (x, y, pw, ph) => {
        grid(ctx, x + pw / 2, y + ph * 0.36, w[0], 34, 'center');
        grid(ctx, x + pw / 2, y + ph * 0.66, w[1], CELL + 3, 'center');
        caption(ctx, x + 8, y + ph - 46, pw - 16, c[3]);
      },
    ],
    [
      (o, pw, ph) => {
        for (let i = 0; i < 4; i++) {
          const k = 1 - i * 0.22;
          shelves(o, pw * 0.5 - pw * 0.48 * k, ph * 0.04 + i * ph * 0.05, pw * 0.96 * k, ph * 0.62 * k, 2);
        }
        floor(o, pw, ph * 0.9);
      },
      (x, y, pw, ph) => caption(ctx, x + 8, y + ph - 50, pw - 16, c[4]),
    ],
  ],
  // 2. Se faire aider.
  (ctx, c, w) => [
    [
      (o, pw, ph) => hive(o, pw * 0.64, ph * 0.56, ph * 0.22, ['#fff', CLOSED, CLOSED, CLOSED, CLOSED, null, null, null]),
      (x, y, pw, ph) => {
        const [hx, hy] = hiveAt(x + pw * 0.64, y + ph * 0.56, ph * 0.22, 0);
        grid(ctx, hx, hy - 12, w[0], CELL + 1, 'center');
        grid(ctx, hx, hy, w[1], CELL + 1, 'center');
        caption(ctx, x + 8, y + 8, 230, c[0]);
        caption(ctx, x + 8, y + ph - 46, 230, c[1]);
      },
    ],
    [
      (o, pw, ph) => (hex(o, pw * 0.45, ph * 0.56, ph * 0.3), pointer(o, pw * 0.56, ph * 0.6, ph * 0.24)),
      (x, y, pw, ph) => {
        grid(ctx, x + pw * 0.45, y + ph * 0.48, w[2], CELL + 4, 'center');
        grid(ctx, x + pw * 0.45, y + ph * 0.6, w[3], CELL + 1, 'center');
        sound(ctx, x + pw * 0.66, y + ph * 0.5, 'tac', 28, 0.15);
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => {
        for (let i = 0; i < 3; i++) limb(o, pw * (0.2 + i * 0.3), ph * 0.86, pw * (0.2 + i * 0.3), ph * 0.66, LINE() * 1.4);
      },
      (x, y, pw, ph) => {
        grid(ctx, x + pw / 2, y + ph * 0.3, w[4], 26, 'center');
        grid(ctx, x + pw / 2, y + ph * 0.5, w[5], CELL + 3, 'center');
        caption(ctx, x + 8, y + 8, pw - 16, c[3]);
      },
    ],
    [
      (o, pw, ph) => {
        for (let i = 0; i < 3; i++) hex(o, pw * (0.2 + i * 0.3), ph * 0.62, ph * 0.2);
      },
      (x, y, pw, ph) => {
        w.slice(6, 9).forEach((price, i) => grid(ctx, x + pw * (0.2 + i * 0.3) + 4, y + ph * 0.6, price, CELL, 'center'));
        caption(ctx, x + 8, y + 8, pw - 16, c[4]);
      },
    ],
    [
      (o, pw, ph) => hive(o, pw * 0.5, ph * 0.48, ph * 0.17, ['#fff', '#fff', CLOSED, CLOSED, CLOSED, CLOSED, CLOSED, CLOSED]),
      (x, y, pw, ph) => caption(ctx, x + 8, y + ph - 50, pw - 16, c[5]),
    ],
  ],
  // 3. Comprendre.
  (ctx, c, w) => [
    [
      (o, pw, ph) => box(o, pw * 0.04, ph * 0.06, pw * 0.92, ph * 0.9),
      (x, y, pw, ph) => {
        charabia(ctx, x + pw * 0.08, y + ph * 0.3, pw * 0.84, 10, 21, 4, w[0]);
        caption(ctx, x + 8, y + 8, 260, c[0]);
        caption(ctx, x + pw - 250, y + ph - 46, 242, c[1]);
      },
    ],
    [
      none,
      (x, y, pw, ph) => {
        grid(ctx, x + pw / 2, y + ph * 0.3, w[1], CELL + 3, 'center');
        // Le compteur qui grossit : le mot de plus en plus long, de plus en plus gros.
        for (let i = 0; i < 4; i++) {
          const word = w[2].slice(0, Math.min(w[2].length, Math.round(w[2].length * (0.5 + i * 0.25))));
          grid(ctx, x + pw / 2, y + ph * (0.42 + i * 0.1), word, CELL + 2 + i * 3, 'center');
        }
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => {
        box(o, pw * 0.06, ph * 0.28, pw * 0.88, ph * 0.66);
        limb(o, pw * 0.5, ph * 0.28, pw * 0.5, ph * 0.94, LINE());
        box(o, pw * 0.6, ph * 0.72, pw * 0.28, ph * 0.14);
      },
      (x, y, pw, ph) => {
        for (let i = 0; i < 3; i++) grid(ctx, x + pw * 0.1, y + ph * (0.36 + i * 0.1), babelLine(14, 3 + i));
        grid(ctx, x + pw * 0.74, y + ph * 0.4, w[3], CELL + 2, 'center');
        grid(ctx, x + pw * 0.74, y + ph * 0.5, w[4], CELL + 2, 'center');
        grid(ctx, x + pw * 0.74, y + ph * 0.755, w[5], CELL, 'center');
        caption(ctx, x + 8, y + 8, pw - 16, c[3]);
      },
    ],
    [
      (o, pw, ph) => box(o, pw * 0.22, ph * 0.42, pw * 0.56, ph * 0.26),
      (x, y, pw, ph) => {
        grid(ctx, x + pw / 2, y + ph * 0.5, w[5], CELL + 6, 'center');
        sound(ctx, x + pw * 0.62, y + ph * 0.4, 'tac', 30, 0.15);
        caption(ctx, x + 8, y + 8, pw - 16, c[4]);
      },
    ],
    [
      (o, pw, ph) => {
        speed(o, pw * 0.4, ph * 0.3, pw * 0.3, 4, ph * 0.1);
        openBook(o, pw * 0.66, ph * 0.5, pw * 0.24);
        for (let i = 0; i < 3; i++) {
          o.save();
          o.translate(pw * (0.6 + i * 0.1), ph * (0.3 - i * 0.06));
          o.rotate(0.3 + i * 0.3);
          box(o, -12, -16, 24, 32);
          o.restore();
        }
      },
      (x, y, pw, ph) => {
        caption(ctx, x + 8, y + ph - 50, pw - 16, c[5]);
        sound(ctx, x + pw * 0.06, y + ph * 0.24, 'frrrrt', 26, -0.06);
      },
    ],
  ],
  // 4. Trouver : la phrase de la Lecture Diagonale, morceau par morceau.
  (ctx, c, w) => [
    [
      (o, pw, ph) => box(o, pw * 0.04, ph * 0.06, pw * 0.92, ph * 0.9),
      (x, y, pw, ph) => {
        charabia(ctx, x + pw * 0.08, y + ph * 0.3, pw * 0.84, 10, 41, 5, w[0]);
        caption(ctx, x + 8, y + 8, 260, c[0]);
        caption(ctx, x + pw - 210, y + ph - 46, 202, c[1]);
      },
    ],
    [
      (o, pw, ph) => box(o, pw * 0.08, ph * 0.3, pw * 0.84, ph * 0.62),
      (x, y, pw, ph) => {
        grid(ctx, x + pw * 0.14, y + ph * 0.48, w[1], CELL + 1);
        grid(ctx, x + pw * 0.14, y + ph * 0.6, w[2], CELL + 1);
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => box(o, pw * 0.08, ph * 0.3, pw * 0.84, ph * 0.62),
      (x, y, pw, ph) => {
        grid(ctx, x + pw * 0.14, y + ph * 0.48, w[3], CELL + 1);
        grid(ctx, x + pw * 0.14, y + ph * 0.6, w[4], CELL + 1);
        caption(ctx, x + 8, y + 8, pw - 16, c[3]);
      },
    ],
    [
      (o, pw, ph) => {
        hive(o, pw * 0.5, ph * 0.5, ph * 0.15, ['#fff', '#fff', CLOSED, CLOSED, CLOSED, null, null, null]);
        const [hx, hy] = hiveAt(pw * 0.5, ph * 0.5, ph * 0.15, 1);
        rays(o, hx, hy, ph * 0.17, ph * 0.25, 10);
      },
      (x, y, pw, ph) => caption(ctx, x + 8, y + ph - 50, pw - 16, c[4]),
    ],
    [
      (o, pw, ph) => (speed(o, pw * 0.36, ph * 0.3, pw * 0.28, 4, ph * 0.1), openBook(o, pw * 0.64, ph * 0.46, pw * 0.24)),
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.06, y + ph * 0.22, 'frrrt', 24, -0.06);
        caption(ctx, x + 8, y + ph - 50, pw - 16, c[5]);
      },
    ],
  ],
  // 5. Attraper : la lettre qui s'échappe.
  (ctx, c, w) => [
    [
      (o, pw, ph) => {
        room(o, pw, ph, ph * 0.72);
        openBook(o, pw * 0.5, ph * 0.74, pw * 0.16);
        for (let i = 0; i < 6; i++) dot(o, pw * (0.5 + Math.sin(i) * 0.02), ph * (0.7 - i * 0.07), LINE() * 0.8);
      },
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.5, y + ph * 0.3, 'q', 40, 0.2);
        caption(ctx, x + 8, y + 8, 220, c[0]);
      },
    ],
    [
      (o, pw, ph) => pointer(o, pw * 0.46, ph * 0.5, ph * 0.34),
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.36, y + ph * 0.56, 'q', 36, 0.2);
        sound(ctx, x + pw * 0.62, y + ph * 0.4, 'tac', 28, 0.15);
        caption(ctx, x + 8, y + 8, pw - 16, c[1]);
      },
    ],
    [
      (o, pw, ph) => (ring(o, pw * 0.32, ph * 0.58, ph * 0.16, 0.7), limb(o, pw * 0.55, ph * 0.66, pw * 0.86, ph * 0.66, LINE())),
      (x, y, pw, ph) => {
        grid(ctx, x + pw * 0.32, y + ph * 0.54, 'q', 22, 'center');
        grid(ctx, x + pw * 0.7, y + ph * 0.5, w[0], CELL + 4, 'center');
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => {
        for (let i = 0; i < 14; i++) dot(o, pw * (0.3 + (i % 5) * 0.1), ph * (0.38 + Math.floor(i / 5) * 0.1), LINE() * 0.7);
      },
      (x, y, pw, ph) => caption(ctx, x + 8, y + ph - 50, pw - 16, c[3]),
    ],
    [
      (o, pw, ph) => openBook(o, pw * 0.5, ph * 0.74, pw * 0.2),
      (x, y, pw, ph) => {
        for (const [letter, fx, fy, a] of [
          ['q', 0.3, 0.4, 0.2],
          ['f', 0.5, 0.26, -0.15],
          ['z', 0.7, 0.42, 0.1],
        ] as const)
          sound(ctx, x + pw * fx, y + ph * fy, letter, 32, a);
        caption(ctx, x + 8, y + ph - 50, pw - 16, c[4]);
      },
    ],
  ],
  // 6. Ranger : le livre refermé, le livre rare, la vitrine.
  (ctx, c, w) => [
    [
      (o, pw, ph) => (room(o, pw, ph, ph * 0.72), closedBook(o, pw * 0.5, ph * 0.74, pw * 0.14, ph * 0.18)),
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.58, y + ph * 0.62, 'clac', 30, -0.1);
        caption(ctx, x + 8, y + 8, 220, c[0]);
      },
    ],
    [
      (o, pw, ph) => (shelves(o, pw * 0.06, ph * 0.3, pw * 0.88, ph * 0.6, 2), rays(o, pw * 0.5, ph * 0.48, ph * 0.12, ph * 0.2, 10)),
      (x, y, pw) => caption(ctx, x + 8, y + 8, pw - 16, c[1]),
    ],
    [
      (o, pw, ph) => (closedBook(o, pw * 0.32, ph * 0.62, pw * 0.3, ph * 0.5), box(o, pw * 0.56, ph * 0.36, pw * 0.36, ph * 0.52)),
      (x, y, pw, ph) => {
        grid(ctx, x + pw * 0.34, y + ph * 0.56, w[0], CELL + 4, 'center');
        w.slice(1, 6).forEach((line, i) => grid(ctx, x + pw * 0.6, y + ph * (0.44 + i * 0.08), line, CELL - 1));
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => vitrine(o, pw * 0.14, ph * 0.3, pw * 0.72, ph * 0.62, 5, 3, 7, 7),
      (x, y, pw) => caption(ctx, x + 8, y + 8, pw - 16, c[3]),
    ],
    [
      (o, pw, ph) => box(o, pw * 0.18, ph * 0.4, pw * 0.64, ph * 0.26),
      (x, y, pw, ph) => {
        grid(ctx, x + pw / 2, y + ph * 0.46, w[6], CELL + 4, 'center');
        caption(ctx, x + 8, y + ph - 50, pw - 16, c[4]);
      },
    ],
  ],
  // 7. Collectionner : le Grand Livre et ses sceaux.
  (ctx, c, w) => [
    [
      (o, pw, ph) => {
        box(o, pw * 0.08, ph * 0.08, pw * 0.84, ph * 0.86);
        limb(o, pw * 0.5, ph * 0.08, pw * 0.5, ph * 0.94, LINE());
        for (let k = 0; k < 24; k++) {
          const [side, i, j] = [k < 12 ? 0 : 1, k % 4, Math.floor((k % 12) / 4)];
          seal(o, pw * (0.16 + side * 0.42 + i * 0.09), ph * (0.36 + j * 0.2), ph * 0.07, (k * 7) % 5 < 2);
        }
      },
      (x, y) => caption(ctx, x + 8, y + 8, 300, c[0]),
    ],
    [
      none,
      (x, y, pw, ph) => {
        for (let i = 0; i < 3; i++) {
          grid(ctx, x + pw * 0.12, y + ph * (0.4 + i * 0.16), w[i * 2], CELL + 1);
          grid(ctx, x + pw * 0.88, y + ph * (0.4 + i * 0.16), w[i * 2 + 1], CELL + 1, 'right');
        }
        caption(ctx, x + 8, y + 8, pw - 16, c[1]);
      },
    ],
    [
      (o, pw, ph) => (seal(o, pw * 0.5, ph * 0.58, ph * 0.2, true), rays(o, pw * 0.5, ph * 0.58, ph * 0.26, ph * 0.36, 14)),
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.7, y + ph * 0.4, 'dong', 26, 0.12);
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => seal(o, pw * 0.24, ph * 0.58, ph * 0.16, true),
      (x, y, pw, ph) => {
        grid(ctx, x + pw * 0.44, y + ph * 0.5, w[6], CELL + 3);
        grid(ctx, x + pw * 0.44, y + ph * 0.62, w[7], CELL - 1);
        caption(ctx, x + 8, y + 8, pw - 16, c[3]);
      },
    ],
    [
      (o, pw, ph) => {
        for (let i = 0; i < 4; i++) seal(o, pw * (0.2 + i * 0.2), ph * 0.42, ph * 0.08, true);
        openBook(o, pw * 0.5, ph * 0.62, pw * 0.18);
      },
      (x, y, pw, ph) => caption(ctx, x + 8, y + ph - 50, pw - 16, c[4]),
    ],
  ],
  // 8. Dormir : l'absence, et « un songe » au retour.
  (ctx, c, w) => [
    [
      (o, pw, ph) => {
        room(o, pw, ph, ph * 0.72);
        openBook(o, pw * 0.5, ph * 0.74, pw * 0.16);
        o.fillStyle = 'rgba(0,0,0,0.5)';
        o.fillRect(0, 0, pw, ph * 0.5);
      },
      (x, y, _pw, ph) => caption(ctx, x + 8, y + ph - 50, 240, c[0]),
    ],
    [
      (o, pw, ph) => hive(o, pw * 0.5, ph * 0.58, ph * 0.13, ['#fff', '#fff', '#fff', '#fff', CLOSED, null, null, null]),
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.62, y + ph * 0.3, 'zzz', 26, -0.1);
        caption(ctx, x + 8, y + 8, pw - 16, c[1]);
      },
    ],
    [
      (o, pw, ph) => box(o, pw * 0.1, ph * 0.3, pw * 0.8, ph * 0.62),
      (x, y, pw, ph) => {
        grid(ctx, x + pw / 2, y + ph * 0.36, w[0], CELL + 4, 'center');
        for (let i = 0; i < 3; i++) {
          grid(ctx, x + pw * 0.16, y + ph * (0.52 + i * 0.12), w[1 + i * 2], CELL);
          grid(ctx, x + pw * 0.84, y + ph * (0.52 + i * 0.12), w[2 + i * 2], CELL, 'right');
        }
        caption(ctx, x + 8, y + 8, pw - 16, c[2]);
      },
    ],
    [
      (o, pw, ph) => {
        ring(o, pw * 0.5, ph * 0.6, ph * 0.22);
        limb(o, pw * 0.5, ph * 0.6, pw * 0.5, ph * 0.44, LINE() * 1.6);
        limb(o, pw * 0.5, ph * 0.6, pw * 0.62, ph * 0.66, LINE() * 1.6);
      },
      (x, y, pw) => caption(ctx, x + 8, y + 8, pw - 16, c[3]),
    ],
    [
      (o, pw, ph) => openBook(o, pw * 0.46, ph * 0.36, pw * 0.4),
      (x, y, pw, ph) => {
        sound(ctx, x + pw * 0.62, y + ph * 0.82, 'frrt', 26);
        grid(ctx, x + pw * 0.16, y + ph * 0.84, w[7], 22);
        caption(ctx, x + 8, y + 8, pw - 16, c[4]);
      },
    ],
  ],
];

export const PLATES = CELLS.length;

/** Dessine la planche `n` (de 1 à 8) sur une page déjà préparée (le papier). */
export const paintPlate = (ctx: Ctx, n: number): void => {
  const plate = messages().rareBooks.comicNotice.plates[n - 1];
  ctx.save();
  plateTitle(ctx, `${n}. ${plate.title}`);
  CELLS[n - 1](ctx, plate.captions, plate.words).forEach(([scene, over], i) => {
    const [x, y, w] = PLACES[i];
    panel(ctx, x, y, w, ROW, scene, over);
  });
  folio(ctx, n);
  ctx.restore();
};
