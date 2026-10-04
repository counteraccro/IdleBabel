import { LETTERS } from '../../../systems/babelText';
import { MCQW, SANS, type Context } from './mockup';

/**
 * Le nécessaire des couvertures d'éditeur, dans le repère de la maquette (les mêmes formes que modernCover.ts) :
 * vernis, marque d'éditeur, code-barres, texte en caractères bâton.
 */

export const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Un mot de Babel, de 3 à 8 lettres. */
export const babelWord = (random: () => number): string =>
  Array.from({ length: 3 + Math.floor(random() * 6) }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');

/** Vernis : un reflet en biais (125° en CSS), sur `w` × `h`. */
export const gloss = (context: Context, w: number, h: number): void => {
  const angle = ((125 - 90) * Math.PI) / 180;
  const half = (Math.abs(w * Math.cos(angle)) + Math.abs(h * Math.sin(angle))) / 2;
  const [dx, dy] = [Math.cos(angle) * half, Math.sin(angle) * half];
  const shine = context.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy);
  shine.addColorStop(0, 'rgba(255,255,255,0.22)');
  shine.addColorStop(0.32, 'rgba(255,255,255,0)');
  shine.addColorStop(0.68, 'rgba(255,255,255,0)');
  shine.addColorStop(1, 'rgba(255,255,255,0.08)');
  context.fillStyle = shine;
  context.fillRect(0, 0, w, h);
};

/** Marque d'éditeur générique : un cercle et un point (6 cqw de côté, coin haut gauche en cqw). */
export const publisherMark = (context: Context, x: number, y: number, color: string): void => {
  const unit = (6 * MCQW) / 20;
  const [cx, cy] = [(x + 3) * MCQW, (y + 3) * MCQW];
  context.save();
  context.globalAlpha = 0.9;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.6 * unit;
  context.beginPath();
  context.arc(cx, cy, 8.5 * unit, 0, 2 * Math.PI);
  context.stroke();
  context.beginPath();
  context.arc(cx, cy, 3.2 * unit, 0, 2 * Math.PI);
  context.fill();
  context.restore();
};

export const rect = (context: Context, color: string, x: number, y: number, w: number, h: number): void => {
  context.fillStyle = color;
  context.fillRect(x * MCQW, y * MCQW, w * MCQW, h * MCQW);
};

/** Code-barres sur son étiquette blanche, coin haut gauche (x, y) en cqw. */
export const barcode = (context: Context, digits: string, x: number, y: number): void => {
  rect(context, '#fff', x, y, 34, 17.4);
  const scale = 29 / 100;
  for (let i = 0; i < 13; i++) {
    const bar = 0.6 + (Number(digits[i]) % 4) * 0.45;
    rect(context, '#111', x + 2.5 + i * 7.6 * scale, y + 2, bar * scale, 11);
    rect(context, '#111', x + 2.5 + (i * 7.6 + 3.2) * scale, y + 2, (2.6 - bar / 2) * scale, 11);
  }
};

/** Texte en caractères bâton, en haut à gauche au point (x, y) (en cqw), réduit s'il est trop large. */
export const sansText = (
  context: Context,
  value: string,
  x: number,
  y: number,
  style: { size: number; weight: number; color: string; spacing?: number; room?: number },
): void => {
  context.save();
  context.font = `${style.weight} ${style.size * MCQW}px ${SANS}`;
  context.letterSpacing = `${(style.spacing ?? 0) * style.size * MCQW}px`;
  context.fillStyle = style.color;
  context.textBaseline = 'top';
  const room = (style.room ?? 100 - 2 * x) * MCQW;
  const width = context.measureText(value).width;
  context.translate(x * MCQW, y * MCQW);
  if (width > room) context.scale(room / width, 1);
  context.fillText(value, 0, 0);
  context.restore();
};
