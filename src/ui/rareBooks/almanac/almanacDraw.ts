import '@fontsource/anton/400.css';
import '@fontsource/oswald/300.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/700.css';
import { WIDTH } from '../draw';

/**
 * Les outils de la couverture de l'Almanach (maquette .ai/maquette-almanach.html, piste A « Chrome 85 ») :
 * lettres chromées, horizon quadrillé, sportifs en pictogrammes. Mesures de la maquette, sans échelle (plat
 * 800 × 1000, comme la texture).
 */

export const CONDENSED = "'Oswald', 'Arial Narrow', sans-serif";
export const HEAVY = "'Anton', 'Oswald', Impact, sans-serif";

export const loadAlmanacFonts = (): Promise<unknown> =>
  Promise.all(
    ['400 40px Anton', '300 40px Oswald', '500 40px Oswald', '700 40px Oswald'].map((font) => document.fonts.load(font)),
  );

/** Texte posé sur sa ligne de base, comme dans la maquette (centré : l'espacement final compensé). */
export const text = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  font: string,
  color: string,
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
  color: string,
  fill?: string,
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

/** Taille de `label` en lettres chromées pour tenir dans `length` (jamais plus grande que `size`). */
export const fit = (context: CanvasRenderingContext2D, label: string, size: number, length: number): number => {
  context.save();
  context.font = `${size}px ${HEAVY}`;
  context.letterSpacing = '4px';
  const width = context.measureText(label).width;
  context.restore();
  return Math.min(size, (size * length) / width);
};

/** Lettres chromées des affiches des années 80 : dégradé ciel, horizon, sol ; contour sombre, liseré clair. */
export const chrome = (context: CanvasRenderingContext2D, label: string, x: number, y: number, size: number): void => {
  context.save();
  context.font = `${size}px ${HEAVY}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = '4px';
  const metal = context.createLinearGradient(0, y - size * 0.82, 0, y);
  metal.addColorStop(0, '#eaf6ff');
  metal.addColorStop(0.42, '#5aa6e6');
  metal.addColorStop(0.5, '#1c2a4a');
  metal.addColorStop(0.53, '#c58a4a');
  metal.addColorStop(0.75, '#fff3d6');
  metal.addColorStop(1, '#8a5a2a');
  context.lineJoin = 'round';
  context.lineWidth = size * 0.12;
  context.strokeStyle = '#0a0f22';
  context.strokeText(label, x, y);
  context.fillStyle = metal;
  context.fillText(label, x, y);
  context.lineWidth = size * 0.018;
  context.strokeStyle = 'rgba(255,255,255,0.8)';
  context.strokeText(label, x, y);
  context.restore();
};

/** L'horizon quadrillé, de `top` à `bottom`, qui file vers le point de fuite au milieu de `top`. */
export const grid = (context: CanvasRenderingContext2D, top: number, bottom: number, color: string): void => {
  context.save();
  context.beginPath();
  context.rect(0, top, WIDTH, bottom - top);
  context.clip();
  context.strokeStyle = color;
  context.lineWidth = 3;
  for (let ray = -14; ray <= 14; ray++) {
    context.beginPath();
    context.moveTo(WIDTH / 2, top);
    context.lineTo(WIDTH / 2 + ray * 110, bottom);
    context.stroke();
  }
  for (let row = 0; row < 12; row++) {
    const depth = Math.pow(row / 11, 2.2);
    const y = top + (bottom - top) * depth;
    context.lineWidth = 1 + 3 * depth;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
  context.restore();
};

type Point = readonly [number, number];
/** Un pictogramme : ses traits, la tête, et au besoin le ballon, les gants, les roues. */
interface Picto {
  strokes: readonly (readonly Point[])[];
  head: Point;
  ball?: Point;
  gloves?: readonly Point[];
  wheels?: readonly Point[];
}

/** Les sportifs de la maquette (hauteur ~100, centrés), dans l'ordre de la rangée. */
const PICTOS: readonly Picto[] = [
  // Le footballeur, qui frappe le ballon.
  {
    strokes: [[[0, -30], [-4, 6], [-14, 48]], [[-4, 6], [18, 22], [34, 14]], [[-2, -22], [-26, -8]], [[-2, -22], [22, -20]]],
    head: [4, -46],
    ball: [44, 26],
  },
  // Le boxeur, en garde.
  {
    strokes: [[[0, -30], [0, 6], [-16, 48]], [[0, 6], [16, 48]], [[0, -22], [20, -14], [30, -30]], [[0, -22], [28, -24], [44, -22]]],
    head: [0, -46],
    gloves: [[32, -32], [46, -22]],
  },
  // Le coureur.
  {
    strokes: [
      [[4, -30], [-6, 8]],
      [[-6, 8], [16, 24], [10, 48]],
      [[-6, 8], [-24, 26], [-36, 18]],
      [[2, -22], [22, -10], [30, -24]],
      [[2, -22], [-16, -12], [-24, 0]],
    ],
    head: [10, -46],
  },
  // Le batteur de base-ball, la batte levée.
  {
    strokes: [[[0, -30], [2, 6], [-18, 48]], [[2, 6], [20, 48]], [[0, -22], [-16, -18], [-10, -30]], [[-10, -30], [-40, -54]]],
    head: [2, -46],
  },
  // Le cycliste.
  {
    strokes: [[[-6, -22], [10, 0], [-2, 18]], [[-6, -22], [18, -18]], [[-26, 30], [-2, 18], [22, 30]], [[-2, 18], [18, -10]]],
    head: [-10, -36],
    wheels: [[-26, 30], [26, 30]],
  },
];

const dot = (context: CanvasRenderingContext2D, [x, y]: Point, radius: number): void => {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
};

const picto = (context: CanvasRenderingContext2D, { strokes, head, ball, gloves, wheels }: Picto, x: number, y: number, scale: number, color: string): void => {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 11;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  for (const stroke of strokes) stroke.forEach(([px, py], index) => context[index ? 'lineTo' : 'moveTo'](px, py));
  context.stroke();
  dot(context, head, 11);
  if (ball) dot(context, ball, 8);
  for (const glove of gloves ?? []) dot(context, glove, 9);
  context.lineWidth = 6;
  for (const [wx, wy] of wheels ?? []) {
    context.beginPath();
    context.arc(wx, wy, 18, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
};

/** La rangée des cinq sportifs, à la hauteur `y`. */
export const pictoRow = (context: CanvasRenderingContext2D, y: number, color: string, scale: number): void =>
  PICTOS.forEach((item, index) => picto(context, item, 120 + index * 140, y, scale, color));

/** Le sceau de la Bibliothèque, à la place de l'éditeur ; `inner` : le creux de l'hexagone. */
export const mark = (context: CanvasRenderingContext2D, label: string, x: number, y: number, color: string, inner: string): void => {
  hexagon(context, x + 18, y - 12, 18, 4, color, color);
  hexagon(context, x + 18, y - 12, 8, 3, inner);
  text(context, label, x + 48, y, `500 24px ${CONDENSED}`, color, 'left', 1);
};
