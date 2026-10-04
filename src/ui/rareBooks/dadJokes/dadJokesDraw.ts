import '@fontsource/luckiest-guy/400.css';
import '@fontsource/oswald/500.css';
import { HEIGHT, WIDTH } from '../draw';
import { hexagon, text } from '../almanac/almanacDraw';

/**
 * Les outils de la couverture des Jokes de Papa (maquette .ai/maquette-jokes-papa.html, piste A « Le
 * livre-cadeau ») : lettres rondes cernées, moustache, lunettes, bulle, pastille. Mesures de la maquette,
 * sans échelle (plat 800 × 1000, comme la texture).
 */

export const ROUND = "'Luckiest Guy', 'Anton', Impact, sans-serif";
export const CONDENSED = "'Oswald', 'Arial Narrow', sans-serif";

export const loadDadJokesFonts = (): Promise<unknown> =>
  Promise.all(['400 40px "Luckiest Guy"', '500 40px Oswald'].map((font) => document.fonts.load(font)));

export { hexagon, text };

/** Texte cerné (contour épais derrière le remplissage), avec, au besoin, une ombre décalée de 10. */
export const outlined = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  stroke: string,
  width: number,
  shadow?: string,
): void => {
  context.save();
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  if (shadow) {
    context.fillStyle = shadow;
    context.strokeStyle = shadow;
    context.lineWidth = width;
    context.strokeText(label, x + 10, y + 10);
    context.fillText(label, x + 10, y + 10);
  }
  context.strokeStyle = stroke;
  context.lineWidth = width;
  context.strokeText(label, x, y);
  context.fillStyle = fill;
  context.fillText(label, x, y);
  context.restore();
};

/** Taille de police pour que `label` tienne dans `length` (jamais plus grande que `size`). */
export const fit = (context: CanvasRenderingContext2D, label: string, size: number, length: number, spacing = 0): number => {
  context.save();
  context.font = `${size}px ${ROUND}`;
  context.letterSpacing = `${spacing}px`;
  const width = context.measureText(label).width;
  context.restore();
  return Math.min(size, (size * length) / width);
};

/** Le sceau de la Bibliothèque, à la place de l'éditeur. */
export const mark = (context: CanvasRenderingContext2D, label: string, x: number, y: number, color: string, inner: string): void => {
  hexagon(context, x + 18, y - 9, 18, 4, color, color);
  hexagon(context, x + 18, y - 9, 8, 3, inner);
  text(context, label, x + 48, y, `500 24px ${CONDENSED}`, color, 'left', 1);
};

/** Le fond jaune, plus clair au milieu, et ses rayons de soleil (centrés en `sunY`), comme les livres d'humour. */
export const sunburst = (context: CanvasRenderingContext2D, sunY: number): void => {
  const glow = context.createRadialGradient(WIDTH / 2, sunY - 40, 60, WIDTH / 2, sunY - 40, 700);
  glow.addColorStop(0, '#ffe372');
  glow.addColorStop(1, '#f7bf1e');
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.save();
  context.translate(WIDTH / 2, sunY);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  for (let ray = 0; ray < 18; ray++) {
    context.rotate(Math.PI / 9);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-60, -900);
    context.lineTo(60, -900);
    context.closePath();
    context.fill();
  }
  context.restore();
};

/** La moustache de papa, centrée en (x, y), large d'environ 2 × `w`. */
export const moustache = (context: CanvasRenderingContext2D, x: number, y: number, w: number, color: string): void => {
  context.save();
  context.translate(x, y);
  context.fillStyle = color;
  context.beginPath();
  for (const side of [-1, 1]) {
    context.moveTo(0, -w * 0.06);
    context.bezierCurveTo(side * w * 0.25, -w * 0.32, side * w * 0.62, -w * 0.22, side * w * 0.78, -w * 0.02);
    context.bezierCurveTo(side * w * 0.9, w * 0.12, side * w * 1.02, w * 0.06, side * w * 1.04, -w * 0.12);
    context.bezierCurveTo(side * w * 1.06, w * 0.2, side * w * 0.8, w * 0.3, side * w * 0.55, w * 0.18);
    context.bezierCurveTo(side * w * 0.35, w * 0.1, side * w * 0.15, w * 0.12, 0, w * 0.1);
    context.closePath();
  }
  context.fill();
  context.restore();
};

/** Lunettes rondes à monture épaisse, verres teintés `lens`, un reflet sur chacun. */
export const glasses = (context: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, lens: string): void => {
  context.save();
  context.lineWidth = r * 0.22;
  context.strokeStyle = color;
  context.lineCap = 'round';
  for (const side of [-1, 1]) {
    context.beginPath();
    context.arc(x + side * r * 1.25, y, r, 0, Math.PI * 2);
    context.fillStyle = lens;
    context.fill();
    context.stroke();
    context.save();
    context.strokeStyle = 'rgba(255,255,255,0.85)';
    context.lineWidth = r * 0.12;
    context.beginPath();
    context.arc(x + side * r * 1.25, y, r * 0.6, Math.PI * 1.1, Math.PI * 1.45);
    context.stroke();
    context.restore();
  }
  context.beginPath();
  context.moveTo(x - r * 0.3, y - r * 0.15);
  context.quadraticCurveTo(x, y - r * 0.45, x + r * 0.3, y - r * 0.15);
  context.stroke();
  context.restore();
};

/** Bulle de bande dessinée (ellipse `w` × `h` centrée en x, y), sa queue pointée vers (tx, ty). */
export const bubble = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tx: number,
  ty: number,
  fill: string,
  stroke: string,
): void => {
  context.save();
  context.lineWidth = 7;
  context.strokeStyle = stroke;
  context.fillStyle = fill;
  context.lineJoin = 'round';
  context.beginPath();
  context.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  context.moveTo(x - w * 0.12, y + h * 0.4);
  context.lineTo(tx, ty);
  context.lineTo(x + w * 0.06, y + h * 0.45);
  context.fill();
  context.stroke();
  // Le trait de la queue ne coupe pas la bulle.
  context.beginPath();
  context.ellipse(x, y, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Pastille étoilée à `points` pointes, de rayon `r`. */
export const burst = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  points: number,
  fill: string,
  rotation = 0,
): void => {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = fill;
  context.beginPath();
  for (let tip = 0; tip < points * 2; tip++) {
    const radius = tip % 2 ? r * 0.86 : r;
    const angle = (Math.PI * tip) / points;
    context[tip ? 'lineTo' : 'moveTo'](radius * Math.cos(angle), radius * Math.sin(angle));
  }
  context.closePath();
  context.fill();
  context.restore();
};
