import { LINE, PAPER, crayon } from './coloringDraw';

/**
 * Les dessins à colorier : des zones (Path2D, dans l'ordre où elles se posent), et des traits sans zone. Les formes
 * communes de la maquette (.ai/maquette-coloriage.html), aux unités d'une page (640 × 800) ; le cadre du dessin va de
 * (56, 72) à (584, 728).
 */

export interface Zone {
  id: string;
  path: Path2D;
}

export interface Drawing {
  zones: Zone[];
  /** Les traits par-dessus tout (rayons, moustaches, croisées) : on ne les colorie pas. */
  lines: (context: CanvasRenderingContext2D) => void;
}

/** Un dessin en train de se faire : `add` pose une zone. */
export const sketch = (): { zones: Zone[]; add: (id: string, path: Path2D) => void } => {
  const zones: Zone[] = [];
  return { zones, add: (id, path) => zones.push({ id, path }) };
};

/**
 * Le dessin et ses couleurs (`colors` : une couleur par zone) : chaque zone remplie puis son contour, dans l'ordre ; une
 * zone posée par-dessus cache aussi le contour de celle d'en dessous. Puis les traits.
 */
export const paintDrawing = (
  context: CanvasRenderingContext2D,
  drawing: Drawing,
  colors: Readonly<Record<string, string>>,
  outline = 5,
): void => {
  context.save();
  context.strokeStyle = LINE;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const { id, path } of drawing.zones) {
    const color = colors[id];
    context.fillStyle = color ? crayon(context, color) : PAPER;
    context.fill(path);
    context.lineWidth = outline;
    context.stroke(path);
  }
  drawing.lines(context);
  context.restore();
};

export const roundRect = (x: number, y: number, w: number, h: number, r: number): Path2D => {
  const path = new Path2D();
  path.roundRect(x, y, w, h, r);
  return path;
};

export const circle = (x: number, y: number, r: number): Path2D => {
  const path = new Path2D();
  path.arc(x, y, r, 0, Math.PI * 2);
  return path;
};

export const oval = (x: number, y: number, rx: number, ry: number, angle = 0): Path2D => {
  const path = new Path2D();
  path.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  return path;
};

export const poly = (points: readonly (readonly [number, number])[]): Path2D => {
  const path = new Path2D();
  points.forEach(([x, y], index) => (index ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();
  return path;
};

/** Le cadre entier du dessin (le ciel, le mur). */
export const frame = (): Path2D => roundRect(56, 72, 528, 656, 18);

export const cloudPath = (x: number, y: number, w: number): Path2D => {
  const path = new Path2D();
  const h = w * 0.42;
  path.moveTo(x, y);
  path.bezierCurveTo(x - w * 0.12, y, x - w * 0.12, y - h * 0.6, x + w * 0.08, y - h * 0.55);
  path.bezierCurveTo(x + w * 0.1, y - h * 1.15, x + w * 0.45, y - h * 1.2, x + w * 0.5, y - h * 0.75);
  path.bezierCurveTo(x + w * 0.62, y - h * 1.05, x + w * 0.95, y - h * 0.95, x + w * 0.92, y - h * 0.45);
  path.bezierCurveTo(x + w * 1.12, y - h * 0.4, x + w * 1.1, y, x + w * 0.92, y);
  path.closePath();
  return path;
};

/** Une fenêtre (ou une porte) en plein cintre. */
export const arched = (x: number, y: number, w: number, h: number): Path2D => {
  const path = new Path2D();
  path.moveTo(x, y + h);
  path.lineTo(x, y + w / 2);
  path.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  path.lineTo(x + w, y + h);
  path.closePath();
  return path;
};

export const trapeze = (cx: number, y: number, bottom: number, top: number, h: number): Path2D =>
  poly([
    [cx - bottom / 2, y],
    [cx - top / 2, y - h],
    [cx + top / 2, y - h],
    [cx + bottom / 2, y],
  ]);

/** Un vrai croissant : le disque (cx, cy, R) moins le disque de rayon `r` décalé de `d` vers la droite. */
export const crescent = (cx: number, cy: number, R: number, d: number, r: number): Path2D => {
  const x = (d * d + R * R - r * r) / (2 * d);
  const y = Math.sqrt(R * R - x * x);
  const a = Math.atan2(y, x);
  const path = new Path2D();
  path.arc(cx, cy, R, a, 2 * Math.PI - a);
  path.arc(cx + d, cy, r, Math.atan2(-y, x - d), Math.atan2(y, x - d), true);
  path.closePath();
  return path;
};

/** Une étoile à cinq branches ; `inner` : la part du rayon au creux des branches. */
export const starPath = (x: number, y: number, r: number, inner = 0.45): Path2D => {
  const path = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? r * inner : r;
    if (i) path.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else path.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  path.closePath();
  return path;
};

/** Le bas du cadre, du haut `top` jusqu'au bord arrondi : un sol, une prairie. */
export const bottomBand = (top: number, wave = 0): Path2D => {
  const path = new Path2D();
  path.moveTo(56, top);
  for (let x = 56; x <= 584; x += 22) path.lineTo(x, top - Math.sin((x - 56) / 60) * wave);
  path.lineTo(584, 710);
  path.quadraticCurveTo(584, 728, 566, 728);
  path.lineTo(74, 728);
  path.quadraticCurveTo(56, 728, 56, 710);
  path.closePath();
  return path;
};

/** Une fleur à cinq pétales (un seul contour). */
export const flower = (x: number, y: number, r: number): Path2D => {
  const path = new Path2D();
  for (let i = 0; i < 5; i++) {
    const [a0, a1] = [(i / 5) * Math.PI * 2 - Math.PI / 2, ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2];
    const am = (a0 + a1) / 2;
    if (!i) path.moveTo(x + Math.cos(a0) * r * 0.45, y + Math.sin(a0) * r * 0.45);
    path.bezierCurveTo(
      x + Math.cos(am - 0.5) * r * 1.3,
      y + Math.sin(am - 0.5) * r * 1.3,
      x + Math.cos(am + 0.5) * r * 1.3,
      y + Math.sin(am + 0.5) * r * 1.3,
      x + Math.cos(a1) * r * 0.45,
      y + Math.sin(a1) * r * 0.45,
    );
  }
  path.closePath();
  return path;
};

/** Deux petits oiseaux en V arrondi : [x, y, taille]. */
export const birds = (context: CanvasRenderingContext2D, list: readonly (readonly [number, number, number])[]): void => {
  for (const [x, y, s] of list) {
    context.beginPath();
    context.moveTo(x - 14 * s, y);
    context.quadraticCurveTo(x - 6 * s, y - 9 * s, x, y);
    context.quadraticCurveTo(x + 6 * s, y - 9 * s, x + 14 * s, y);
    context.stroke();
  }
};

/** Des touffes d'herbe de trois brins. */
export const tufts = (
  context: CanvasRenderingContext2D,
  list: readonly (readonly [number, number])[],
  tall = 15,
  side = 12,
  spread = 6,
): void => {
  for (const [x, y] of list) {
    context.beginPath();
    context.moveTo(x - spread, y);
    context.lineTo(x - 2, y - side);
    context.moveTo(x, y);
    context.lineTo(x, y - tall);
    context.moveTo(x + spread, y);
    context.lineTo(x + 2, y - side);
    context.stroke();
  }
};

/** Un trait droit. */
export const segment = (context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void => {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.stroke();
};
