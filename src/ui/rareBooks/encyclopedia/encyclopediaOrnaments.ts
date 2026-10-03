import { rng } from '../arabianNights/arabianNightsOrnaments';

/**
 * Les petits fers et les gravures de l'Encyclopédie, d'après .ai/maquette-encyclopedie.html (piste A) : le
 * fleuron des caissons du dos, le fer d'angle, la feuille ; pour les pages, la vignette de la page de titre, le
 * bandeau gravé et la lettrine du Discours préliminaire.
 */

/** Un fleuron de dos : une fleur à quatre pétales en croix, quatre feuilles en diagonale, des points. */
export const spineFlower = (context: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void => {
  context.save();
  context.translate(cx, cy);
  context.scale(scale, scale);
  for (let quarter = 0; quarter < 4; quarter++) {
    context.save();
    context.rotate((quarter * Math.PI) / 2);
    context.beginPath();
    context.moveTo(0, -3);
    context.bezierCurveTo(-5, -8, -3, -15, 0, -17);
    context.bezierCurveTo(3, -15, 5, -8, 0, -3);
    context.fill();
    context.rotate(Math.PI / 4);
    context.beginPath();
    context.ellipse(0, -12, 2, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(0, -20, 1.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.beginPath();
  context.arc(0, 0, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Un petit fer d'angle : un quart de fleuron, tourné vers le coin (`sx`, `sy` : ±1). */
export const cornerTool = (context: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, scale: number): void => {
  context.save();
  context.translate(x, y);
  context.scale(sx * scale, sy * scale);
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(10, 2, 14, 8, 16, 16);
  context.bezierCurveTo(8, 14, 2, 10, 0, 0);
  context.fill();
  context.beginPath();
  context.arc(18, 4, 1.6, 0, Math.PI * 2);
  context.arc(4, 18, 1.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Une feuille de laurier, pointe vers le haut. */
export const leaf = (context: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.scale(scale, scale);
  context.beginPath();
  context.moveTo(0, 0);
  context.bezierCurveTo(-4, -4, -4, -11, 0, -15);
  context.bezierCurveTo(4, -11, 4, -4, 0, 0);
  context.fill();
  context.restore();
};

/** La vignette de la page de titre : un soleil dans un cartouche ovale, des rinceaux de part et d'autre. */
export const vignette = (context: CanvasRenderingContext2D, cx: number, cy: number, ink: string): void => {
  context.save();
  context.strokeStyle = ink;
  context.fillStyle = ink;
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(cx, cy, 46, 36, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(cx, cy, 41, 31, 0, 0, Math.PI * 2);
  context.stroke();
  // Le soleil : un disque et des rayons, longs et courts.
  context.beginPath();
  context.arc(cx, cy, 9, 0, Math.PI * 2);
  context.fill();
  for (let ray = 0; ray < 24; ray++) {
    const angle = (ray / 24) * Math.PI * 2;
    const [inner, outer] = [12, ray % 2 ? 22 : 27];
    context.lineWidth = ray % 2 ? 0.8 : 1.4;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner * 0.85);
    context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer * 0.85);
    context.stroke();
  }
  // Les rinceaux : deux volutes de chaque côté, et leurs feuilles.
  for (const side of [-1, 1]) {
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(cx + side * 48, cy);
    context.bezierCurveTo(cx + side * 70, cy - 22, cx + side * 96, cy - 4, cx + side * 86, cy + 8);
    context.bezierCurveTo(cx + side * 80, cy + 16, cx + side * 70, cy + 8, cx + side * 76, cy + 2);
    context.stroke();
    context.beginPath();
    context.moveTo(cx + side * 48, cy + 8);
    context.bezierCurveTo(cx + side * 66, cy + 26, cx + side * 88, cy + 22, cx + side * 100, cy + 12);
    context.stroke();
    for (const [dx, dy, angle] of [
      [60, -14, -0.6],
      [74, 22, 2.2],
      [92, 16, 1.2],
    ])
      leaf(context, cx + side * dx, cy + dy, side * angle, 0.7);
  }
  context.restore();
};

/**
 * Le bandeau gravé, de `x0` à `x1` et de 62 de haut : des hachures entre deux cadres, un cartouche blanc au
 * soleil au milieu, des rinceaux en réserve de part et d'autre.
 */
export const headpiece = (context: CanvasRenderingContext2D, y: number, x0: number, x1: number, ink: string, paper: string): void => {
  const [height, middle] = [62, (x0 + x1) / 2];
  context.save();
  context.strokeStyle = ink;
  context.fillStyle = ink;
  context.lineWidth = 1.4;
  context.strokeRect(x0, y, x1 - x0, height);
  context.lineWidth = 0.6;
  context.strokeRect(x0 + 4, y + 4, x1 - x0 - 8, height - 8);
  context.save();
  context.beginPath();
  context.rect(x0 + 4, y + 4, x1 - x0 - 8, height - 8);
  context.clip();
  context.lineWidth = 0.5;
  context.strokeStyle = 'rgba(29,24,19,0.55)';
  for (let x = x0; x < x1; x += 3) {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y + height);
    context.stroke();
  }
  context.restore();
  context.fillStyle = paper;
  context.beginPath();
  context.ellipse(middle, y + height / 2, 44, 24, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = ink;
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = ink;
  context.beginPath();
  context.arc(middle, y + height / 2, 6, 0, Math.PI * 2);
  context.fill();
  for (let ray = 0; ray < 16; ray++) {
    const angle = (ray / 16) * Math.PI * 2;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(middle + Math.cos(angle) * 9, y + height / 2 + Math.sin(angle) * 7);
    context.lineTo(middle + Math.cos(angle) * (ray % 2 ? 15 : 19), y + height / 2 + Math.sin(angle) * (ray % 2 ? 11 : 14));
    context.stroke();
  }
  context.strokeStyle = paper;
  context.lineWidth = 4;
  context.lineCap = 'round';
  for (const side of [-1, 1])
    for (let scroll = 0; scroll < 3; scroll++) {
      const [cx, cy] = [middle + side * (78 + scroll * 58), y + height / 2];
      context.beginPath();
      context.moveTo(cx - side * 26, cy + 8);
      context.bezierCurveTo(cx - side * 10, cy - 22, cx + side * 22, cy - 14, cx + side * 14, cy + 2);
      context.bezierCurveTo(cx + side * 8, cy + 12, cx - side * 4, cy + 4, cx + side * 2, cy - 2);
      context.stroke();
    }
  context.restore();
};

/** La lettrine : la lettre en réserve dans un carré gravé (hachures et feuillage), de `size` de côté. */
export const engravedInitial = (
  context: CanvasRenderingContext2D,
  letter: string,
  x: number,
  y: number,
  size: number,
  font: string,
  ink: string,
  paper: string,
): void => {
  context.save();
  context.strokeStyle = ink;
  context.lineWidth = 1.3;
  context.strokeRect(x, y, size, size);
  context.beginPath();
  context.rect(x + 3, y + 3, size - 6, size - 6);
  context.clip();
  context.lineWidth = 0.55;
  for (let k = -size; k < size * 2; k += 3) {
    context.beginPath();
    context.moveTo(x + k, y);
    context.lineTo(x + k - size, y + size);
    context.stroke();
  }
  context.fillStyle = paper;
  context.strokeStyle = paper;
  context.lineWidth = 3;
  context.lineCap = 'round';
  const random = rng(3);
  for (let curl = 0; curl < 8; curl++) {
    const [cx, cy] = [x + random() * size, y + random() * size];
    context.beginPath();
    context.arc(cx, cy, 6 + random() * 8, random() * 6, random() * 6 + 3);
    context.stroke();
  }
  context.restore();
  context.save();
  context.font = `${size * 0.86}px ${font}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.lineWidth = 6;
  context.strokeStyle = paper;
  context.strokeText(letter, x + size / 2, y + size * 0.82);
  context.fillStyle = ink;
  context.fillText(letter, x + size / 2, y + size * 0.82);
  context.restore();
};
