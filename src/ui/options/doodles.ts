/**
 * Croquis au crayon sur les pages du cahier : chaque trait est repassé deux fois, un peu
 * de travers, comme dessiné à main levée. Tirage fixe : les mêmes griffonnages à chaque ouverture.
 */
type Point = [number, number];

const seeded = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
};

/** Un trait à main levée passant par ces points, repassé deux fois avec un léger écart. */
const sketch = (points: Point[], random: () => number, closed = false): string => {
  const jitter = (value: number): number => value + (random() - 0.5) * 2.2;
  const pass = (): string => {
    const list = closed ? [...points, points[0]] : points;
    return list.map(([x, y], i) => `${i ? 'L' : 'M'}${jitter(x).toFixed(1)} ${jitter(y).toFixed(1)}`).join(' ');
  };
  return `<path d="${pass()}"/><path d="${pass()}" opacity="0.6"/>`;
};

/** Un hexagone de la Bibliothèque, vu de haut, avec des étagères sur ses murs. */
const hexagon = (random: () => number): string => {
  const corner = (i: number, r: number): Point => [50 + r * Math.cos((Math.PI / 3) * i), 50 + r * Math.sin((Math.PI / 3) * i)];
  let paths = sketch(
    Array.from({ length: 6 }, (_, i) => corner(i, 40)),
    random,
    true,
  );
  for (const side of [0, 1, 3, 4]) {
    const [a, b] = [corner(side, 33), corner(side + 1, 33)];
    paths += sketch([a, b], random);
  }
  return paths;
};

/** Une pile de trois livres couchés. */
const books = (random: () => number): string =>
  [
    [12, 64, 76, 14],
    [18, 48, 66, 16],
    [8, 34, 72, 14],
  ]
    .map(
      ([x, y, w, h]) =>
        sketch(
          [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ],
          random,
          true,
        ) +
        sketch(
          [
            [x + 8, y + 3],
            [x + 8, y + h - 3],
          ],
          random,
        ),
    )
    .join('');

/** L'escalier en spirale qui relie les étages. */
const spiral = (random: () => number): string => {
  const points: Point[] = [];
  for (let t = 0; t < Math.PI * 5.5; t += 0.25) points.push([50 + (4 + t * 2.4) * Math.cos(t), 50 + (4 + t * 2.4) * Math.sin(t)]);
  return sketch(points, random);
};

const DOODLES = { hexagon, books, spiral };

export type DoodleKind = keyof typeof DOODLES;

/** Document SVG du croquis (100 × 100), tracé de la couleur `color`, prêt à dessiner sur une texture. */
export const doodleSvg = (kind: DoodleKind, seed: number, color: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 100 100" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${DOODLES[kind](seeded(seed))}</svg>`;
