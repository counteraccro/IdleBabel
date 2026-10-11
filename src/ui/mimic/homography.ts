/**
 * La perspective de la Mimic (maquette .ai/maquette-mimic.html) : chaque face du livre est un élément posé par une
 * homographie (CSS matrix3d) sur ses quatre coins à l'écran.
 */

export type Point = readonly [number, number];
type M3 = number[];

const adj = (m: M3): M3 => [
  m[4] * m[8] - m[5] * m[7],
  m[2] * m[7] - m[1] * m[8],
  m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8],
  m[0] * m[8] - m[2] * m[6],
  m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6],
  m[1] * m[6] - m[0] * m[7],
  m[0] * m[4] - m[1] * m[3],
];

const mm = (a: M3, b: M3): M3 => {
  const c: M3 = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j];
      c.push(s);
    }
  return c;
};

const mv = (m: M3, v: readonly number[]): number[] => [0, 1, 2].map((i) => m[3 * i] * v[0] + m[3 * i + 1] * v[1] + m[3 * i + 2] * v[2]);

const basis = (p: readonly Point[]): M3 => {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = mv(adj(m), [p[3][0], p[3][1], 1]);
  return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
};

/** Le rectangle w × h posé sur les quatre coins tl, tr, br, bl. */
export const homography = (w: number, h: number, [tl, tr, br, bl]: readonly Point[]): string => {
  let t = mm(
    basis([tl, tr, bl, br]),
    adj(
      basis([
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ]),
    ),
  );
  t = t.map((x) => x / t[8]);
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
};

/** Le point (x, y) est dans le quadrilatère convexe `q`. */
export const inQuad = (x: number, y: number, q: readonly Point[]): boolean => {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = q[i];
    const [bx, by] = q[(i + 1) % 4];
    const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (c !== 0) {
      if (sign && Math.sign(c) !== sign) return false;
      sign = Math.sign(c);
    }
  }
  return true;
};
