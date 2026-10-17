import { HAND } from '../strangeBook/pageItems';

/**
 * Ce que le chercheur trace à la main sur les pages des tâches (maquette validée .ai/maquette-taches.html, son code repris
 * tel quel) : les bouts de papier glissés entre les pages, les jetons de laiton, les traits de crayon. Dans le repère de
 * la page (640 × 800), textes calés par le haut.
 */

export const PENCIL = '#4a463f';
export const PENCIL_FADED = '#aaa391';
export const GHOST_INK = '#bdb39c';

/** Un hasard qui se répète (le même papier déchiré à chaque dessin). */
export const seeded = (seed: number): (() => number) => {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
};

export interface HandText {
  size?: number;
  align?: CanvasTextAlign;
  color?: string;
}

/** Un texte au crayon, calé par le haut ; renvoie sa largeur. */
export const handText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, style: HandText = {}): number => {
  context.font = `${style.size ?? 26}px ${HAND}`;
  context.letterSpacing = '0px';
  context.fillStyle = style.color ?? PENCIL;
  context.textAlign = style.align ?? 'left';
  context.textBaseline = 'top';
  context.fillText(text, x, y);
  return context.measureText(text).width;
};

/** La largeur d'un texte au crayon. */
export const handWidth = (context: CanvasRenderingContext2D, text: string, size = 26): number => {
  context.font = `${size}px ${HAND}`;
  context.letterSpacing = '0px';
  return context.measureText(text).width;
};

/** Un trait de crayon, un peu tremblé : ce qui est fait se barre. */
export const pencilLine = (
  context: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
  random: () => number,
  wobble = 1.2,
): void => {
  context.strokeStyle = PENCIL;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(x1, y + (random() - 0.5) * wobble);
  for (let x = x1; x < x2; x += 18) context.lineTo(Math.min(x + 18, x2), y + (random() - 0.5) * wobble * 2);
  context.stroke();
};

/** Un cercle au crayon (la case d'une tâche ; pâle, pas encore rencontrée). */
export const pencilCircle = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color = PENCIL): void => {
  context.strokeStyle = color;
  context.lineWidth = color === PENCIL ? 1.4 : 1.2;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
};

/** Le jeton : une pièce de laiton, l'hexagone de Babel frappé dessus. */
export const token = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  context.save();
  context.shadowColor = 'rgba(40,25,5,0.45)';
  context.shadowBlur = 6;
  context.shadowOffsetY = 2;
  const gradient = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
  gradient.addColorStop(0, '#f7dc94');
  gradient.addColorStop(0.55, '#c99a3e');
  gradient.addColorStop(1, '#7c5a1e');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.strokeStyle = 'rgba(90,60,15,0.8)';
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(x, y, radius * 0.84, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (i * Math.PI) / 3;
    context.lineTo(x + Math.cos(angle) * radius * 0.48, y + Math.sin(angle) * radius * 0.48);
  }
  context.closePath();
  context.stroke();
};

/** Ce que vaut une tâche : ses jetons, en petites pièces au coin du papier (cerclées tant qu'ils ne sont pas pris). */
export const worth = (context: CanvasRenderingContext2D, right: number, y: number, count: number, filled: boolean): void => {
  for (let i = 0; i < count; i++) {
    const x = right - i * 21;
    if (filled) token(context, x, y, 8);
    else pencilCircle(context, x, y, 8);
  }
};

/**
 * Un bout de papier glissé entre les pages : un peu plus jaune que la page, le bord du haut déchiré, une ombre portée,
 * légèrement de travers. `draw` y dessine, dans son repère (0, 0 en haut à gauche) ; `scale` le rapetisse (5 tâches).
 */
export const slip = (
  context: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number; angle: number; scale?: number },
  random: () => number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
): void => {
  const { x, y, width, height, angle, scale = 1 } = box;
  context.save();
  context.translate(x + (width * scale) / 2, y + (height * scale) / 2);
  context.rotate(angle);
  context.scale(scale, scale);
  context.translate(-width / 2, -height / 2);
  context.shadowColor = 'rgba(60,40,10,0.35)';
  context.shadowBlur = 10;
  context.shadowOffsetY = 4;
  context.beginPath();
  context.moveTo(0, 6);
  for (let px = 0; px <= width; px += 14) context.lineTo(px, (px / 14) % 2 ? random() * 7 : 2 + random() * 4);
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  const paper = context.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, '#f6eedb');
  paper.addColorStop(1, '#e6d9b9');
  context.fillStyle = paper;
  context.fill();
  context.shadowColor = 'transparent';
  draw(context, width, height);
  context.restore();
};

/** La barre d'avancement au crayon : un cadre pâle, hachuré jusqu'où on en est. */
export const progressBar = (context: CanvasRenderingContext2D, x: number, y: number, width: number, share: number): void => {
  context.strokeStyle = PENCIL_FADED;
  context.lineWidth = 1;
  context.strokeRect(x, y, width, 12);
  context.fillStyle = 'rgba(74,70,63,0.55)';
  for (let px = x + 2; px < x + 2 + (width - 4) * Math.min(1, share); px += 4) context.fillRect(px, y + 2, 2.2, 8);
};
