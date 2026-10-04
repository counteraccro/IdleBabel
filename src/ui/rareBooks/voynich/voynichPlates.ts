import { FELL, GREEN, OCHRE, BLUE, ROSE, WATER, leafPath, outline, painted, ringOfWords, star, text, type Path } from './voynichDraw';
import { herb, type Leaves, type Root } from './voynichHerb';
import { INK, rng, voynichLines, voynichWord, word, wordWidth } from './voynichScript';
import { SIGNS } from './voynichZodiac';

/**
 * Les planches des pages du Manuscrit de Voynich (maquette .ai/maquette-voynich-pages.html) : les cercles
 * d'étoiles, les bassins, la pharmacie. Chacune reçoit le numéro de sa page (son hasard fixe).
 */

type Context = CanvasRenderingContext2D;
const W = 640;

/** Les cercles d'étoiles : un signe au centre, quinze étoiles et leurs mots, un anneau de texte, le mois en haut. */
export const starsPage = (context: Context, page: number, sign: number): void => {
  const [cx, cy, R] = [W / 2 + 10, 410, 240];
  const random = rng(page + 1);
  text(context, SIGNS[sign].month, cx, 112, `italic 30px ${FELL}`, 'rgba(50,35,25,0.6)');
  outline(
    context,
    (c) => {
      c.beginPath();
      for (const ring of [0.36, 0.58, 0.88, 1]) {
        c.moveTo(cx + R * ring, cy);
        c.arc(cx, cy, R * ring, 0, Math.PI * 2);
      }
    },
    1.8,
  );
  painted(
    context,
    (c) => {
      c.beginPath();
      c.arc(cx, cy, R * 0.36, 0, Math.PI * 2);
    },
    'rgba(80,120,160,0.28)',
    1.8,
  );
  SIGNS[sign].draw(context, cx, cy);
  for (let i = 0; i < 15; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 15;
    star(context, cx + Math.cos(a) * R * 0.47, cy + Math.sin(a) * R * 0.47, 13);
    const [label, u] = [word(random), 7.5];
    const width = wordWidth(label, u);
    context.save();
    context.translate(cx + Math.cos(a) * R * 0.73, cy + Math.sin(a) * R * 0.73);
    context.rotate(a + Math.PI / 2);
    voynichWord(context, label, -width / 2, u * 0.5, u, random);
    context.restore();
  }
  ringOfWords(context, cx, cy, R * 0.94, 9, random, Math.PI * 2 - 0.15);
  voynichLines(context, 90, 560, 712, 738, 10, 26, page + 2);
};

/** Un tuyau : le trait de chaque bord, l'eau dedans. */
const tube = (context: Context, path: Path, paper: string): void => {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const [color, width] of [
    [INK, 26],
    [paper, 21],
    [WATER, 21],
  ] as const) {
    path(context);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  }
  context.restore();
};

/** Un bassin : le bord de l'eau qui ondule, des vaguelettes. */
const basin = (context: Context, x0: number, y0: number, x1: number, y1: number, seed: number): void => {
  const random = rng(seed);
  painted(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(x0, y0);
      for (let x = x0; x <= x1; x += 20) c.quadraticCurveTo(x + 10, y0 + (random() < 0.5 ? -6 : 6), x + 20, y0);
      c.lineTo(x1, y1 - 30);
      c.quadraticCurveTo(x1, y1, x1 - 40, y1);
      c.lineTo(x0 + 40, y1);
      c.quadraticCurveTo(x0, y1, x0, y1 - 30);
      c.closePath();
    },
    WATER,
    2.4,
  );
  outline(
    context,
    (c) => {
      c.beginPath();
      for (let i = 0; i < 26; i++) {
        const [x, y] = [x0 + 20 + random() * (x1 - x0 - 40), y0 + 16 + random() * (y1 - y0 - 30)];
        c.moveTo(x, y);
        c.quadraticCurveTo(x + 6, y - 5, x + 12, y);
        c.quadraticCurveTo(x + 18, y + 5, x + 24, y);
      }
    },
    1,
  );
};

/**
 * Les bassins : deux bassins reliés par des tuyaux, le texte entre eux. Le tuyau du haut vient de la
 * reliure : sur une page de gauche, tout est retourné, et il passe à la page d'en face.
 */
export const poolsPage = (context: Context, page: number, right: boolean, paper: string): void => {
  const x = (value: number): number => (right ? value : W - value);
  voynichLines(context, 80, 560, 104, 156, 10, 26, page * 10 + 1);
  tube(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(x(-20), 210);
      c.bezierCurveTo(x(120), 190, x(60), 300, x(120), 330);
    },
    paper,
  );
  basin(context, Math.min(x(110), x(560)), 300, Math.max(x(110), x(560)), 400, page * 10 + 2);
  tube(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(x(520), 400);
      c.bezierCurveTo(x(560), 470, x(480), 520, x(540), 600);
    },
    paper,
  );
  tube(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(x(150), 400);
      c.bezierCurveTo(x(110), 470, x(190), 520, x(130), 600);
    },
    paper,
  );
  basin(context, Math.min(x(90), x(580)), 600, Math.max(x(90), x(580)), 680, page * 10 + 3);
  voynichLines(context, 180, 470, 448, 560, 10, 26, page * 10 + 4);
  voynichLines(context, 80, 560, 722, 748, 10, 26, page * 10 + 5);
};

/** Un pot d'apothicaire : panse, col, deux bandes peintes, couvercle. */
const jar = (context: Context, x: number, y: number, h: number, seed: number): void => {
  const random = rng(seed);
  const w = h * 0.42;
  painted(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(x - w * 0.5, y);
      c.lineTo(x - w * 0.6, y - h * 0.08);
      c.bezierCurveTo(x - w * 0.75, y - h * 0.4, x - w * 0.55, y - h * 0.7, x - w * 0.3, y - h * 0.78);
      c.lineTo(x - w * 0.3, y - h * 0.88);
      c.lineTo(x + w * 0.3, y - h * 0.88);
      c.lineTo(x + w * 0.3, y - h * 0.78);
      c.bezierCurveTo(x + w * 0.55, y - h * 0.7, x + w * 0.75, y - h * 0.4, x + w * 0.6, y - h * 0.08);
      c.lineTo(x + w * 0.5, y);
      c.closePath();
    },
    [OCHRE, BLUE, ROSE, GREEN][Math.floor(random() * 4)],
    2,
  );
  for (const band of [0.2, 0.55])
    painted(
      context,
      (c) => {
        c.beginPath();
        c.rect(x - w * 0.62, y - h * (band + 0.06), w * 1.24, h * 0.06);
      },
      [BLUE, ROSE, 'rgba(200,160,70,0.55)'][Math.floor(random() * 3)],
      1.4,
    );
  painted(
    context,
    (c) => {
      c.beginPath();
      c.ellipse(x, y - h * 0.9, w * 0.4, h * 0.05, 0, 0, Math.PI * 2);
      c.moveTo(x + 6, y - h * 0.95);
      c.arc(x, y - h * 0.97, 6, 0, Math.PI * 2);
    },
    OCHRE,
    1.6,
  );
};

const JAR_LEAVES: readonly Leaves[] = ['lance', 'round', 'lobed'];
const JAR_ROOTS: readonly Root[] = ['tuber', 'roots', 'bulb'];

/** La pharmacie : trois pots dans la marge, à côté de chacun deux morceaux de plante étiquetés, le texte à droite. */
export const jarsPage = (context: Context, page: number): void => {
  for (let i = 0; i < 3; i++) {
    const [y, random] = [130 + i * 215, rng(page + i)];
    const kind = (i + page + 2) % 3;
    jar(context, 120, y + 180, 170, page + 10 + i);
    voynichWord(context, word(random), 84, y + 2, 9, random);
    herb(context, 270, y + 70, 0.32, page + 20 + i, { leaves: JAR_LEAVES[kind], flower: 'none', root: JAR_ROOTS[kind] });
    painted(context, leafPath(330, y + 150, 70, -0.5 - i * 0.3, 18), GREEN, 1.6);
    voynichWord(context, word(random), 230, y + 2, 8, random);
    voynichWord(context, word(random), 320, y + 82, 8, random);
    voynichLines(context, 410, 570, y + 40, y + 170, 9, 24, page + 30 + i);
  }
};
