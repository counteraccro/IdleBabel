import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { GARA, NIGHT, fleuron, gold, leather, text, vignette, type Context } from './catalogueDraw';
import type * as THREE from 'three';

/**
 * La couverture du Catalogue des catalogues (maquette .ai/maquette-catalogue.html, piste C « La mise en
 * abyme ») : cuir bleu nuit, titre doré, et au milieu, dans un cadre, le livre lui-même, qui se contient,
 * qui se contient… jusqu'à n'être plus qu'un point d'or. On dessine dans les mesures de la maquette (plats
 * 640 × 800, dos 130 × 800), mises à l'échelle des textures.
 */

const [W, H, SPINE_W] = [640, 800, 130];
/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
export const THICKNESS = SPINE_W / H / 1.4;
/** Le cuir, pour les bords des plats et l'intérieur. */
export const LEATHER = '#172031';
/** Le cadre où le livre se redessine : 4/5, comme le plat. */
const FRAME = { x: 160, y: 236, w: 320, h: 400 };
/** Sept fois le livre dans le livre ; au-delà, un point d'or. */
const DEPTH = 7;

const titleLines = (): string[] => messages().rareBooks.catalogue.coverTitle;

/** Les deux filets dorés du bord. */
const border = (context: Context): void => {
  context.strokeStyle = gold(context, 0, H);
  context.lineWidth = 3;
  context.strokeRect(30, 30, W - 60, H - 60);
  context.lineWidth = 1;
  context.strokeRect(40, 40, W - 80, H - 80);
};

/** Le fleuron du bas : un losange entre deux filets. */
const bottomFleuron = (context: Context, y: number): void => {
  fleuron(context, W / 2, y, gold(context, y - 10, y + 10), 10);
  context.fillRect(W / 2 - 70, y - 0.75, 52, 1.5);
  context.fillRect(W / 2 + 18, y - 0.75, 52, 1.5);
};

/** Le plat, et dans son cadre le plat encore, `depth` fois. */
const front = (context: Context, depth = 0): void => {
  const [top, bottom] = titleLines();
  leather(context, 0, 0, W, H, 41, NIGHT);
  vignette(context, W, H, 0.45);
  border(context);
  text(context, top, W / 2, 128, `600 46px ${GARA}`, gold(context, 92, 132), 'center', 6);
  text(context, bottom, W / 2, 180, `italic 500 36px ${GARA}`, gold(context, 150, 184), 'center', 1);
  context.fillStyle = 'rgba(0,0,0,0.45)';
  context.fillRect(FRAME.x - 4, FRAME.y + 6, FRAME.w + 12, FRAME.h + 8);
  if (depth < DEPTH) {
    context.save();
    context.beginPath();
    context.rect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    context.clip();
    context.translate(FRAME.x, FRAME.y);
    context.scale(FRAME.w / W, FRAME.h / H);
    front(context, depth + 1);
    context.restore();
  } else {
    context.fillStyle = gold(context, FRAME.y, FRAME.y + FRAME.h);
    context.fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
  }
  context.strokeStyle = gold(context, FRAME.y, FRAME.y + FRAME.h);
  context.lineWidth = 4;
  context.strokeRect(FRAME.x - 8, FRAME.y - 8, FRAME.w + 16, FRAME.h + 16);
  context.lineWidth = 1;
  context.strokeRect(FRAME.x - 14, FRAME.y - 14, FRAME.w + 28, FRAME.h + 28);
  bottomFleuron(context, 700);
};

const plate = (draw: (context: Context) => void): THREE.CanvasTexture =>
  board(LEATHER, NIGHT[1], (context) => {
    context.scale(WIDTH / W, HEIGHT / H);
    draw(context);
  });

export const catalogueFront = (): THREE.CanvasTexture => plate((context) => front(context));

/** Le plat arrière (absent de la maquette) : le même cuir, les filets dorés, le fleuron au milieu. */
export const catalogueBack = (): THREE.CanvasTexture =>
  plate((context) => {
    leather(context, 0, 0, W, H, 43, NIGHT);
    vignette(context, W, H, 0.45);
    border(context);
    bottomFleuron(context, H / 2);
  });

/** Le dos : le titre doré de haut en bas, et en bas le dos lui-même, en tout petit, et encore plus petit. */
export const catalogueSpine = (): THREE.CanvasTexture =>
  board(LEATHER, NIGHT[1], (context) => {
    context.scale(WIDTH / SPINE_W, HEIGHT / H);
    const [top, bottom] = titleLines();
    leather(context, 0, 0, SPINE_W, H, 42, NIGHT);
    for (const y of [44, 52, H - 52, H - 44]) {
      context.fillStyle = gold(context, y, y + 2);
      context.fillRect(12, y, SPINE_W - 24, 2);
    }
    context.save();
    context.translate(SPINE_W / 2 - 12, H / 2 - 40);
    context.rotate(Math.PI / 2);
    text(context, top, 0, 0, `600 28px ${GARA}`, gold(context, -22, 4), 'center', 4);
    text(context, bottom, 0, 32, `italic 500 24px ${GARA}`, gold(context, 12, 36), 'center', 1);
    context.restore();
    let [w, h] = [36, 72];
    const [x, y] = [SPINE_W / 2, H - 150];
    for (let i = 0; i < 4; i++) {
      context.strokeStyle = gold(context, y - h / 2, y + h / 2);
      context.lineWidth = 1.2;
      context.strokeRect(x - w / 2, y - h / 2, w, h);
      [w, h] = [w * 0.55, h * 0.55];
    }
    const rub = context.createLinearGradient(0, 0, SPINE_W, 0);
    rub.addColorStop(0, 'rgba(0,0,0,0.4)');
    rub.addColorStop(0.5, 'rgba(160,190,230,0.06)');
    rub.addColorStop(1, 'rgba(0,0,0,0.4)');
    context.fillStyle = rub;
    context.fillRect(0, 0, SPINE_W, H);
  });

/** Les contre-plats : le cuir nu. */
export const catalogueInside = (): THREE.CanvasTexture => plainBoard(LEATHER, NIGHT[1]);
