import { HAND, SERIF_FONT } from '../strangeBook/pageItems';

/**
 * Ce que le chercheur trace à la main sur les pages des tâches (maquette validée .ai/maquette-taches.html, son code repris
 * tel quel) : les bouts de papier glissés entre les pages, les tampons dateurs, les traits de crayon. Dans le repère de
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

/** L'encre violette des tampons dateurs (maquette validée .ai/maquette-guichet.html). */
export const STAMP_INK = 'rgba(92, 52, 140, 0.82)';

/** Le tampon dateur, dessiné une fois par date et par graine (l'encre qui manque par endroits se tire au hasard). */
const STAMP_WIDTH = 96;
const STAMP_HEIGHT = 44;
const STAMP_SCALE = 2;
const stampCache = new Map<string, HTMLCanvasElement>();

const stampImage = (label: string, seed: number): HTMLCanvasElement => {
  const key = `${label}:${seed}`;
  const cached = stampCache.get(key);
  if (cached) return cached;
  const random = seeded(seed);
  const canvas = document.createElement('canvas');
  canvas.width = (STAMP_WIDTH + 8) * STAMP_SCALE;
  canvas.height = (STAMP_HEIGHT + 8) * STAMP_SCALE;
  const context = canvas.getContext('2d')!;
  context.scale(STAMP_SCALE, STAMP_SCALE);
  context.translate(4, 4);
  context.strokeStyle = STAMP_INK;
  context.fillStyle = STAMP_INK;
  context.lineWidth = 2.2;
  context.beginPath();
  context.roundRect(0, 0, STAMP_WIDTH, STAMP_HEIGHT, 5);
  context.stroke();
  context.lineWidth = 0.9;
  context.beginPath();
  context.roundRect(4, 4, STAMP_WIDTH - 8, STAMP_HEIGHT - 8, 3);
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.font = `bold 9px ${SERIF_FONT}`;
  context.letterSpacing = '2px';
  context.fillText('BABEL', STAMP_WIDTH / 2, 8);
  context.font = `bold 17px ${SERIF_FONT}`;
  context.letterSpacing = '1px';
  context.fillText(label, STAMP_WIDTH / 2, 19);
  // L'encre manque par endroits.
  context.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) {
    context.globalAlpha = 0.3 + random() * 0.6;
    context.beginPath();
    context.arc(random() * STAMP_WIDTH, random() * STAMP_HEIGHT, 0.4 + random() * 1.6, 0, Math.PI * 2);
    context.fill();
  }
  if (stampCache.size > 200) stampCache.clear();
  stampCache.set(key, canvas);
  return canvas;
};

/** Un tampon dateur à l'encre violette (« 31 OCT. »), centré sur (x, y), de travers, un peu baveux. */
export const dateStamp = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  angle: number,
  scale = 1,
  seed = 7,
): void => {
  const width = (STAMP_WIDTH + 8) * scale;
  const height = (STAMP_HEIGHT + 8) * scale;
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.globalAlpha = 0.92;
  context.drawImage(stampImage(label, seed), -width / 2, -height / 2, width, height);
  context.restore();
};

/** La date d'un tampon dateur, dans la langue du jeu : « 31 OCT. », « 31 OCT ». */
export const stampDate = (at: number, locale: string): string =>
  new Date(at).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' }).toLocaleUpperCase();

/** Ce que vaut une tâche : de petits tampons au coin du papier, au crayon tant qu'ils ne sont pas gagnés. */
export const worth = (context: CanvasRenderingContext2D, right: number, y: number, count: number, filled: boolean): void => {
  for (let i = 0; i < count; i++) {
    context.save();
    context.translate(right - i * 22, y);
    context.rotate(-0.08 + i * 0.05);
    context.beginPath();
    context.roundRect(-8, -6, 16, 12, 2);
    if (filled) {
      context.fillStyle = STAMP_INK;
      context.globalAlpha = 0.85;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = '#f6eedb';
      context.lineWidth = 0.8;
      context.strokeRect(-5, -3, 10, 6);
    } else {
      context.strokeStyle = PENCIL;
      context.lineWidth = 1.3;
      context.stroke();
    }
    context.restore();
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
