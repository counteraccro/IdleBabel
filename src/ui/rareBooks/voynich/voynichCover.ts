import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { GREEN, BLUE, HAND, OCHRE, ROSE, leafPath, outline, painted, rosette, star, text, turnIn, vellum, type Tone } from './voynichDraw';
import { rng, voynichLines, voynichWord } from './voynichScript';
import type * as THREE from 'three';

/**
 * La couverture du Manuscrit de Voynich (maquette .ai/maquette-voynich.html, piste C « L'herbier inconnu ») :
 * le vélin est devenu une page. Une grande plante peinte à même la couverture, un petit cercle d'étoiles,
 * l'écriture tout autour ; le titre n'est écrit que dans cette écriture, et un lecteur a ajouté au crayon
 * « Voynich ? ». On dessine dans les mesures de la maquette (plats 640 × 800, dos 130 × 800), mises à
 * l'échelle des textures.
 */

const [W, H, SPINE_W] = [640, 800, 130];
/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
export const THICKNESS = SPINE_W / H / 1.4;
const TONE: Tone = ['#efe5cc', '#ddcda8', '#bfa878'];
/** Le vélin, pour les bords des plats et l'intérieur. */
export const VELLUM = '#ddcda8';
const VELLUM_EDGE = '#bfa878';
/** Le titre, écrit dans l'écriture du manuscrit. */
const TITLE = ['qokeedy', 'otaiin', 'cey'];

type Context = CanvasRenderingContext2D;

/**
 * La plante de la couverture : un gros tubercule, des racines qui se tordent, une tige, de grandes feuilles
 * nervurées, une fleur bleue en coupe. (cx, base) = haut du tubercule ; s = échelle (1 ≈ 300 au-dessus).
 */
const plant = (context: Context, cx: number, base: number, s: number, seed: number): void => {
  const random = rng(seed);
  outline(
    context,
    (c) => {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const [a, l] = [Math.PI * (0.25 + i * 0.1), (70 + random() * 50) * s];
        const [sx, sy] = [cx + Math.cos(a) * 30 * s, base + 44 * s];
        c.moveTo(sx, sy);
        c.bezierCurveTo(
          sx + (random() - 0.5) * 60 * s,
          sy + l * 0.4,
          sx + Math.cos(a) * l * 0.6,
          sy + l * 0.7,
          sx + Math.cos(a) * l,
          sy + l,
        );
      }
    },
    2 * s + 0.6,
  );
  painted(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(cx - 10 * s, base);
      c.bezierCurveTo(cx - 70 * s, base + 4 * s, cx - 64 * s, base + 64 * s, cx, base + 60 * s);
      c.bezierCurveTo(cx + 64 * s, base + 64 * s, cx + 72 * s, base + 4 * s, cx + 10 * s, base);
      c.closePath();
    },
    OCHRE,
    2.2 * s + 0.6,
  );
  const top = base - 300 * s;
  outline(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(cx - 5 * s, base);
      c.bezierCurveTo(cx - 30 * s, base - 120 * s, cx + 26 * s, base - 200 * s, cx - 4 * s, top + 30 * s);
      c.moveTo(cx + 5 * s, base);
      c.bezierCurveTo(cx - 20 * s, base - 120 * s, cx + 36 * s, base - 200 * s, cx + 6 * s, top + 30 * s);
    },
    2 * s + 0.6,
  );
  for (let i = 0; i < 5; i++) {
    const [t, side] = [i / 5, i % 2 ? 1 : -1];
    const [y, x] = [base - (40 + t * 220) * s, cx + Math.sin(t * 5) * 10 * s];
    const [l, a, w] = [(150 - t * 70) * s, side > 0 ? -0.35 - t * 0.5 : Math.PI + 0.35 + t * 0.5, (34 - t * 10) * s];
    painted(context, leafPath(x, y, l, a, w), GREEN, 2 * s + 0.6);
    outline(
      context,
      (c) => {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(a) * l * 0.85, y + Math.sin(a) * l * 0.85);
      },
      1.2 * s + 0.4,
    );
    outline(
      context,
      (c) => {
        c.beginPath();
        for (let vein = 1; vein < 5; vein++) {
          const [px, py] = [x + (Math.cos(a) * l * vein) / 6, y + (Math.sin(a) * l * vein) / 6];
          for (const sd of [-1, 1]) {
            c.moveTo(px, py);
            c.lineTo(px + Math.cos(a + sd * 0.7) * w * 0.7, py + Math.sin(a + sd * 0.7) * w * 0.7);
          }
        }
      },
      0.8 * s + 0.3,
    );
  }
  for (let petal = 0; petal < 7; petal++)
    painted(context, leafPath(cx, top + 20 * s, 70 * s, -Math.PI / 2 + (petal - 3) * 0.3, 14 * s), BLUE, 1.8 * s + 0.5);
  painted(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(cx - 34 * s, top + 8 * s);
      c.quadraticCurveTo(cx, top + 70 * s, cx + 34 * s, top + 8 * s);
      c.quadraticCurveTo(cx, top + 22 * s, cx - 34 * s, top + 8 * s);
      c.closePath();
    },
    ROSE,
    2 * s + 0.6,
  );
};

/** Le titre dans l'écriture du manuscrit, mot après mot, à partir de `x`. */
const title = (context: Context, x: number, u: number, gap: number, seed: number): void => {
  const random = rng(seed);
  for (const label of TITLE) x += voynichWord(context, label, x, 0, u, random, 'rgba(62,36,18,0.9)') + gap;
};

/** Un plat aux mesures de la maquette. */
const plate = (draw: (context: Context) => void): THREE.CanvasTexture =>
  board(VELLUM, VELLUM_EDGE, (context) => {
    context.scale(WIDTH / W, HEIGHT / H);
    draw(context);
  });

/** Le plat : le titre en écriture inconnue, la plante, le cercle d'étoiles, le texte qui les contourne, le crayon. */
export const voynichFront = (): THREE.CanvasTexture =>
  plate((context) => {
    vellum(context, W, H, 2408, TONE);
    turnIn(context, W, H);
    context.save();
    context.translate(0, 110);
    title(context, 120, 22, 22, 51);
    context.restore();
    voynichLines(context, 70, W - 70, 154, 210, 10, 28, 61);
    plant(context, W / 2 - 40, 580, 1.0, 88);
    rosette(context, W - 130, 350, 70, 5);
    voynichLines(context, W / 2 + 130, W - 70, 470, 610, 10, 28, 62);
    voynichLines(context, 70, W - 70, 700, 728, 10, 28, 63, () => [W / 2 - 170, W / 2 + 90]);
    text(context, messages().rareBooks.voynich.pencil, W - 110, H - 38, `600 30px ${HAND}`, 'rgba(70,70,70,0.6)');
  });

/**
 * Le plat arrière (absent de la maquette) : le même vélin, nu, le rempli, quelques lignes en bas et une
 * étoile, comme une page dont on n'aurait gardé que la fin.
 */
export const voynichBack = (): THREE.CanvasTexture =>
  plate((context) => {
    vellum(context, W, H, 2410, TONE);
    // Le rempli, côté tranche à gauche (le plat arrière est vu de l'autre côté).
    context.save();
    context.translate(W, 0);
    context.scale(-1, 1);
    turnIn(context, W, H);
    context.restore();
    voynichLines(context, 80, W - 120, 640, 696, 10, 28, 64);
    star(context, W / 2, 740, 14);
  });

/** Le dos : le titre en écriture inconnue, de haut en bas, une étoile, le crayon. */
export const voynichSpine = (): THREE.CanvasTexture =>
  board(VELLUM, VELLUM_EDGE, (context) => {
    context.scale(WIDTH / SPINE_W, HEIGHT / H);
    vellum(context, SPINE_W, H, 2409, TONE);
    for (const x of [8, SPINE_W - 8]) {
      context.strokeStyle = 'rgba(90,60,25,0.3)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, H);
      context.stroke();
    }
    context.save();
    context.translate(SPINE_W / 2 - 8, 110);
    context.rotate(Math.PI / 2);
    title(context, 0, 20, 18, 52);
    context.restore();
    star(context, SPINE_W / 2, 560, 16);
    context.save();
    context.translate(SPINE_W / 2 + 6, H - 120);
    context.rotate(-Math.PI / 2);
    text(context, messages().rareBooks.voynich.pencil, 0, 0, `600 26px ${HAND}`, 'rgba(70,70,70,0.6)');
    context.restore();
  });

/** Les contre-plats : le vélin nu. */
export const voynichInside = (): THREE.CanvasTexture => plainBoard(VELLUM, VELLUM_EDGE);
