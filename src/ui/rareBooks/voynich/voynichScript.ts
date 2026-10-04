/**
 * L'écriture du Manuscrit de Voynich (maquettes .ai/maquette-voynich.html et -pages.html) : des glyphes
 * tracés à la plume, une imitation, pas une police. Des « mots » faits de débuts, de milieux et de fins qui
 * reviennent sans cesse, comme dans le vrai. Rien ne se lit.
 */

export type Random = () => number;
type Context = CanvasRenderingContext2D;

/** Hasard reproductible (Park-Miller), le même que les maquettes : mêmes signes aux mêmes places. */
export const rng =
  (seed: number): Random =>
  (): number =>
    ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** L'encre brune des traits. */
export const INK = 'rgba(62,36,18,0.85)';
/** L'encre rouge de la colonne de signes, à la première page. */
export const RED_INK = 'rgba(150,52,30,0.85)';

/** Chaque glyphe est un tracé dans une case de hauteur u (hauteur d'x) ; il rend son avance (en u). */
type Glyph = (c: Context, x: number, y: number, u: number) => number;

const k: Glyph = (c, x, y, u) => {
  c.moveTo(x + 0.2 * u, y);
  c.lineTo(x + 0.28 * u, y - 1.6 * u);
  c.bezierCurveTo(x + 0.32 * u, y - 2.05 * u, x + 1.25 * u, y - 1.55 * u, x + 0.9 * u, y - 0.9 * u);
  c.moveTo(x + 0.55 * u, y - 1.05 * u);
  c.quadraticCurveTo(x + 1.15 * u, y - 1.2 * u, x + 1.0 * u, y);
  return 1.3;
};

const GLYPHS: Record<string, Glyph> = {
  o: (c, x, y, u) => {
    c.ellipse(x + 0.42 * u, y - 0.48 * u, 0.36 * u, 0.46 * u, 0, 0, Math.PI * 2);
    return 0.9;
  },
  e: (c, x, y, u) => {
    c.arc(x + 0.42 * u, y - 0.45 * u, 0.4 * u, Math.PI * 0.25, Math.PI * 1.75);
    return 0.75;
  },
  i: (c, x, y, u) => {
    c.moveTo(x + 0.2 * u, y - 0.85 * u);
    c.quadraticCurveTo(x + 0.15 * u, y - 0.4 * u, x + 0.24 * u, y);
    return 0.42;
  },
  a: (c, x, y, u) => {
    c.arc(x + 0.4 * u, y - 0.45 * u, 0.38 * u, Math.PI * 0.2, Math.PI * 1.8);
    c.moveTo(x + 0.8 * u, y - 0.85 * u);
    c.quadraticCurveTo(x + 0.76 * u, y - 0.3 * u, x + 0.86 * u, y);
    return 1.05;
  },
  n: (c, x, y, u) => {
    c.moveTo(x + 0.2 * u, y - 0.85 * u);
    c.lineTo(x + 0.22 * u, y);
    c.bezierCurveTo(x + 0.6 * u, y + 0.05 * u, x + 0.9 * u, y - 0.5 * u, x + 0.65 * u, y - 1.05 * u);
    return 0.95;
  },
  r: (c, x, y, u) => {
    c.moveTo(x + 0.2 * u, y - 0.85 * u);
    c.lineTo(x + 0.22 * u, y);
    c.quadraticCurveTo(x + 0.55 * u, y - 0.1 * u, x + 0.62 * u, y - 0.55 * u);
    return 0.78;
  },
  l: (c, x, y, u) => {
    c.moveTo(x + 0.45 * u, y - 0.9 * u);
    c.bezierCurveTo(x - 0.1 * u, y - 0.6 * u, x + 0.1 * u, y, x + 0.4 * u, y);
    c.quadraticCurveTo(x + 0.8 * u, y, x + 0.85 * u, y - 0.45 * u);
    return 0.95;
  },
  y: (c, x, y, u) => {
    c.arc(x + 0.42 * u, y - 0.45 * u, 0.38 * u, Math.PI * 0.2, Math.PI * 1.8);
    c.moveTo(x + 0.78 * u, y - 0.75 * u);
    c.bezierCurveTo(x + 0.85 * u, y + 0.2 * u, x + 0.4 * u, y + 0.65 * u, x - 0.05 * u, y + 0.45 * u);
    return 0.95;
  },
  d: (c, x, y, u) => {
    c.ellipse(x + 0.42 * u, y - 0.4 * u, 0.34 * u, 0.4 * u, 0, 0, Math.PI * 2);
    c.moveTo(x + 0.76 * u, y - 0.4 * u);
    c.bezierCurveTo(x + 0.8 * u, y - 1.2 * u, x + 0.2 * u, y - 1.5 * u, x + 0.05 * u, y - 1.1 * u);
    return 1.0;
  },
  s: (c, x, y, u) => {
    c.arc(x + 0.42 * u, y - 0.45 * u, 0.38 * u, Math.PI * 0.25, Math.PI * 1.6);
    c.moveTo(x + 0.3 * u, y - 0.85 * u);
    c.quadraticCurveTo(x + 0.6 * u, y - 1.3 * u, x + 0.9 * u, y - 1.0 * u);
    return 0.85;
  },
  // « ch » : deux c liés par le haut.
  c: (c, x, y, u) => {
    c.arc(x + 0.42 * u, y - 0.45 * u, 0.4 * u, Math.PI * 0.3, Math.PI * 1.75);
    c.moveTo(x + 0.6 * u, y - 0.82 * u);
    c.lineTo(x + 1.15 * u, y - 0.82 * u);
    c.arc(x + 1.15 * u, y - 0.45 * u, 0.4 * u, Math.PI * 1.5, Math.PI * 1.75);
    c.moveTo(x + 1.07 * u, y - 0.07 * u);
    c.arc(x + 1.15 * u, y - 0.45 * u, 0.4 * u, Math.PI * 0.4, Math.PI * 1.1);
    return 1.6;
  },
  // Les grandes lettres à boucles (les « potences »).
  k,
  t: (c, x, y, u) => {
    c.moveTo(x + 0.5 * u, y);
    c.lineTo(x + 0.58 * u, y - 1.6 * u);
    c.bezierCurveTo(x + 0.62 * u, y - 2.05 * u, x + 1.55 * u, y - 1.55 * u, x + 1.2 * u, y - 0.9 * u);
    c.moveTo(x + 0.58 * u, y - 1.6 * u);
    c.bezierCurveTo(x + 0.2 * u, y - 1.9 * u, x - 0.05 * u, y - 1.3 * u, x + 0.3 * u, y - 0.95 * u);
    c.moveTo(x + 0.85 * u, y - 1.05 * u);
    c.quadraticCurveTo(x + 1.45 * u, y - 1.2 * u, x + 1.3 * u, y);
    return 1.6;
  },
  p: (c, x, y, u) => {
    k(c, x, y, u);
    c.moveTo(x + 0.28 * u, y - 1.6 * u);
    c.quadraticCurveTo(x - 0.1 * u, y - 2.0 * u, x - 0.05 * u, y - 1.5 * u);
    return 1.35;
  },
  q: (c, x, y, u) => {
    c.moveTo(x + 0.62 * u, y + 0.25 * u);
    c.lineTo(x + 0.6 * u, y - 1.0 * u);
    c.lineTo(x + 0.05 * u, y - 0.32 * u);
    c.lineTo(x + 0.95 * u, y - 0.32 * u);
    return 1.05;
  },
};

/** Les avances des glyphes, pour mesurer un mot sans le tracer. */
const ADVANCES: Record<string, number> = {
  o: 0.9,
  e: 0.75,
  i: 0.42,
  a: 1.05,
  n: 0.95,
  r: 0.78,
  l: 0.95,
  y: 0.95,
  d: 1,
  s: 0.85,
  c: 1.6,
  k: 1.3,
  t: 1.6,
  p: 1.35,
  q: 1.05,
};
/** Les lettres se serrent un peu. */
const TIGHT = 0.92;

const WORD_PARTS = [
  ['qo', 'o', 'ch', 'sh', 'd', 'y', 'ok', 'ot', 's', 'cth'],
  ['', 'k', 't', 'e', 'ee', 'a', 'ai', 'ch', 'ke', 'te', 'o', 'l'],
  ['dy', 'y', 'iin', 'in', 'ol', 'or', 'ar', 'al', 'aiin', 'edy', 'ey', 'am'],
];

/** Un « mot » à la façon du manuscrit : un début, un milieu, une fin. */
export const word = (random: Random): string =>
  WORD_PARTS.map((parts) => parts[Math.floor(random() * parts.length)])
    .join('')
    .replace(/sh/g, 'sc')
    .replace(/ch/g, 'c')
    .replace(/cth/g, 'ct');

/** La largeur d'un mot de hauteur d'x `u`. */
export const wordWidth = (text: string, u: number): number =>
  [...text].reduce((width, letter) => width + (GLYPHS[letter] ? ADVANCES[letter] * u * TIGHT : 0), 0);

/** Trace un mot ; rend sa largeur. Les lettres se touchent, la plume tremble un peu. */
export const voynichWord = (
  context: Context,
  text: string,
  x: number,
  y: number,
  u: number,
  random: Random,
  color = 'rgba(62,36,18,0.82)',
): number => {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(1, u * 0.13);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  let left = x;
  for (const letter of text) {
    const glyph = GLYPHS[letter];
    if (!glyph) continue;
    context.beginPath();
    const shake = (random() - 0.5) * u * 0.08;
    const advance = glyph(context, left, y + shake, u);
    context.stroke();
    left += advance * u * TIGHT;
  }
  context.restore();
  return left - x;
};

/** Une plage [début, fin] à éviter sur la ligne `y` (une plante), ou null. */
export type Hole = (y: number) => readonly [number, number] | null;

/** Remplit des lignes de mots entre `x0` et `x1`, de `y0` à `y1` (interlignage `lead`), en contournant `skip`. */
export const voynichLines = (
  context: Context,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  u: number,
  lead: number,
  seed: number,
  skip: Hole = () => null,
  color?: string,
): void => {
  const random = rng(seed);
  for (let y = y0; y <= y1; y += lead) {
    let x = x0 + random() * u;
    const hole = skip(y);
    for (;;) {
      const text = word(random);
      const width = wordWidth(text, u);
      if (hole && x + width > hole[0] && x < hole[1]) {
        x = hole[1] + u * 0.6;
        continue;
      }
      if (x + width > x1) break;
      voynichWord(context, text, x, y, u, random, color);
      x += width + u * (0.7 + random() * 0.5);
    }
  }
};
