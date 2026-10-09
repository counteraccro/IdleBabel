import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import '@fontsource/dm-serif-display/400.css';
import { hexagon, text } from '../almanac/almanacDraw';

/**
 * Les outils des « Dark patterns par l'exemple » (maquettes .ai/maquette-dark-patterns.html, piste B « le
 * best-seller », et .ai/maquette-dark-patterns-pages.html) : le dégradé violet-orangé, les polices, des formes
 * d'interface (interrupteur, main de pointeur, étoiles). Mesures des maquettes, sans échelle.
 */

export const GROTESK = "'Space Grotesk', 'Inter', sans-serif";
export const SANS = "'Inter', 'Helvetica Neue', sans-serif";
export const SERIF = "'DM Serif Display', Georgia, serif";

export const VIOLET = '#3a1670';
export const PINK = '#c23b7a';
export const ORANGE = '#ff8a3c';
export const YELLOW = '#ffd23f';
export const NIGHT = '#1a1020';
export const GREEN = '#32d17a';

export const loadDarkPatternsFonts = (): Promise<unknown> =>
  Promise.all(
    [
      '500 40px "Space Grotesk"',
      '700 40px "Space Grotesk"',
      '400 40px Inter',
      'italic 400 40px Inter',
      '600 40px Inter',
      '800 40px Inter',
      '40px "DM Serif Display"',
    ].map((font) => document.fonts.load(font)),
  );

export { hexagon, text };

/** Le dégradé de la couverture, de (x0, y0) à (x1, y1) : violet, rose, orange. */
export const gradient = (context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
  const fill = context.createLinearGradient(x0, y0, x1, y1);
  fill.addColorStop(0, VIOLET);
  fill.addColorStop(0.55, PINK);
  fill.addColorStop(1, ORANGE);
  return fill;
};

/** Hasard reproductible (Park-Miller), le même que celui des maquettes. */
export const random = (seed: number): (() => number) => {
  let value = seed;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
};

/** Grain d'impression léger, pour que l'aplat ne fasse pas écran. */
export const grain = (context: CanvasRenderingContext2D, width: number, height: number, seed: number, alpha: number): void => {
  const next = random(seed);
  for (let dot = 0; dot < (width * height) / 90; dot++) {
    context.fillStyle = `rgba(${next() < 0.5 ? '0,0,0' : '255,255,255'},${alpha * next()})`;
    context.fillRect(next() * width, next() * height, 2, 2);
  }
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

export const roundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | number[],
): void => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

/** Le sceau de la Bibliothèque, à la place de l'éditeur ; `align` : où tombe `x`. */
export const mark = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color: string,
  inner: string,
  size = 24,
  align: 'left' | 'right' | 'center' = 'left',
): void => {
  const font = `500 ${size}px ${GROTESK}`;
  const width = measure(context, label, font, 1) + size * 2;
  const left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  const radius = size * 0.75;
  hexagon(context, left + radius, y - size * 0.36, radius, size / 6, color, color);
  hexagon(context, left + radius, y - size * 0.36, radius * 0.44, size / 8, inner);
  text(context, label, left + size * 2, y, font, color, 'left', 1);
};

/** Étoile à cinq branches. */
export const star = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string): void => {
  context.save();
  context.translate(x, y);
  context.fillStyle = fill;
  context.beginPath();
  for (let point = 0; point < 10; point++) {
    const reach = point % 2 ? radius * 0.45 : radius;
    const angle = (Math.PI * point) / 5 - Math.PI / 2;
    context[point ? 'lineTo' : 'moveTo'](reach * Math.cos(angle), reach * Math.sin(angle));
  }
  context.closePath();
  context.fill();
  context.restore();
};

/** Pointeur en forme de main (doigt tendu), pointe en (x, y), haut de `size`. */
export const hand = (context: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke: string): void => {
  context.save();
  context.translate(x, y);
  context.scale(size / 100, size / 100);
  context.lineJoin = 'round';
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(0, 8);
  context.quadraticCurveTo(0, -4, 11, -4);
  context.quadraticCurveTo(22, -4, 22, 8);
  context.lineTo(22, 58);
  context.quadraticCurveTo(26, 48, 36, 50);
  context.quadraticCurveTo(44, 52, 44, 62);
  context.quadraticCurveTo(48, 54, 58, 57);
  context.quadraticCurveTo(66, 60, 66, 70);
  context.quadraticCurveTo(72, 62, 81, 66);
  context.quadraticCurveTo(88, 70, 88, 80);
  context.lineTo(88, 116);
  context.quadraticCurveTo(88, 150, 60, 158);
  context.lineTo(30, 158);
  context.quadraticCurveTo(10, 150, -2, 128);
  context.lineTo(-22, 92);
  context.quadraticCurveTo(-28, 78, -16, 74);
  context.quadraticCurveTo(-6, 72, 0, 84);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.stroke();
  context.lineWidth = 4;
  context.beginPath();
  for (const finger of [44, 66]) {
    context.moveTo(finger, 62);
    context.lineTo(finger, 86);
  }
  context.stroke();
  context.restore();
};

/** Écrit au dos, de haut en bas (le haut des lettres vers la droite). */
export const along = (context: CanvasRenderingContext2D, x: number, y: number, draw: () => void): void => {
  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 2);
  draw();
  context.restore();
};
