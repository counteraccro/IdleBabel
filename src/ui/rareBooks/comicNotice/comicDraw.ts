import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/comic-neue/700.css';
import '@fontsource/luckiest-guy/400.css';
import { LETTERS } from '../../../systems/babelText';

/**
 * Outils de dessin de « Gare aux pages » (maquette .ai/maquette-bd-notice.html, validée le 22/10) : une scène dessinée
 * en ligne claire sur un canvas caché, puis réécrite avec les seuls symboles de Babel ; les cases, les récitatifs, les
 * bulles et les onomatopées. Tout se dessine aux unités de la maquette (une page 640 × 800, comme la texture des pages).
 */

export const [W, H] = [640, 800];
export const PAPER = '#f3ecdc';
export const INK = '#2b2118';
const SOFT = '#6d5d4a';
export const CAPTION = '#f2dc8c';
export const MONO = "'Courier Prime', monospace";
export const LETTERING = "'Comic Neue', 'Comic Sans MS', sans-serif";
export const TITLE = "'Luckiest Guy', Impact, sans-serif";
/** Taille des caractères du dessin (« moyens » dans la maquette). */
export const CELL = 9;
export const MARGIN = 26;
export const GUTTER = 12;

export const loadComicFonts = (): Promise<unknown> =>
  Promise.all([`bold 48px ${MONO}`, `bold 13px ${LETTERING}`, `30px ${TITLE}`].map((font) => document.fonts.load(font)));

export const seeded = (seed: number) => (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Du charabia de Babel, toujours le même pour une graine. */
export const babel = (n: number, seed: number): string => {
  const r = seeded(seed);
  let t = '';
  for (let i = 0; i < n; i++) {
    const v = r();
    t += v < 0.16 ? ' ' : v < 0.18 ? ',' : v < 0.19 ? '.' : LETTERS[Math.floor(r() * LETTERS.length)];
  }
  return t;
};

/** Épaisseur du trait des scènes : à l'échelle des lettres, pour qu'un trait tombe sur une colonne de lettres. */
export const LINE = (): number => CELL * 0.42;

/** Le canvas caché où se dessinent les scènes, réutilisé d'une case à l'autre. */
let off: CanvasRenderingContext2D | undefined;

export type Scene = (o: CanvasRenderingContext2D, w: number, h: number) => void;

/**
 * Une scène en lettres. Chaque case de lettres regarde son morceau du dessin : très noir, un « m » ; un trait, une lettre
 * qui en suit la direction (l vertical, o horizontal, z et x en biais) ; rien, un espace.
 */
export const asciiArt = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, scene: Scene): void => {
  const cw = CELL * 0.6;
  const ch = CELL;
  const cols = Math.floor(w / cw);
  const rows = Math.floor(h / ch);
  const [kx, ky] = [8, 13];
  const [width, height] = [cols * kx, rows * ky];
  off ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const o = off;
  [o.canvas.width, o.canvas.height] = [width, height];
  o.fillStyle = '#fff';
  o.fillRect(0, 0, width, height);
  o.save();
  o.scale(width / w, height / h);
  scene(o, w, h);
  o.restore();
  const data = o.getImageData(0, 0, width, height).data;
  // L'encre de chaque point (0 blanc, 1 noir), lue une fois.
  const ink = new Float32Array(width * height);
  for (let i = 0; i < ink.length; i++) ink[i] = 1 - data[i * 4] / 255;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = `bold ${CELL}px ${MONO}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let j = 0; j < rows; j++) {
    let line = '';
    for (let i = 0; i < cols; i++) {
      let [sum, jxx, jyy, jxy] = [0, 0, 0, 0];
      for (let yy = j * ky; yy < (j + 1) * ky; yy++) {
        const rowAt = yy * width;
        const inside = yy > 0 && yy < height - 1;
        for (let xx = i * kx; xx < (i + 1) * kx; xx++) {
          const at = rowAt + xx;
          sum += ink[at];
          if (inside && xx > 0 && xx < width - 1) {
            const gx = ink[at + 1] - ink[at - 1];
            const gy = ink[at + width] - ink[at - width];
            jxx += gx * gx;
            jyy += gy * gy;
            jxy += gx * gy;
          }
        }
      }
      const n = kx * ky;
      const cover = sum / n;
      let c = ' ';
      if (cover > 0.62) c = 'm';
      else if (cover > 0.08 && jxx + jyy > 0.4) {
        // Direction du trait : perpendiculaire au gradient dominant (0 = horizontal, ±90 = vertical).
        const grad = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
        let a = ((grad + Math.PI / 2) * 180) / Math.PI;
        a = ((((a + 90) % 180) + 180) % 180) - 90;
        c = Math.abs(a) > 62 ? 'l' : Math.abs(a) < 26 ? 'o' : a > 0 ? 'x' : 'z';
      } else if (cover > 0.2) c = 'o';
      line += c;
    }
    ctx.fillText(line, x + (w - cols * cw) / 2, y + (h - rows * ch) / 2 + j * ch);
  }
  ctx.restore();
};

/** Le cadre d'une case, à l'encre (choisi par l'auteur). */
const frame = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (ctx.measureText(tried).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  return [...lines, line];
};

/** Le récitatif : un cartouche jaune (la voix de la notice). */
export const caption = (ctx: CanvasRenderingContext2D, x: number, y: number, maxW: number, text: string): void => {
  ctx.save();
  ctx.font = `bold 13px ${LETTERING}`;
  const lines = wrap(ctx, text.toUpperCase(), maxW - 14);
  const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 14);
  const bh = lines.length * 15 + 9;
  ctx.fillStyle = CAPTION;
  ctx.fillRect(x, y, bw, bh);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, bw, bh);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 7, y + 5 + i * 15));
  ctx.restore();
};

/** Une bulle en points de Babel, dont la queue va vers (tx, ty) ; son texte en lettres de Babel. */
export const bubble = (ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, tx: number, ty: number, maxW = 150): void => {
  ctx.save();
  ctx.font = `bold ${CELL + 2}px ${MONO}`;
  const lines = wrap(ctx, text, maxW);
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const [rx, ry] = [tw / 2 + 16, lines.length * 8 + 12];
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + ry * 0.7);
  ctx.lineTo(tx, ty);
  ctx.lineTo(cx + 8, cy + ry * 0.7);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `${CELL}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const n = Math.round((Math.PI * (rx + ry)) / (CELL * 0.75));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.18) continue;
    ctx.fillText('.', cx + Math.cos(a) * rx, cy + Math.sin(a) * ry);
  }
  for (let i = 1; i < 6; i++) {
    const f = i / 6;
    ctx.fillText('.', cx + (tx - cx) * f + 5 * (1 - f), cy + ry + (ty - cy - ry) * f);
    ctx.fillText('.', cx + (tx - cx) * f - 5 * (1 - f), cy + ry + (ty - cy - ry) * f);
  }
  ctx.font = `bold ${CELL + 2}px ${MONO}`;
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + (i - (lines.length - 1) / 2) * 15));
  ctx.restore();
};

/** Une onomatopée, en grosses lettres de Babel (elles existent toutes dans l'alphabet : f, r, t, z…). */
export const sound = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size = 30, angle = -0.12): void => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `bold ${size}px ${TITLE}`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
};

/** Le numéro de la planche, en bas au milieu (la page elle-même : le papier du livre). */
export const folio = (ctx: CanvasRenderingContext2D, number: number): void => {
  ctx.save();
  ctx.fillStyle = SOFT;
  ctx.font = `bold 13px ${LETTERING}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(number), W / 2, H - 10);
  ctx.restore();
};

/** Le titre d'une planche, en haut. */
export const plateTitle = (ctx: CanvasRenderingContext2D, text: string): void => {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = `30px ${TITLE}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, 50);
  ctx.restore();
};

/** Une case : son dessin en lettres, son cadre, puis ce qui s'écrit par-dessus. */
export const panel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scene: Scene,
  over?: (x: number, y: number, w: number, h: number) => void,
): void => {
  asciiArt(ctx, x + 4, y + 4, w - 8, h - 8, scene);
  frame(ctx, x, y, w, h);
  over?.(x, y, w, h);
};

/** Des mots de l'interface, écrits avec les lettres de Babel dans la grille du dessin (même police, même encre). */
export const grid = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  size = CELL,
  align: CanvasTextAlign = 'left',
): void => {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = `bold ${size}px ${MONO}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
};

/** Un paragraphe de charabia dans un cadre (une page du livre), avec éventuellement une ligne surlignée. */
export const charabia = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  rows: number,
  seed: number,
  highlight = -1,
  sentence = '',
): void => {
  const cols = Math.floor(w / (CELL * 0.6));
  for (let j = 0; j < rows; j++) {
    if (j === highlight) {
      ctx.save();
      ctx.fillStyle = CAPTION;
      ctx.fillRect(x - 2, y + j * (CELL + 2) - 1, w + 4, CELL + 3);
      ctx.restore();
      grid(ctx, x, y + j * (CELL + 2), `${sentence} ${babel(cols, seed + j)}`.slice(0, cols));
    } else grid(ctx, x, y + j * (CELL + 2), babel(cols, seed + j * 31));
  }
};
