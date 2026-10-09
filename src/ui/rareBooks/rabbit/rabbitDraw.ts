import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';

/**
 * Les outils du « Lapin de garenne » (maquettes .ai/maquette-lapin.html, piste A1 « la place vide », et
 * .ai/maquette-lapin-pages.html) : les polices IM Fell, la toile verte et son or, l'encre brune des gravures, et les
 * traits du graveur (herbe, hachures, empreintes, fleurons). Mesures des maquettes, sans échelle.
 */

export const FELL = "'IM Fell English', Georgia, serif";
export const FELL_SC = "'IM Fell English SC', Georgia, serif";

/** La toile verte (son milieu, ses bords). */
export const GREEN = '#2f5a34';
export const GREEN_EDGE = '#14301a';
/** L'encre brune, ses gris, et le papier des gravures. */
export const INK = '#3b2a1a';
export const SOFT = '#7a6248';
export const FAINT = '#b9a888';
export const PLATE_PAPER = '#f2e9d2';

export const loadRabbitFonts = (): Promise<unknown> =>
  Promise.all([`40px ${FELL}`, `italic 40px ${FELL}`, `40px ${FELL_SC}`].map((font) => document.fonts.load(font)));

/** Une encre : une couleur, ou le dégradé doré de la toile. */
export type Ink = string | CanvasGradient;

/** Texte posé sur sa ligne de base, comme dans les maquettes (centré : l'espacement final compensé). */
export const text = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  font: string,
  color: Ink,
  align: CanvasTextAlign = 'center',
  spacing = 0,
): void => {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(label, x + (align === 'center' ? spacing / 2 : 0), y);
  context.restore();
};

/** Le petit hexagone de la Bibliothèque (`fill` : plein). */
export const hexagon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  width: number,
  color: Ink,
  fill?: Ink,
): void => {
  context.save();
  context.beginPath();
  for (let side = 0; side < 6; side++) {
    const angle = (Math.PI / 3) * side - Math.PI / 2;
    context[side ? 'lineTo' : 'moveTo'](x + radius * Math.cos(angle), y + radius * Math.sin(angle));
  }
  context.closePath();
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  context.lineWidth = width;
  context.strokeStyle = color;
  context.stroke();
  context.restore();
};

/** Hasard reproductible (Park-Miller), le même que celui des maquettes. */
export const random = (seed: number): (() => number) => {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
};

/** Largeur de `label` à la police `font`. */
export const measure = (context: CanvasRenderingContext2D, label: string, font: string, spacing = 0): number => {
  context.save();
  context.font = font;
  context.letterSpacing = `${spacing}px`;
  const width = context.measureText(label).width;
  context.restore();
  return width;
};

/** Taille de police pour que `label` tienne dans `length` (jamais plus grande que `size`). */
export const fit = (context: CanvasRenderingContext2D, label: string, family: string, size: number, length: number, spacing = 0): number =>
  Math.min(size, (size * length) / measure(context, label, `${size}px ${family}`, spacing));

/** Dessine `draw` tourné d'un quart de tour (écrit au dos, de haut en bas), depuis (x, y). */
export const along = (context: CanvasRenderingContext2D, x: number, y: number, draw: () => void): void => {
  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 2);
  draw();
  context.restore();
};

/** Une ellipse en chemin (à remplir ou à tracer). */
export const ellipse = (context: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, angle = 0): void => {
  context.beginPath();
  context.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
};

/** Le dégradé doré, en biais sur `width` × `height`. */
export const gold = (context: CanvasRenderingContext2D, width: number, height: number): CanvasGradient => {
  const fill = context.createLinearGradient(0, 0, width, height);
  fill.addColorStop(0, '#a8803a');
  fill.addColorStop(0.5, '#f0d48a');
  fill.addColorStop(1, '#a8803a');
  return fill;
};

/** La toile verte et son grain (des fils fins, en long et en travers), comme la toile rouge d'Alice. */
export const cloth = (context: CanvasRenderingContext2D, width: number, height: number): void => {
  const fill = context.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, Math.max(width, height) * 0.7);
  fill.addColorStop(0, GREEN);
  fill.addColorStop(1, GREEN_EDGE);
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);
  context.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < height; y += 3) context.fillRect(0, y, width, 1);
  context.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = 0; x < width; x += 3) context.fillRect(x, 0, 1, height);
};

/** Les brins d'herbe : ceux des planches (fins), ou ceux de la couverture (`cover` : plus hauts, plus épais). */
export interface GrassStyle {
  tall?: number;
  cover?: boolean;
  /** Brins par pas de 5 (1 par défaut). */
  density?: number;
}

/** Des brins d'herbe gravés, de `x0` à `x1`, pied sur la ligne `ground(x)`. */
export const grass = (
  context: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  ground: (x: number) => number,
  color: Ink,
  seed: number,
  { tall = 1, cover = false, density = 1 }: GrassStyle = {},
): void => {
  const next = random(seed);
  context.save();
  context.strokeStyle = color;
  context.lineCap = 'round';
  for (let x = x0; x < x1; x += 5 / density) {
    const gx = x + (next() - 0.5) * 4;
    const gy = ground(gx);
    const height = ((cover ? 14 : 12) + next() * (cover ? 26 : 22)) * tall;
    const bend = (next() - 0.5) * (cover ? 14 : 12);
    context.lineWidth = cover ? 1.2 + next() * 1.3 : 0.8 + next();
    context.beginPath();
    context.moveTo(gx, gy);
    context.quadraticCurveTo(gx + bend * 0.3, gy - height * 0.6, gx + bend, gy - height);
    context.stroke();
  }
  context.restore();
};

/**
 * Des hachures horizontales, un peu tremblées, de `y0` à `y1`, tous les `step` ; chaque trait raccourci au hasard
 * d'au plus `jitter` à chaque bout.
 */
export const hatch = (
  context: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  seed: number,
  step: number,
  color: Ink,
  width = 1,
  jitter = 20,
): void => {
  const next = random(seed);
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  for (let y = y0; y < y1; y += step) {
    const from = x0 + next() * jitter;
    const to = x1 - next() * jitter;
    context.beginPath();
    context.moveTo(from, y);
    context.lineTo(to, y + (next() - 0.5) * 3);
    context.stroke();
  }
  context.restore();
};

/** Une empreinte de lapin : deux longues pattes arrière devant, deux petites pattes avant derrière, en Y. */
export const track = (context: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, color: string): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.fillStyle = color;
  for (const [ex, ey, rx, ry, tilt] of [
    [-10, -26, 6, 15, -0.12],
    [10, -26, 6, 15, 0.12],
    [-2, 4, 5, 6, 0],
    [1, 22, 5, 6, 0],
  ]) {
    ellipse(context, ex * size, ey * size, rx * size, ry * size, tilt);
    context.fill();
  }
  context.restore();
};

/** Un petit fleuron : un losange et deux feuilles. */
export const fleuron = (context: CanvasRenderingContext2D, x: number, y: number, size: number, color: Ink): void => {
  context.save();
  context.translate(x, y);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, -6 * size);
  context.lineTo(6 * size, 0);
  context.lineTo(0, 6 * size);
  context.lineTo(-6 * size, 0);
  context.closePath();
  context.fill();
  for (const side of [-1, 1]) {
    ellipse(context, side * 18 * size, 0, 10 * size, 3.5 * size);
    context.fill();
  }
  context.restore();
};
