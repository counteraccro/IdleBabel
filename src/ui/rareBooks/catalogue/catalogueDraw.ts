import '@fontsource/caveat/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';

/**
 * Outils de dessin du Catalogue des catalogues, repris des maquettes (.ai/maquette-catalogue.html et
 * .ai/maquette-catalogue-pages.html) : le cuir bleu nuit et l'or de la couverture, le papier ivoire,
 * l'encre, les rubriques rouges et le crayon des pages.
 */

export type Context = CanvasRenderingContext2D;

export const FELL = "'IM Fell English', Georgia, serif";
export const FELL_SC = "'IM Fell English SC', Georgia, serif";
export const GARA = "'Cormorant Garamond', Georgia, serif";
export const HAND = "'Caveat', cursive";
export const INK = 'rgba(30,22,16,0.9)';
export const RUBRIC = 'rgba(142,42,30,0.9)';
export const PENCIL = 'rgba(72,72,78,0.62)';
/** Le cuir bleu nuit de la couverture. */
export const NIGHT: [string, string] = ['#1f2a3d', '#0e1420'];

export const loadCatalogueFonts = (): Promise<unknown> =>
  Promise.all(
    [`19px ${FELL}`, `italic 19px ${FELL}`, `13px ${FELL_SC}`, `600 26px ${HAND}`, `500 18px ${GARA}`, `italic 500 34px ${GARA}`, `600 46px ${GARA}`].map(
      (font) => document.fonts.load(font),
    ),
  );

/** Hasard reproductible (Park-Miller), celui des maquettes. */
export const rng = (seed: number): (() => number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

/** Texte posé sur sa ligne de base (comme dans les maquettes). */
export const text = (
  context: Context,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient = INK,
  align: CanvasTextAlign = 'center',
  spacing = 0,
): void => {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(value, x + (align === 'center' ? spacing / 2 : 0), y);
  context.restore();
};

export const width = (context: Context, value: string, font: string): number => {
  context.save();
  context.font = font;
  const measured = context.measureText(value).width;
  context.restore();
  return measured;
};

export const pencil = (context: Context, value: string, x: number, y: number, size = 28, angle = 0, align: CanvasTextAlign = 'left'): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  text(context, value, 0, 0, `600 ${size}px ${HAND}`, PENCIL, align);
  context.restore();
};

export const gold = (context: Context, y0: number, y1: number): CanvasGradient => {
  const g = context.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#f3dc96');
  g.addColorStop(0.5, '#c9a052');
  g.addColorStop(1, '#8a6a2e');
  return g;
};

export const vignette = (context: Context, w: number, h: number, alpha = 0.4): void => {
  const v = context.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${alpha})`);
  context.fillStyle = v;
  context.fillRect(0, 0, w, h);
};

/** Cuir : grain, griffures. */
export const leather = (context: Context, x: number, y: number, w: number, h: number, seed: number, tone: [string, string]): void => {
  const g = context.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, tone[0]);
  g.addColorStop(1, tone[1]);
  context.fillStyle = g;
  context.fillRect(x, y, w, h);
  const random = rng(seed);
  for (let i = 0; i < (w * h) / 90; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(255,230,200,0.035)' : 'rgba(0,0,0,0.09)';
    context.fillRect(x + random() * w, y + random() * h, 1 + random() * 2, 1 + random() * 2);
  }
  context.lineWidth = 1;
  for (let i = 0; i < (w * h) / 9000; i++) {
    context.strokeStyle = 'rgba(255,225,190,0.06)';
    context.beginPath();
    const [sx, sy] = [x + random() * w, y + random() * h];
    context.moveTo(sx, sy);
    context.lineTo(sx + (random() - 0.5) * 50, sy + (random() - 0.5) * 18);
    context.stroke();
  }
};

export const rule = (context: Context, x0: number, x1: number, y: number, thickness = 1, color: string = INK): void => {
  context.fillStyle = color;
  context.fillRect(x0, y, x1 - x0, thickness);
};

/** Un losange entre deux filets. */
export const fleuron = (context: Context, x: number, y: number, color: string | CanvasGradient = INK, half = 7): void => {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - half);
  context.lineTo(x + half, y);
  context.lineTo(x, y + half);
  context.lineTo(x - half, y);
  context.closePath();
  context.fill();
};
