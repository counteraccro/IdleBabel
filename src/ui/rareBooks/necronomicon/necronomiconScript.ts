import { gold, type Random } from './necronomiconDraw';

/**
 * L'écriture d'Al Azif (maquette .ai/maquette-necronomicon-pages.html) : elle a l'allure d'une cursive
 * orientale sans en être une, aucune vraie lettre, rien qui se lise. Tracée de droite à gauche.
 */

export const INK = '#2a1a10';
export const RED = '#a3301c';

/**
 * Un mot, tracé de droite à gauche depuis `x` sur la ligne de base `y` : des dents, des boucles, des hampes,
 * des panses qui descendent, reliées par la ligne ; des points au-dessus ou dessous. Renvoie la largeur tracée.
 */
export const word = (context: CanvasRenderingContext2D, random: Random, x: number, y: number, width: number, s = 1): number => {
  context.beginPath();
  context.moveTo(x, y);
  let at = x;
  const end = x - width;
  const dots: [number, number, number][] = [];
  while (at > end + 4 * s) {
    const kind = Math.floor(random() * 7);
    const step = Math.min(at - end, (6 + random() * 10) * s);
    if (kind === 0) context.quadraticCurveTo(at - step / 2, y - 7 * s, at - step, y);
    else if (kind === 1) {
      context.lineTo(at - step / 2, y);
      context.lineTo(at - step / 2, y - (16 + random() * 6) * s);
      context.moveTo(at - step / 2, y);
      context.lineTo(at - step, y);
    } else if (kind === 2) {
      context.bezierCurveTo(at - step * 0.2, y + 10 * s, at - step * 0.9, y + 10 * s, at - step, y - 2 * s);
      context.lineTo(at - step, y);
    } else if (kind === 3) {
      context.lineTo(at - step * 0.3, y);
      context.arc(at - step * 0.55, y - 3.5 * s, 3.2 * s, 0, Math.PI * 2);
      context.moveTo(at - step * 0.3, y);
      context.lineTo(at - step, y);
    } else if (kind === 4) context.lineTo(at - step, y);
    else if (kind === 5) {
      context.quadraticCurveTo(at - step * 0.4, y - 4 * s, at - step * 0.5, y);
      context.quadraticCurveTo(at - step * 0.6, y + 4 * s, at - step, y);
    } else {
      context.lineTo(at - step * 0.5, y);
      context.lineTo(at - step * 0.7, y - 10 * s);
      context.moveTo(at - step * 0.5, y);
      context.lineTo(at - step, y);
    }
    if (random() < 0.35) dots.push([at - step / 2, y + (random() < 0.6 ? -14 : 9) * s, random() < 0.3 ? 2 : 1]);
    at -= step;
  }
  // Fin de mot : une queue qui descend et revient, ou rien.
  if (random() < 0.4) context.bezierCurveTo(at - 4 * s, y + 9 * s, at - 12 * s, y + 9 * s, at - 13 * s, y + 2 * s);
  context.stroke();
  for (const [dx, dy, count] of dots)
    for (let dot = 0; dot < count; dot++) {
      context.beginPath();
      context.arc(dx - dot * 4 * s, dy, 1.6 * s, 0, Math.PI * 2);
      context.fill();
    }
  return x - at;
};

interface LineOptions {
  /** Les premiers mots à l'encre rouge (une rubrique). */
  red?: number;
  /** Dernière ligne d'un paragraphe : plus courte, pas justifiée. */
  last?: boolean;
  s?: number;
  color?: string;
}

/** Une ligne justifiée, de droite à gauche, entre `x0` et `x1`. Renvoie l'abscisse où elle s'arrête. */
export const line = (
  context: CanvasRenderingContext2D,
  random: Random,
  x0: number,
  x1: number,
  y: number,
  { red = 0, last = false, s = 1, color = INK }: LineOptions = {},
): number => {
  const widths: number[] = [];
  let total = 0;
  for (;;) {
    const width = (24 + random() * 60) * s;
    if (total + width + 12 * s > x1 - x0) break;
    widths.push(width);
    total += width + 12 * s;
  }
  if (last) widths.splice(Math.max(2, Math.floor(widths.length * (0.4 + random() * 0.4))));
  const gap = last ? 12 * s : (x1 - x0 - widths.reduce((sum, width) => sum + width, 0)) / Math.max(1, widths.length - 1);
  let x = x1;
  context.lineWidth = 2.1 * s;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  widths.forEach((width, index) => {
    context.strokeStyle = context.fillStyle = index < red ? RED : color;
    word(context, random, x, y, width, s);
    x -= width + gap;
  });
  return x + gap;
};

/** Un fleuron d'or : petite rosace à six pétales, cœur rouge (fin de phrase). */
export const rosette = (context: CanvasRenderingContext2D, x: number, y: number, size = 5): void => {
  context.fillStyle = gold(context, y - size, y + size);
  for (let petal = 0; petal < 6; petal++) {
    const angle = (petal * Math.PI) / 3;
    context.beginPath();
    context.ellipse(x + Math.cos(angle) * size * 0.6, y + Math.sin(angle) * size * 0.6, size * 0.5, size * 0.22, angle, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = RED;
  context.beginPath();
  context.arc(x, y, size * 0.25, 0, Math.PI * 2);
  context.fill();
};
