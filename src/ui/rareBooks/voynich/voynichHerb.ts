import { BLUE, GREEN, OCHRE, ROSE, leafPath, outline, painted } from './voynichDraw';
import { rng } from './voynichScript';

/**
 * Les plantes inventées des pages (maquette .ai/maquette-voynich-pages.html), en variantes : feuilles en
 * lance, rondes ou découpées ; fleur en coupe, en boule, en étoile, ou pas de fleur ; tubercule, bulbe ou
 * racines nues. (cx, base) = haut de la racine ; s = échelle (1 ≈ 300 au-dessus).
 */

export type Leaves = 'lance' | 'round' | 'lobed';
export type Flower = 'cup' | 'ball' | 'star' | 'none';
export type Root = 'tuber' | 'roots' | 'bulb';
export interface HerbKind {
  leaves?: Leaves;
  flower?: Flower;
  root?: Root;
}

type Context = CanvasRenderingContext2D;

export const herb = (
  context: Context,
  cx: number,
  base: number,
  s: number,
  seed: number,
  { leaves = 'lance', flower = 'cup', root = 'tuber' }: HerbKind = {},
): void => {
  const random = rng(seed);
  const lw = 2 * s + 0.6;
  const rootsFrom = (y: number, count: number, spread: number, length: number): void =>
    outline(
      context,
      (c) => {
        c.beginPath();
        for (let i = 0; i < count; i++) {
          const a = Math.PI * (0.5 - spread / 2 + (spread * i) / (count - 1));
          const l = length * (0.7 + random() * 0.6) * s;
          const sx = cx + Math.cos(a) * 14 * s;
          c.moveTo(sx, y);
          c.bezierCurveTo(
            sx + (random() - 0.5) * 50 * s,
            y + l * 0.4,
            sx + Math.cos(a) * l * 0.6,
            y + l * 0.7,
            sx + Math.cos(a) * l,
            y + l,
          );
        }
      },
      lw,
    );
  if (root === 'tuber') {
    rootsFrom(base + 44 * s, 6, 0.5, 100);
    painted(
      context,
      (c) => {
        c.beginPath();
        c.moveTo(cx - 10 * s, base);
        c.bezierCurveTo(cx - 70 * s, base + 4 * s, cx - 64 * s, base + 64 * s, cx, base + 60 * s);
        c.bezierCurveTo(cx + 64 * s, base + 64 * s, cx + 72 * s, base + 4 * s, cx + 10 * s, base);
        c.closePath();
      },
      OCHRE,
      lw,
    );
  } else if (root === 'bulb') {
    rootsFrom(base + 70 * s, 9, 0.7, 60);
    painted(
      context,
      (c) => {
        c.beginPath();
        c.moveTo(cx, base - 20 * s);
        c.bezierCurveTo(cx + 60 * s, base + 10 * s, cx + 50 * s, base + 76 * s, cx, base + 72 * s);
        c.bezierCurveTo(cx - 50 * s, base + 76 * s, cx - 60 * s, base + 10 * s, cx, base - 20 * s);
        c.closePath();
      },
      ROSE,
      lw,
    );
    outline(
      context,
      (c) => {
        c.beginPath();
        for (const side of [-1, 1]) {
          c.moveTo(cx, base - 16 * s);
          c.quadraticCurveTo(cx + side * 38 * s, base + 30 * s, cx + side * 8 * s, base + 70 * s);
        }
      },
      1 * s + 0.4,
    );
  } else {
    outline(
      context,
      (c) => {
        c.beginPath();
        for (let i = 0; i < 5; i++) {
          let [x, y] = [cx, base];
          c.moveTo(x, y);
          for (let step = 0; step < 4; step++) {
            const [nx, ny] = [x + (random() - 0.5) * 70 * s, y + (20 + random() * 25) * s];
            c.quadraticCurveTo(x + (random() - 0.5) * 50 * s, (y + ny) / 2, nx, ny);
            [x, y] = [nx, ny];
          }
        }
      },
      lw,
    );
  }
  // La tige.
  const top = base - 300 * s;
  outline(
    context,
    (c) => {
      c.beginPath();
      for (const d of [-5, 5]) {
        c.moveTo(cx + d * s, base);
        c.bezierCurveTo(cx + (d - 25) * s, base - 120 * s, cx + (d + 31) * s, base - 200 * s, cx + d * 0.8 * s, top + 30 * s);
      }
    },
    lw,
  );
  // Les feuilles, alternées, de plus en plus petites vers le haut.
  for (let i = 0; i < 5; i++) {
    const [t, side] = [i / 5, i % 2 ? 1 : -1];
    const [y, x] = [base - (40 + t * 220) * s, cx + Math.sin(t * 5) * 10 * s];
    const a = side > 0 ? -0.35 - t * 0.5 : Math.PI + 0.35 + t * 0.5;
    if (leaves === 'round') {
      const l = (62 - t * 24) * s;
      const [ex, ey, radius] = [x + Math.cos(a) * l, y + Math.sin(a) * l, (40 - t * 12) * s];
      outline(
        context,
        (c) => {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(ex, ey);
        },
        lw,
      );
      painted(
        context,
        (c) => {
          c.beginPath();
          c.arc(ex + Math.cos(a) * radius * 0.6, ey + Math.sin(a) * radius * 0.6, radius, 0, Math.PI * 2);
        },
        GREEN,
        lw,
      );
    } else if (leaves === 'lobed') {
      const l = (150 - t * 70) * s;
      outline(
        context,
        (c) => {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        },
        lw,
      );
      for (let lobe = 1; lobe <= 4; lobe++)
        for (const sd of [-1, 1]) {
          const [px, py] = [x + (Math.cos(a) * l * lobe) / 4.4, y + (Math.sin(a) * l * lobe) / 4.4];
          painted(context, leafPath(px, py, (30 - lobe * 3) * s, a + sd * 0.9, 8 * s), GREEN, 1.4 * s + 0.4);
        }
    } else {
      const [l, w] = [(150 - t * 70) * s, (34 - t * 10) * s];
      painted(context, leafPath(x, y, l, a, w), GREEN, lw);
      outline(
        context,
        (c) => {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + Math.cos(a) * l * 0.85, y + Math.sin(a) * l * 0.85);
        },
        1.2 * s + 0.4,
      );
    }
  }
  // La fleur.
  if (flower === 'cup') {
    for (let petal = 0; petal < 7; petal++)
      painted(context, leafPath(cx, top + 20 * s, 70 * s, -Math.PI / 2 + (petal - 3) * 0.3, 14 * s), BLUE, lw);
    painted(
      context,
      (c) => {
        c.beginPath();
        c.moveTo(cx - 34 * s, top + 8 * s);
        c.quadraticCurveTo(cx, top + 70 * s, cx + 34 * s, top + 8 * s);
        c.quadraticCurveTo(cx, top + 22 * s, cx - 34 * s, top + 8 * s);
        c.closePath();
      },
      ROSE,
      lw,
    );
  } else if (flower === 'ball') {
    painted(
      context,
      (c) => {
        c.beginPath();
        c.arc(cx, top, 46 * s, 0, Math.PI * 2);
      },
      BLUE,
      lw,
    );
    outline(
      context,
      (c) => {
        c.beginPath();
        for (let seedling = 0; seedling < 18; seedling++) {
          const [a, d] = [random() * Math.PI * 2, random() * 36 * s];
          c.moveTo(cx + Math.cos(a) * d + 4 * s, top + Math.sin(a) * d);
          c.arc(cx + Math.cos(a) * d, top + Math.sin(a) * d, 4 * s, 0, Math.PI * 2);
        }
      },
      1 * s + 0.4,
    );
  } else if (flower === 'star') {
    for (let petal = 0; petal < 8; petal++) painted(context, leafPath(cx, top + 10 * s, 56 * s, (petal * Math.PI) / 4, 12 * s), ROSE, lw);
    painted(
      context,
      (c) => {
        c.beginPath();
        c.arc(cx, top + 10 * s, 14 * s, 0, Math.PI * 2);
      },
      'rgba(200,160,70,0.6)',
      lw,
    );
  }
};
