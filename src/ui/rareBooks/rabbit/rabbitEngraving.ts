import { INK, ellipse, random, type Ink } from './rabbitDraw';

/**
 * Le Lapin blanc, gravé (maquette .ai/maquette-lapin-pages.html, d'après une gravure montrée par l'auteur le 09/10) :
 * assis de trois quarts, tête à droite. Une silhouette (union d'ellipses), puis des milliers de petits traits de
 * fourrure qui suivent le sens du poil, d'autant plus serrés que l'endroit est dans l'ombre (lumière en haut à
 * droite) ; les bords en touffes, les oreilles sombres, l'œil et son reflet, les moustaches, les doigts des pattes
 * avant, l'ombre portée. Pas de montre (l'auteur : « il ressemble à une poule »). Dessiné une fois : c'est le même
 * qui court sur les pages et qui revient dans les planches.
 */

/** La toile du dessin, et le point sous ses pieds. */
export const SPRITE_WIDTH = 300;
export const SPRITE_HEIGHT = 330;
const FOOT_X = 150;
const FOOT_Y = 308;

type PartName = 'rump' | 'body' | 'chest' | 'head' | 'muzzle' | 'earBack' | 'earFront' | 'leg' | 'foot' | 'paw';
/** [x, y, rx, ry, angle, partie], dans la toile du dessin. */
type Part = readonly [number, number, number, number, number, PartName];

const PARTS: readonly Part[] = [
  [95, 236, 82, 72, 0, 'rump'],
  [135, 228, 100, 76, 0, 'body'],
  [188, 222, 52, 70, 0, 'chest'],
  [206, 142, 52, 47, -0.15, 'head'],
  [240, 160, 28, 23, 0, 'muzzle'],
  [158, 62, 19, 56, -0.38, 'earBack'],
  [206, 56, 16, 56, 0.12, 'earFront'],
  [190, 268, 17, 32, 0.05, 'leg'],
  [224, 266, 15, 30, -0.05, 'leg'],
  [112, 300, 46, 12, 0, 'foot'],
  [186, 300, 21, 11, 0, 'paw'],
  [226, 298, 19, 11, 0, 'paw'],
];

/** Une ellipse de silhouette : [x, y, rx, ry, angle], pieds en (0, 0). */
export type Shape = readonly [number, number, number, number, number];

/** La silhouette du lapin gravé, pieds en (0, 0) (la place vide des planches et de la couverture). */
export const SILHOUETTE: readonly Shape[] = PARTS.map(([x, y, rx, ry, angle]) => [x - FOOT_X, y - FOOT_Y, rx, ry, angle]);

/** La dernière partie qui contient le point (les pattes et la tête passent devant le corps), et à quelle distance du bord. */
const partAt = (x: number, y: number): { part: Part; distance: number } | null => {
  let found: { part: Part; distance: number } | null = null;
  for (const part of PARTS) {
    const [px, py, rx, ry, angle] = part;
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);
    const dx = x - px;
    const dy = y - py;
    const u = (dx * cos - dy * sin) / rx;
    const v = (dx * sin + dy * cos) / ry;
    if (u * u + v * v <= 1) found = { part, distance: Math.sqrt(u * u + v * v) };
  }
  return found;
};

/** Le sens du poil (radians) : vers l'arrière et le bas sur le corps, de la truffe vers la nuque sur la tête, le long des oreilles. */
const furAngle = (x: number, y: number, part: Part): number => {
  const name = part[5];
  if (name === 'earBack' || name === 'earFront') return Math.PI / 2 + part[4];
  if (name === 'head' || name === 'muzzle') return Math.PI + 0.5 + (y - 140) * 0.006;
  if (name === 'chest' || name === 'leg' || name === 'paw') return Math.PI / 2 + 0.15;
  return Math.PI * 0.62 + (x - 135) * -0.004;
};

/** L'ombre (0 clair, 1 sombre) : la lumière vient d'en haut à droite. */
const furShade = (x: number, y: number, name: PartName, distance: number): number => {
  let shade = 0.15 + ((y - 120) / 260) * 0.45 + ((170 - x) / 220) * 0.35 + Math.max(0, distance - 0.7) * 0.9;
  if (name === 'earBack') shade += 0.45;
  if (name === 'earFront') shade += 0.25 - Math.abs(x - 210) * 0.004;
  // Sous le menton.
  if (name === 'chest' && y < 200) shade += 0.25;
  // Le creux derrière chaque patte avant, en dégradé.
  if (name === 'leg' || name === 'paw') shade += x < 184 ? ((184 - x) / 18) * 0.35 : x > 208 && x < 220 ? ((220 - x) / 12) * 0.3 : -0.15;
  // Le cou : l'ombre que la tête porte sous elle.
  if (name !== 'head' && name !== 'muzzle' && name !== 'leg' && name !== 'paw') {
    const dx = (x - 206) / 62;
    const dy = (y - 150) / 60;
    const reach = dx * dx + dy * dy;
    if (reach < 1) shade += (1 - reach) * 0.35;
  }
  // Le front, dans la lumière.
  if (name === 'head' && x > 215 && y < 150) shade -= 0.25;
  return Math.min(1, Math.max(0, shade));
};

const drawRabbit = (): HTMLCanvasElement => {
  const node = document.createElement('canvas');
  node.width = SPRITE_WIDTH;
  node.height = SPRITE_HEIGHT;
  const context = node.getContext('2d')!;
  const next = random(410);
  const ink = 'rgba(30,22,14,';
  // L'ombre portée, en hachures serrées.
  context.save();
  ellipse(context, 150, 310, 118, 14);
  context.clip();
  context.strokeStyle = INK;
  context.lineWidth = 1.6;
  for (let k = 0; k < 300; k += 3) {
    context.beginPath();
    context.moveTo(20 + k, 330);
    context.lineTo(40 + k, 290);
    context.stroke();
  }
  context.restore();
  // Le blanc du lapin.
  context.fillStyle = '#ffffff';
  for (const [x, y, rx, ry, angle] of PARTS) {
    ellipse(context, x, y, rx, ry, angle);
    context.fill();
  }
  // La fourrure.
  context.lineCap = 'round';
  for (let stroke = 0; stroke < 9000; stroke++) {
    const x = next() * SPRITE_WIDTH;
    const y = next() * SPRITE_HEIGHT;
    const hit = partAt(x, y);
    if (!hit) continue;
    const name = hit.part[5];
    const shade = furShade(x, y, name, hit.distance);
    if (next() > shade * shade * 1.1 + 0.03) continue;
    const angle = furAngle(x, y, hit.part) + (next() - 0.5) * 0.5;
    const length = (name.startsWith('ear') ? 9 : 7) + next() * 8;
    context.strokeStyle = `${ink}${0.55 + shade * 0.45})`;
    context.lineWidth = 0.9 + shade * 1.1;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(
      x + Math.cos(angle) * length * 0.5 + (next() - 0.5) * 3,
      y + Math.sin(angle) * length * 0.5,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    );
    context.stroke();
  }
  // Les touffes du bord : de petits traits qui débordent, sur le contour extérieur seulement.
  for (const part of PARTS) {
    const [px, py, rx, ry, tilt, name] = part;
    const count = Math.round((rx + ry) * 1.1);
    for (let k = 0; k < count; k++) {
      const turn = (k / count) * Math.PI * 2;
      const ex = rx * Math.cos(turn);
      const ey = ry * Math.sin(turn);
      const x = px + ex * Math.cos(tilt) - ey * Math.sin(tilt);
      const y = py + ex * Math.sin(tilt) + ey * Math.cos(tilt);
      if (partAt(x + Math.cos(turn + tilt) * 3, y + Math.sin(turn + tilt) * 3)) continue;
      const shade = furShade(x, y, name, 1);
      const angle = furAngle(x, y, part) + (next() - 0.5) * 0.6;
      const length = 4 + next() * 6;
      context.strokeStyle = `${ink}${0.6 + shade * 0.4})`;
      context.lineWidth = 1 + shade;
      context.beginPath();
      context.moveTo(x - Math.cos(angle) * length * 0.6, y - Math.sin(angle) * length * 0.6);
      context.lineTo(x + Math.cos(angle) * length * 0.5, y + Math.sin(angle) * length * 0.5);
      context.stroke();
    }
  }
  // L'intérieur clair de l'oreille de devant.
  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.lineWidth = 2.5;
  for (let k = 0; k < 5; k++) {
    context.beginPath();
    context.moveTo(208 + k * 2, 22 + k * 6);
    context.quadraticCurveTo(214 + k, 60, 206 + k * 2, 96);
    context.stroke();
  }
  context.restore();
  // L'œil : rose sombre, la pupille, le reflet, la paupière.
  context.fillStyle = '#5a1e24';
  ellipse(context, 218, 132, 9, 8, -0.2);
  context.fill();
  context.fillStyle = '#1e160e';
  ellipse(context, 219, 132, 5, 5);
  context.fill();
  context.fillStyle = '#ffffff';
  ellipse(context, 222, 129, 2.2, 2.2);
  context.fill();
  context.strokeStyle = INK;
  context.lineWidth = 1.6;
  context.beginPath();
  context.ellipse(218, 132, 11, 10, -0.2, Math.PI * 1.1, Math.PI * 1.95);
  context.stroke();
  // La truffe et la bouche.
  context.fillStyle = INK;
  context.beginPath();
  context.moveTo(258, 152);
  context.lineTo(268, 150);
  context.lineTo(264, 158);
  context.closePath();
  context.fill();
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(264, 158);
  context.lineTo(263, 166);
  context.quadraticCurveTo(258, 172, 252, 168);
  context.moveTo(263, 166);
  context.quadraticCurveTo(267, 171, 271, 168);
  context.stroke();
  // Les moustaches.
  context.strokeStyle = 'rgba(30,22,14,0.75)';
  context.lineWidth = 0.9;
  for (const [ex, ey, cx, cy] of [
    [296, 128, 285, 140],
    [298, 150, 288, 152],
    [296, 170, 286, 163],
    [290, 188, 280, 172],
    [270, 200, 268, 182],
  ]) {
    context.beginPath();
    context.moveTo(262, 160);
    context.quadraticCurveTo(cx, cy, ex, ey);
    context.stroke();
  }
  // Les doigts des pattes avant.
  context.strokeStyle = INK;
  context.lineWidth = 1.4;
  for (const px of [186, 226])
    for (const dx of [-8, 0, 8]) {
      context.beginPath();
      context.moveTo(px + dx, 296);
      context.lineTo(px + dx + 1, 308);
      context.stroke();
    }
  return node;
};

let drawn: HTMLCanvasElement | null = null;

/** Le lapin gravé (dessiné à la première demande, puis gardé : 300 × 330, ~400 Ko). */
export const rabbitSprite = (): HTMLCanvasElement => (drawn ??= drawRabbit());

/** Le lapin gravé posé pieds en (x, y), à l'échelle `scale` ; `facing` : 1 tête à droite, -1 à gauche. */
export const drawEngraved = (context: CanvasRenderingContext2D, x: number, y: number, scale: number, facing: 1 | -1): void => {
  context.save();
  context.translate(x, y);
  context.scale(scale * facing, scale);
  context.drawImage(rabbitSprite(), -FOOT_X, -FOOT_Y);
  context.restore();
};

/** Chaque ellipse de la silhouette posée pieds en (x, y), à l'échelle `scale`, tournée vers `facing` ; `each` la trace ou la remplit. */
const eachShape = (context: CanvasRenderingContext2D, x: number, y: number, scale: number, facing: number, each: () => void): void => {
  for (const [ex, ey, rx, ry, angle] of SILHOUETTE) {
    ellipse(context, x + ex * scale * facing, y + ey * scale, rx * scale, ry * scale, angle * facing);
    each();
  }
};

/**
 * La place vide du lapin : le contour de sa silhouette en pointillé (on trace le bord de chaque ellipse, puis on
 * remplit l'intérieur de `fill` par-dessus : seul le contour extérieur reste).
 */
export const emptySpot = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  facing: number,
  stroke: Ink,
  fill: string,
  lineWidth: number,
  dash: number[],
): void => {
  context.save();
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.setLineDash(dash);
  eachShape(context, x, y, scale, facing, () => context.stroke());
  context.restore();
  context.save();
  context.fillStyle = fill;
  eachShape(context, x, y, scale, facing, () => context.fill());
  context.restore();
};
