import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/eb-garamond/400-italic.css';

/**
 * Outils de dessin de « Colorie la Bibliothèque » (maquette .ai/maquette-coloriage.html) : les lettres rondes du
 * kiosque, le papier, le grain du crayon, les crayons de la boîte. Tout se dessine aux unités de la maquette
 * (une page 640 × 800, comme la texture des pages).
 */

export const [W, H] = [640, 800];
export const ROUND = "'Fredoka', 'Arial Rounded MT Bold', sans-serif";
export const GARA = "'EB Garamond', Georgia, serif";
/** Le blanc d'une zone pas encore coloriée. */
export const PAPER = '#f7f0de';
/** L'encre des contours. */
export const LINE = '#1c1814';
/** Les couleurs du titre en lettres rondes, et des pastilles du plat arrière. */
export const RAINBOW = ['#d8492f', '#f4c430', '#4f9fd8', '#5aa84a', '#e88ca0', '#8a5ad8', '#e0a060'];

export const loadColoringFonts = (): Promise<unknown> =>
  Promise.all(
    [`500 20px ${ROUND}`, `600 20px ${ROUND}`, `700 20px ${ROUND}`, `italic 20px ${GARA}`].map((font) => document.fonts.load(font)),
  );

export const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Du texte posé par sa ligne de base, comme dans la maquette (centré : l'espacement après la dernière lettre ne le décale pas). */
export const text = (
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'center',
  spacing = 0,
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(line, x + (align === 'center' ? spacing / 2 : 0), y);
  context.letterSpacing = '0px';
};

/** La taille (au plus `size`) à laquelle `line` tient dans `width` (un titre anglais plus long). */
export const fit = (
  context: CanvasRenderingContext2D,
  line: string,
  font: (size: number) => string,
  size: number,
  width: number,
): number => {
  context.font = font(size);
  const natural = context.measureText(line).width;
  return natural <= width ? size : (size * width) / natural;
};

/** Le grain du papier : de petits points bruns, tirés de `seed`. */
export const paperGrain = (context: CanvasRenderingContext2D, seed: number): void => {
  const random = rng(seed);
  for (let i = 0; i < (W * H) / 120; i++) {
    context.fillStyle = `rgba(120,90,50,${random() * 0.05})`;
    context.fillRect(random() * W, random() * H, 1, 1);
  }
};

/** Le numéro de la page, en bas, côté tranche. */
export const folio = (context: CanvasRenderingContext2D, page: number, left: boolean): void =>
  text(context, String(page), left ? 54 : W - 54, H - 34, `500 20px ${ROUND}`, '#8a7a60');

const grains = new Map<string, HTMLCanvasElement>();

/** Le grain du crayon : la couleur, et des traits en biais où le papier se voit (un motif par couleur, gardé). */
export const crayon = (context: CanvasRenderingContext2D, color: string): CanvasPattern => {
  let grain = grains.get(color);
  if (!grain) {
    grain = document.createElement('canvas');
    grain.width = grain.height = 120;
    const g = grain.getContext('2d')!;
    g.fillStyle = color;
    g.fillRect(0, 0, 120, 120);
    const random = rng((color.split('').reduce((sum, letter) => sum * 31 + letter.charCodeAt(0), 7) % 2147483646) + 1);
    g.lineCap = 'round';
    for (let i = 0; i < 420; i++) {
      const [x, y, length] = [random() * 140 - 10, random() * 140 - 10, 6 + random() * 16];
      g.strokeStyle = random() < 0.6 ? `rgba(255,252,240,${0.1 + random() * 0.22})` : `rgba(0,0,0,${0.04 + random() * 0.08})`;
      g.lineWidth = 0.8 + random() * 1.6;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + length * 0.8, y - length);
      g.stroke();
    }
    grains.set(color, grain);
  }
  return context.createPattern(grain, 'repeat')!;
};

/** `color` (#rrggbb) éclaircie ou assombrie de `k`. */
const shade = (color: string, k: number): string => {
  const n = Number.parseInt(color.slice(1), 16);
  const f = (v: number): number => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/** Un crayon de couleur debout, pointe en haut : le corps à six pans (trois bandes), la pointe taillée, la mine. */
export const pencil = (context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void => {
  const tip = h * 0.2;
  context.fillStyle = '#e8c89a';
  context.beginPath();
  context.moveTo(x, y + tip);
  context.lineTo(x + w / 2, y);
  context.lineTo(x + w, y + tip);
  context.closePath();
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + w * 0.36, y + tip * 0.36);
  context.lineTo(x + w / 2, y);
  context.lineTo(x + w * 0.64, y + tip * 0.36);
  context.closePath();
  context.fill();
  context.fillStyle = shade(color, 0.78);
  context.fillRect(x, y + tip, w / 3, h - tip);
  context.fillStyle = color;
  context.fillRect(x + w / 3, y + tip, w / 3, h - tip);
  context.fillStyle = shade(color, 1.18);
  context.fillRect(x + (2 * w) / 3, y + tip, w / 3, h - tip);
  // Les festons de la taille.
  context.fillStyle = shade(color, 0.9);
  context.beginPath();
  context.moveTo(x, y + tip);
  for (let i = 0; i < 3; i++) context.quadraticCurveTo(x + (w * (i + 0.5)) / 3, y + tip + 8, x + (w * (i + 1)) / 3, y + tip);
  context.closePath();
  context.fill();
  context.strokeStyle = 'rgba(0,0,0,0.45)';
  context.lineWidth = 1.5;
  context.strokeRect(x, y + tip, w, h - tip);
};

/** Des crayons qui traînent : [x, y, angle, couleur]. */
export const scattered = (context: CanvasRenderingContext2D, list: readonly (readonly [number, number, number, string])[]): void => {
  for (const [x, y, angle, color] of list) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    pencil(context, -15, -110, 30, 220, color);
    context.restore();
  }
};

/** Un mot en grosses lettres rondes, chacune de sa couleur, cernée de noir, un peu dansantes ; centré sur `x`. */
export const roundLetters = (
  context: CanvasRenderingContext2D,
  word: string,
  x: number,
  y: number,
  size: number,
  colors: readonly string[],
  maxWidth = Infinity,
): void => {
  context.save();
  context.font = `700 ${size}px ${ROUND}`;
  const natural = [...word].reduce((sum, letter) => sum + context.measureText(letter).width, 0);
  // Un mot trop long (en anglais) se resserre, sans changer de hauteur.
  const squeeze = Math.min(1, maxWidth / natural);
  context.translate(x, 0);
  context.scale(squeeze, 1);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  let at = -natural / 2;
  [...word].forEach((letter, index) => {
    const wobble = Math.sin(index * 1.7) * size * 0.04;
    context.lineWidth = size * 0.16;
    context.strokeStyle = LINE;
    context.strokeText(letter, at, y + wobble);
    context.fillStyle = colors[index % colors.length];
    context.fillText(letter, at, y + wobble);
    at += context.measureText(letter).width;
  });
  context.restore();
};
