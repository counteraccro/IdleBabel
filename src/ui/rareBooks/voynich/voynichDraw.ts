import { HAND } from '../draw';
import { INK, rng, voynichWord, word, wordWidth } from './voynichScript';

/** Les outils de dessin communs à la couverture et aux pages du Manuscrit de Voynich (mesures des maquettes). */

type Context = CanvasRenderingContext2D;
export type Path = (context: Context) => void;
export type Tone = readonly [string, string, string];

export const FELL = "'IM Fell English', Georgia, serif";
export const FELL_SC = "'IM Fell English SC', Georgia, serif";
export { HAND };

/** Les couleurs passées à l'aquarelle. */
export const GREEN = 'rgba(96,128,64,0.55)';
export const BLUE = 'rgba(70,100,150,0.55)';
export const OCHRE = 'rgba(160,110,60,0.5)';
export const ROSE = 'rgba(170,70,50,0.45)';
export const GOLDEN = 'rgba(200,160,70,0.55)';
export const WATER = 'rgba(80,130,120,0.5)';
export const PENCIL = 'rgba(80,80,80,0.62)';

/** Texte posé sur sa ligne de base (comme dans les maquettes). */
export const text = (
  context: Context,
  label: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'center',
): void => {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillText(label, x, y);
  context.restore();
};

/** Une note au crayon d'un lecteur venu avant. */
export const pencil = (
  context: Context,
  label: string,
  x: number,
  y: number,
  size = 28,
  angle = 0,
  align: CanvasTextAlign = 'left',
): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  text(context, label, 0, 0, `600 ${size}px ${HAND}`, PENCIL, align);
  context.restore();
};

/** Le vélin : peau de chèvre pâle, gondolée, follicules et veines. `soft` : celui des pages, un peu plus léger. */
export const vellum = (context: Context, w: number, h: number, seed: number, tone: Tone, soft = false): void => {
  const shade = context.createRadialGradient(w * 0.45, h * 0.4, 20, w / 2, h / 2, Math.max(w, h) * 0.75);
  shade.addColorStop(0, tone[0]);
  shade.addColorStop(0.7, tone[1]);
  shade.addColorStop(1, tone[2]);
  context.fillStyle = shade;
  context.fillRect(0, 0, w, h);
  const random = rng(seed);
  for (let i = 0; i < 11; i++) {
    const y = random() * h;
    const band = context.createLinearGradient(0, y - 70, 0, y + 70);
    band.addColorStop(0, 'rgba(0,0,0,0)');
    band.addColorStop(0.5, random() < 0.5 ? `rgba(90,65,30,${soft ? 0.06 : 0.08})` : `rgba(255,250,235,${soft ? 0.12 : 0.14})`);
    band.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = band;
    context.fillRect(0, y - 70, w, 140);
  }
  for (let i = 0; i < (w * h) / 700; i++) {
    context.fillStyle = `rgba(110,85,50,${0.03 + random() * (soft ? 0.04 : 0.05)})`;
    context.fillRect(random() * w, random() * h, 1 + random() * 1.5, 1);
  }
  context.lineWidth = 1;
  for (let i = 0; i < (w * h) / 30000; i++) {
    context.strokeStyle = `rgba(130,100,60,${soft ? 0.08 : 0.1})`;
    context.beginPath();
    const [x, y] = [random() * w, random() * h];
    context.moveTo(x, y);
    context.bezierCurveTo(
      x + 40,
      y + (random() - 0.5) * 40,
      x + 80,
      y + (random() - 0.5) * 40,
      x + 120 * random(),
      y + (random() - 0.5) * 60,
    );
    context.stroke();
  }
};

/** Le rempli : la peau repliée sur les bords, plus sombre et usée là où les doigts passent. */
export const turnIn = (context: Context, w: number, h: number): void => {
  const edge = (x0: number, y0: number, x1: number, y1: number, alpha: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, `rgba(85,60,25,${alpha})`);
    gradient.addColorStop(1, 'rgba(85,60,25,0)');
    return gradient;
  };
  context.fillStyle = edge(0, 0, 0, 34, 0.3);
  context.fillRect(0, 0, w, 34);
  context.fillStyle = edge(0, h, 0, h - 34, 0.3);
  context.fillRect(0, h - 34, w, 34);
  context.fillStyle = edge(w, 0, w - 34, 0, 0.35);
  context.fillRect(w - 34, 0, 34, h);
  context.strokeStyle = 'rgba(110,80,40,0.22)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 18);
  context.lineTo(w - 18, 18);
  context.lineTo(w - 18, h - 18);
  context.lineTo(0, h - 18);
  context.stroke();
};

/** Une couleur passée à l'aquarelle, qui déborde un peu du trait (comme dans le manuscrit). */
export const wash = (context: Context, path: Path, color: string, dx = 4, dy = 3): void => {
  context.save();
  context.translate(dx, dy);
  path(context);
  context.fillStyle = color;
  context.fill();
  context.restore();
};

/** Le trait à la plume. */
export const outline = (context: Context, path: Path, width = 2.2): void => {
  context.save();
  path(context);
  context.strokeStyle = INK;
  context.lineWidth = width;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.stroke();
  context.restore();
};

export const painted = (context: Context, path: Path, color: string, width?: number): void => {
  wash(context, path, color);
  outline(context, path, width);
};

/** Feuille lancéolée : de (x, y), longueur l, angle a, demi-largeur w. */
export const leafPath =
  (x: number, y: number, l: number, a: number, w: number): Path =>
  (c) => {
    const [ex, ey, nx, ny] = [x + Math.cos(a) * l, y + Math.sin(a) * l, -Math.sin(a) * w, Math.cos(a) * w];
    const [mx, my] = [x + Math.cos(a) * l * 0.45, y + Math.sin(a) * l * 0.45];
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(mx + nx, my + ny, ex, ey);
    c.quadraticCurveTo(mx - nx, my - ny, x, y);
    c.closePath();
  };

/** Une étoile à sept branches, dorée. */
export const star = (context: Context, x: number, y: number, s: number): void =>
  painted(
    context,
    (c) => {
      c.beginPath();
      for (let i = 0; i < 14; i++) {
        const [a, d] = [-Math.PI / 2 + (i * Math.PI) / 7, i % 2 ? s * 0.45 : s];
        if (i) c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
        else c.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      c.closePath();
    },
    GOLDEN,
    1,
  );

/** Des mots posés le long d'un cercle de rayon `radius`, d'un angle `from` jusqu'à `to`. */
export const ringOfWords = (
  context: Context,
  cx: number,
  cy: number,
  radius: number,
  u: number,
  random: () => number,
  to = Math.PI * 2 - 0.3,
): void => {
  for (let a = 0; a < to;) {
    const label = word(random);
    const width = wordWidth(label, u);
    context.save();
    context.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    context.rotate(a + Math.PI / 2);
    voynichWord(context, label, -width / 2, u * 0.5, u, random);
    context.restore();
    a += (width + u) / radius;
  }
};

/** Un petit cercle d'étoiles : cœur doré, anneaux, rayons, étoiles, un anneau de texte (la couverture). */
export const rosette = (context: Context, cx: number, cy: number, radius: number, seed: number): void => {
  const random = rng(seed);
  painted(
    context,
    (c) => {
      c.beginPath();
      c.arc(cx, cy, radius * 0.32, 0, Math.PI * 2);
    },
    'rgba(200,160,70,0.5)',
    1.8,
  );
  outline(
    context,
    (c) => {
      c.beginPath();
      for (const ring of [0.32, 0.62, 0.7, 1]) {
        c.moveTo(cx + radius * ring, cy);
        c.arc(cx, cy, radius * ring, 0, Math.PI * 2);
      }
    },
    1.6,
  );
  outline(
    context,
    (c) => {
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        c.moveTo(cx + Math.cos(a) * radius * 0.32, cy + Math.sin(a) * radius * 0.32);
        c.lineTo(cx + Math.cos(a) * radius * 0.62, cy + Math.sin(a) * radius * 0.62);
      }
    },
    1.2,
  );
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) * Math.PI) / 8;
    star(context, cx + Math.cos(a) * radius * 0.47, cy + Math.sin(a) * radius * 0.47, radius * 0.04);
  }
  ringOfWords(context, cx, cy, radius * 0.78, radius * 0.075, random);
};
