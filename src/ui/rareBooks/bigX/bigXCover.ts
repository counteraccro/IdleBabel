import '@fontsource/playfair-display/900.css';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { GARA, rng, text, type Context } from '../sand/sandDraw';
import type * as THREE from 'three';

/**
 * La couverture du grand livre du X (maquette .ai/maquette-grand-livre-x.html, piste A « Le spécimen ») : un
 * beau livre d'aujourd'hui, comme un spécimen de typographie. Papier crème, un X noir immense, le titre en
 * petites capitales, « Histoire d'une lettre » en rouge. On dessine dans les mesures de la maquette (plats
 * 640 × 800, dos 130 × 800), mises à l'échelle des textures.
 */

const [W, H, SPINE_W] = [640, 800, 130];
/** Mise à l'échelle de la maquette vers les textures. */
const K = WIDTH / W;
/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
export const THICKNESS = SPINE_W / H / 1.4;

export const PLAY = "'Playfair Display', Georgia, serif";
export const CREAM: [string, string] = ['#f1e8d4', '#e2d5b9'];
export const INK = '#1c1a17';
export const RED = '#b0302a';
const FADED_INK = 'rgba(28,26,23,0.65)';

export const loadBigXFonts = (): Promise<unknown> =>
  Promise.all([`900 100px ${PLAY}`, `600 30px ${GARA}`, `italic 500 34px ${GARA}`].map((font) => document.fonts.load(font)));

/** Papier : un ton, du grain, quelques fibres. */
const paper = (context: Context, w: number, h: number, seed: number): void => {
  const g = context.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, CREAM[0]);
  g.addColorStop(1, CREAM[1]);
  context.fillStyle = g;
  context.fillRect(0, 0, w, h);
  const random = rng(seed);
  for (let i = 0; i < (w * h) / 60; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(90,60,20,0.05)';
    context.fillRect(random() * w, random() * h, 1 + random() * 2, 1);
  }
  context.strokeStyle = 'rgba(120,90,40,0.06)';
  context.lineWidth = 0.8;
  for (let i = 0; i < (w * h) / 6000; i++) {
    const [x, y] = [random() * w, random() * h];
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + (random() - 0.5) * 20, y + (random() - 0.5) * 20, x + (random() - 0.5) * 30, y + (random() - 0.5) * 30);
    context.stroke();
  }
};

/** Les bords un peu brunis, à peine. */
const vignette = (context: Context): void => {
  const v = context.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
  v.addColorStop(0, 'rgba(90,60,20,0)');
  v.addColorStop(1, 'rgba(90,60,20,0.18)');
  context.fillStyle = v;
  context.fillRect(0, 0, W, H);
};

/** Un X d'encre, l'encre un peu mangée par le papier sur `bounds` (x, y, largeur, hauteur). */
const bigX = (context: Context, x: number, y: number, size: number, bounds: [number, number, number, number], specks: number): void => {
  text(context, 'X', x, y, `900 ${size}px ${PLAY}`, INK);
  const random = rng(32);
  context.fillStyle = 'rgba(241,232,212,0.35)';
  for (let i = 0; i < specks; i++)
    context.fillRect(bounds[0] + random() * bounds[2], bounds[1] + random() * bounds[3], 1 + random() * 2, 1);
};

const plate = (seed: number, draw: (context: Context) => void): THREE.CanvasTexture =>
  board(CREAM[0], CREAM[1], (context) => {
    context.scale(K, K);
    paper(context, W, H, seed);
    draw(context);
    vignette(context);
  });

export const bigXFront = (): THREE.CanvasTexture =>
  plate(31, (context) => {
    const texts = messages().rareBooks.bigX;
    text(context, texts.coverTitle, W / 2, 96, `600 30px ${GARA}`, INK, 'center', 9);
    context.fillStyle = INK;
    context.fillRect(W / 2 - 40, 120, 80, 1.5);
    bigX(context, W / 2, 640, 600, [80, 180, W - 160, 460], 900);
    text(context, texts.subtitle, W / 2, 706, `italic 500 34px ${GARA}`, RED, 'center', 1);
    text(context, texts.mark, W / 2, 756, `600 15px ${GARA}`, FADED_INK, 'center', 5);
  });

/** Le plat arrière (absent de la maquette) : un petit X, un filet rouge, et deux mots de la préface. */
export const bigXBack = (): THREE.CanvasTexture =>
  plate(35, (context) => {
    bigX(context, W / 2, 420, 160, [W / 2 - 60, 310, 120, 110], 60);
    context.fillStyle = RED;
    context.fillRect(W / 2 - 28, 462, 56, 2);
    text(context, messages().rareBooks.bigX.back, W / 2, 520, `italic 500 30px ${GARA}`, INK, 'center', 1);
  });

/**
 * Le dos : le titre de haut en bas, le X, un filet rouge, « BABEL ». Le titre est centré dans la largeur du
 * dos (la maquette posait sa ligne de base 10 px à droite du milieu : les lettres débordaient à droite).
 */
export const bigXSpine = (): THREE.CanvasTexture =>
  board(CREAM[0], CREAM[1], (context) => {
    context.scale(WIDTH / SPINE_W, HEIGHT / H);
    const texts = messages().rareBooks.bigX;
    paper(context, SPINE_W, H, 33);
    const font = `600 26px ${GARA}`;
    context.font = font;
    const ascent = context.measureText(texts.coverTitle).actualBoundingBoxAscent;
    context.save();
    // Lettres couchées : leur hauteur s'étend vers la droite de la ligne de base.
    context.translate(SPINE_W / 2 - ascent / 2, 60);
    context.rotate(Math.PI / 2);
    text(context, texts.coverTitle, 0, 0, font, INK, 'left', 6);
    context.restore();
    text(context, 'X', SPINE_W / 2, H - 110, `900 96px ${PLAY}`, INK);
    context.fillStyle = RED;
    context.fillRect(SPINE_W / 2 - 18, H - 80, 36, 2);
    text(context, texts.spineMark, SPINE_W / 2, H - 40, `600 14px ${GARA}`, FADED_INK, 'center', 3);
    const rub = context.createLinearGradient(0, 0, SPINE_W, 0);
    rub.addColorStop(0, 'rgba(90,60,20,0.18)');
    rub.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    rub.addColorStop(1, 'rgba(90,60,20,0.18)');
    context.fillStyle = rub;
    context.fillRect(0, 0, SPINE_W, H);
  });

/** Les contre-plats : le papier crème, uni. */
export const bigXInside = (): THREE.CanvasTexture => plainBoard(CREAM[0], CREAM[1]);
